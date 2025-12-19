import { createProgram, createTexture } from "twgl.js";
import { animloop } from "./animloop.ts";
import { createPromiseCache } from "./promise.ts";
import { splitNPOTtoPOT } from "./splitNPOTtoPOT.ts";
import { useCallbackRef } from "./useCallbackRef.ts";
import { useEventHandler } from "./useEventHandler.ts";
import type { ViewportParamEx } from "./useVirtualViewport.ts";
import { wrapAbort } from "./wrapAbort.ts";

export type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export interface XRenderer {
  imageSmoothingEnabled: boolean;
  setViewport?(viewport: ViewportParamEx): void;
  setTransform?(this: this, matrix: DOMMatrix): void;
  drawImage(this: this, image: ImageSource, dx: number, dy: number): void;
  drawImage(
    this: this,
    image: ImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  drawImage(
    this: this,
    image: ImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

const VERTEX = `
#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texcoord;
in vec2 a_quadvert;

uniform vec3 u_transform;
uniform vec2 u_resolution;

out vec2 v_texcoord;
out vec2 v_quadvert;

vec2 screen(vec2 position) {
  vec2 transformed = position * u_transform.z + u_transform.xy;
  vec2 zeroToOne = transformed / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  return clipSpace * vec2(1.0, -1.0);
}

void main() {
  gl_Position = vec4(screen(a_position), 0.0, 1.0);
  v_texcoord = a_texcoord;
  v_quadvert = a_quadvert;
}
`;

const FRAGMENT = `
#version 300 es
precision highp float;

in vec2 v_texcoord;
in vec2 v_quadvert;

uniform vec2 u_texsize;
uniform sampler2D u_texture;

out vec4 outColor;

vec4 texel(in sampler2D sampler, in vec2 samplerSize, in vec2 pix, in vec2 quad) {
  pix = floor(pix) + min(fract(pix) / fwidth(pix), 1.0) - 0.5;
  float fix = 1.0 - length(max(vec2(0.0), fwidth(quad) - quad + 0.5));
  return texture(sampler, pix / samplerSize) * fix;
}

void main() {
  outColor = texel(u_texture, u_texsize, v_texcoord, v_quadvert * u_texsize);
}
`;

const WGSL = `
// Vertex input structure
struct VertexInput {
  @location(0) a_position: vec2<f32>,
  @location(1) a_texcoord: vec2<f32>,
};

// Vertex output structure
struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) v_texcoord: vec2<f32>,
  @location(1) v_quadvert: vec2<f32>,
};

// Uniforms
struct Uniforms {
  transform: vec3<f32>,
  resolution: vec2<f32>,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Texture and sampler
@group(0) @binding(1) var u_texture: texture_2d<f32>;
@group(0) @binding(2) var u_sampler: sampler;

// Vertex shader
@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32, input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let transformed = input.a_position * uniforms.transform.z + uniforms.transform.xy;
  let zeroToOne = transformed / uniforms.resolution;
  let zeroToTwo = zeroToOne * 2.0;
  let clipSpace = zeroToTwo - 1.0;
  let finalPos = clipSpace * vec2<f32>(1.0, -1.0);

  let quadverts: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
    vec2<f32>(0.0, 0.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(1.0, 1.0)
  );

  output.clip_position = vec4<f32>(finalPos, 0.0, 1.0);
  output.v_texcoord = input.a_texcoord;
  output.v_quadvert = quadverts[vertex_index % 4];
  return output;
}

// Fragment shader
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let texSize = vec2<f32>(textureDimensions(u_texture));

  // Texel computation
  let quad = input.v_quadvert * texSize;
  var uv = input.v_texcoord + 0.5;
  let fl = floor(uv);
  var fr = fract(uv);
  let aa = fwidth(uv) * 0.75;
  fr = smoothstep(0.5 - aa, 0.5 + aa, fr);
  uv = fl + fr - 0.5;
  let fix = 1.0 - length(max(vec2<f32>(0.0), fwidth(quad) / 2.0 - quad + 0.5));
  let texColor = textureSample(u_texture, u_sampler, uv / texSize);
  return texColor * fix;
}
`;

function dump(obj: object) {
  const out: Record<string, unknown> = {};
  for (const name in obj) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (obj as any)[name];
    if (
      value != null &&
      (typeof value === "string" || typeof value === "number")
    ) {
      out[name] = value;
    }
  }
  return out;
}

async function initWebGPU(
  log: (text: string, ...args: unknown[]) => void,
  signal: AbortSignal,
) {
  log("Requesting GPU adapter...");
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "low-power",
  });
  signal.throwIfAborted();
  if (!adapter) {
    throw new Error("No GPU adapter found");
  }
  log("GPU Adapter info:", JSON.stringify(dump(adapter.info)));
  log("Requesting GPU device...");
  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("No GPU device found");
  }
  log("GPU Device features", JSON.stringify([...device.features]));
  log("GPU Device limits", JSON.stringify(dump(device.limits)));
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  log("Presentation format", presentationFormat);
  return { device, presentationFormat };
}

const configureWebGPU = wrapAbort(async function configureWebGPU(
  log: (text: string, ...args: unknown[]) => void,
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
) {
  const { device, presentationFormat } = await initWebGPU(log, signal);
  if (signal.aborted) {
    log("WebGPU timeout");
    device.destroy();
    throw new Error("Aborted");
  }
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("WebGPU context could not be created");
  }
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "opaque",
  });
  return { device, presentationFormat, context };
});

type DevToolsColor =
  | "primary"
  | "primary-light"
  | "primary-dark"
  | "secondary"
  | "secondary-light"
  | "secondary-dark"
  | "tertiary"
  | "tertiary-light"
  | "tertiary-dark"
  | "error";

/**
 * Hook for initializing and managing an XRenderer instance on a canvas element.
 * It attempts to use WebGPU for rendering, falling back to WebGL2 if unavailable,
 * and finally to Canvas2D as a last resort. The hook handles canvas resizing,
 * device loss recovery, and provides performance measurement capabilities.
 *
 * @param render - The render function to be called each frame. It receives the renderer context,
 *                 canvas dimensions, and current frame time, and should return the desired framerate.
 * @param options - Configuration options for the renderer.
 * @param options.background - Optional background color for the canvas (e.g., CSS color string).
 * @param options.onDeviceLost - Optional callback invoked when the WebGPU device is lost.
 * @param options.log - Optional logging function for informational messages.
 * @param options.error - Optional error logging function.
 * @param options.measure - Optional performance measurement function for tracking render times.
 * @returns A callback ref function that takes an HTMLCanvasElement and returns a cleanup function
 *          to stop rendering and release resources.
 */
export function useXRenderer(
  render: (
    renderer: XRenderer,
    width: number,
    height: number,
    frame: number,
  ) => number,
  {
    background,
    onDeviceLost,
    log = () => undefined,
    error = () => undefined,
    measure = () => undefined,
  }: {
    background?: string;
    onDeviceLost?: () => void;
    log?: (text: string, ...args: unknown[]) => void;
    error?: (text: string, ...args: unknown[]) => void;
    measure?: <
      T extends {
        color: DevToolsColor;
        start: number;
        tooltipText?: string;
      },
    >(
      track: string,
      name: string,
      { color, start, tooltipText, ...properties }: T,
    ) => void;
  } = {},
) {
  const fixrender = useEventHandler(
    (renderer: XRenderer, width: number, height: number, frame: number) => {
      const time = performance.now();
      try {
        return render(renderer, width, height, frame);
      } finally {
        measure("XRenderer", `init render command`, {
          color: "primary",
          start: time,
        });
      }
    },
  );
  return useCallbackRef((canvas: HTMLCanvasElement): (() => void) => {
    let stop = false;
    let width = 0;
    let height = 0;
    let gpu: GPUDevice | undefined;

    let internalRender: () => number = () => 30;
    const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const first = entries[0];
      if (!first) return;
      const { contentRect } = first;
      log("Canvas resized: ", contentRect.width, contentRect.height);
      width = contentRect.width;
      height = contentRect.height;
      // Use window.devicePixelRatio to avoid relying on an implicit global
      canvas.width = Math.floor(width * window.devicePixelRatio);
      canvas.height = Math.floor(height * window.devicePixelRatio);
      internalRender();
    });
    observer.observe(canvas);

    const cancel = animloop(() => {
      if (width && height)
        try {
          return internalRender();
        } catch (e) {
          error(String(e));
        }
      return 30;
    });
    function webgpu({
      device,
      presentationFormat,
      context,
    }: {
      device: GPUDevice;
      presentationFormat: GPUTextureFormat;
      context: GPUCanvasContext;
    }) {
      log("WebGPU initialized");
      gpu = device;
      device.lost.then(() => {
        log("WebGPU device lost, stop = ", stop);
        if (stop) return;
        device.destroy();
        internalRender = () => 30;
        configureWebGPU(log, canvas, AbortSignal.timeout(5000))
          .then(webgpu)
          .catch(fallback);
      });
      const module = device.createShaderModule({ code: WGSL });
      const sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      const bindGroupLayout = device.createBindGroupLayout({
        label: "XRenderer Bind Group Layout",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "uniform" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { sampleType: "float" },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: { type: "filtering" },
          },
        ],
      });
      const uniformBuffer = device.createBuffer({
        label: "XRenderer Uniform Buffer",
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const mappedTransferBuffers: GPUBuffer[] = [];
      const getMappedTransferBuffer = () => {
        return (
          mappedTransferBuffers.pop() ||
          device.createBuffer({
            label: "transfer buffer",
            size: 4 * 16 * 1024,
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
          })
        );
      };

      const vertexBuffer = device.createBuffer({
        label: "XRenderer Vertex Buffer",
        size: 4 * 16 * 1024,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      const pipeline = device.createRenderPipeline({
        label: "XRenderer Pipeline",
        primitive: { topology: "triangle-strip", cullMode: "none" },
        vertex: {
          module,
          entryPoint: "vs_main",
          buffers: [
            {
              arrayStride: 4 * 4, // 4 floats (position, texcoord)
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x2" }, // a_position
                { shaderLocation: 1, offset: 8, format: "float32x2" }, // a_texcoord
              ],
            },
          ],
        },
        fragment: {
          module,
          entryPoint: "fs_main",
          targets: [
            {
              format: presentationFormat,
              blend: {
                color: {
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha",
                  operation: "add",
                },
                alpha: {
                  srcFactor: "one",
                  dstFactor: "one-minus-src-alpha",
                  operation: "add",
                },
              },
            },
          ],
        },
        layout: device.createPipelineLayout({
          label: "XRenderer Pipeline Layout",
          bindGroupLayouts: [bindGroupLayout],
        }),
      });
      const bindGroupCache = new WeakMap<ImageSource, GPUBindGroup>();

      function getBindGroup(source: ImageSource) {
        const exists = bindGroupCache.get(source);
        if (exists) return exists;
        const texture = device.createTexture({
          label: "XRenderer Texture",
          size: [source.width, source.height, 1],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT |
            GPUTextureUsage.COPY_DST,
        });

        device.queue.copyExternalImageToTexture(
          { source },
          { texture, premultipliedAlpha: true },
          [source.width, source.height],
        );
        const bindGroup = device.createBindGroup({
          label: "XRenderer Bind Group",
          layout: bindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: texture.createView() },
            { binding: 2, resource: sampler },
          ],
        });
        bindGroupCache.set(source, bindGroup);
        return bindGroup;
      }

      type XRendererForGPU = XRenderer & {
        viewport: ViewportParamEx;
        transfer: Float32Array;
        images: GPUBindGroup[];
      };

      function setViewport(
        this: XRendererForGPU,
        viewport: ViewportParamEx,
      ): void {
        this.viewport = viewport;
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          new Float32Array([
            viewport.x,
            viewport.y,
            viewport.scale,
            0,
            width,
            height,
          ]),
        );
      }

      function draw(
        this: XRendererForGPU,
        image: ImageSource,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number,
      ) {
        if (
          dx + dw < this.viewport.minX ||
          dy + dh < this.viewport.minY ||
          dx > this.viewport.maxX ||
          dy > this.viewport.maxY
        ) {
          return;
        }
        // prettier-ignore
        this.transfer.set([
          dx,      dy,      sx,      sy,
          dx + dw, dy,      sx + sw, sy,
          dx,      dy + dh, sx,      sy + sh,
          dx + dw, dy + dh, sx + sw, sy + sh,
        ], 16 * this.images.length);
        this.images.push(getBindGroup(image));
      }

      const drawImage = createDrawImage(
        createForceSplitDrawImage(device.limits.maxTextureDimension2D, draw),
      );

      internalRender = () => {
        const time = performance.now();
        const encoder = device.createCommandEncoder({
          label: "XRenderer Command Encoder",
        });
        const [r, g, b, a] = convertColor(background);
        const transfer = getMappedTransferBuffer();
        const ctx: XRendererForGPU = {
          viewport: {
            minX: 0,
            maxX: Infinity,
            minY: 0,
            maxY: Infinity,
            x: 0,
            y: 0,
            scale: 1,
          },
          images: [],
          transfer: new Float32Array(transfer.getMappedRange()),
          imageSmoothingEnabled: false,
          setViewport,
          drawImage,
        };
        const framerate = fixrender(ctx, width, height, performance.now());
        transfer.unmap();
        encoder.copyBufferToBuffer(
          transfer,
          0,
          vertexBuffer,
          0,
          4 * 16 * ctx.images.length,
        );
        const pass = encoder.beginRenderPass({
          label: "XRenderer Render Pass",
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r, g, b, a },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, vertexBuffer);
        for (let i = 0; i < ctx.images.length; i++) {
          pass.setBindGroup(0, ctx.images[i]);
          pass.draw(4, 1, 4 * i, 0);
        }
        pass.end();
        device.queue.submit([encoder.finish()]);
        transfer.mapAsync(GPUMapMode.WRITE).then(
          () => {
            mappedTransferBuffers.push(transfer);
          },
          (e) => {
            if (stop) return;
            error("XRenderer: Failed to map transfer buffer", e);
          },
        );
        measure("XRenderer", `WebGPU render`, {
          color: "primary",
          start: time,
        });
        return framerate;
      };
    }

    function fallback() {
      const gl =
        "createImageBitmap" in window
          ? canvas.getContext("webgl2", {
              alpha: false,
              antialias: false,
              depth: false,
              stencil: false,
              preserveDrawingBuffer: false,
              premultipliedAlpha: false,
            })!
          : (undefined as never);
      if (gl) {
        log("WebGL fallback");
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.colorMask(true, true, true, false);
        const program = createProgram(gl, [VERTEX, FRAGMENT]);
        const positionbuffer = gl.createBuffer();
        const texcoordbuffer = gl.createBuffer();
        const quadvertbuffer = gl.createBuffer();
        const a_position = gl.getAttribLocation(program, "a_position");
        const a_texcoord = gl.getAttribLocation(program, "a_texcoord");
        const a_quadvert = gl.getAttribLocation(program, "a_quadvert");
        const u_transform = gl.getUniformLocation(program, "u_transform");
        const u_resolution = gl.getUniformLocation(program, "u_resolution");
        const u_texsize = gl.getUniformLocation(program, "u_texsize");
        const u_texture = gl.getUniformLocation(program, "u_texture");
        const textureCache = new WeakMap<ImageSource, WebGLTexture>();

        function getTexture(src: ImageSource) {
          const exists = textureCache.get(src);
          if (exists) return exists;
          const texture = createTexture(gl, {
            src,
            wrap: gl.CLAMP_TO_EDGE,
            min: gl.LINEAR_MIPMAP_LINEAR,
            mag: gl.LINEAR,
            auto: true,
            premultiplyAlpha: 1,
          });
          textureCache.set(src, texture);
          return texture;
        }

        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, 32, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(a_position);
        gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, 32, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(a_texcoord);
        gl.vertexAttribPointer(a_texcoord, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadvertbuffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Uint8Array([0, 0, 1, 0, 0, 1, 1, 1]),
          gl.STATIC_DRAW,
        );
        gl.enableVertexAttribArray(a_quadvert);
        gl.vertexAttribPointer(a_quadvert, 2, gl.UNSIGNED_BYTE, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(u_texture, 0);

        function draw(
          image: ImageSource,
          sx: number,
          sy: number,
          sw: number,
          sh: number,
          dx: number,
          dy: number,
          dw: number,
          dh: number,
        ) {
          gl.bindBuffer(gl.ARRAY_BUFFER, positionbuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            0,
            new Float32Array([
              dx,
              dy,
              dx + dw,
              dy,
              dx,
              dy + dh,
              dx + dw,
              dy + dh,
            ]),
          );
          gl.bindBuffer(gl.ARRAY_BUFFER, texcoordbuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            0,
            new Float32Array([
              sx,
              sy,
              sx + sw,
              sy,
              sx,
              sy + sh,
              sx + sw,
              sy + sh,
            ]),
          );
          gl.uniform2fv(u_texsize, [image.width, image.height]);
          gl.bindTexture(gl.TEXTURE_2D, getTexture(image));
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        const drawImage = createDrawImage(
          createForceSplitDrawImage(gl.getParameter(gl.MAX_TEXTURE_SIZE), draw),
        );

        internalRender = () => {
          if (gl.isContextLost()) {
            onDeviceLost?.();
            internalRender = () => 30;
            return 30;
          }
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(...convertColor(background));
          gl.clear(gl.COLOR_BUFFER_BIT);

          const ctx: XRenderer = {
            imageSmoothingEnabled: false,
            drawImage,
            setViewport(viewport) {
              gl.uniform3fv(u_transform, [
                viewport.x,
                viewport.y,
                viewport.scale,
              ]);
              gl.uniform2fv(u_resolution, [width, height]);
            },
          };
          return fixrender(ctx, width, height, performance.now());
        };
      } else {
        log("Canvas2D fallback");
        const ctx = canvas.getContext("2d", {
          alpha: false,
          willReadFrequently: false,
        })!;

        internalRender = () => {
          ctx.resetTransform();
          ctx.fillStyle = background ?? "black";
          ctx.fillRect(
            0,
            0,
            width * devicePixelRatio,
            height * devicePixelRatio,
          );

          return fixrender(ctx, width, height, performance.now());
        };
      }
    }

    configureWebGPU(log, canvas, AbortSignal.timeout(5000))
      .then(webgpu)
      .catch(fallback);

    return () => {
      cancel();
      stop = true;
      gpu?.destroy();
      observer.disconnect();
    };
  });
}

function convertColor(
  hex: string | undefined,
): [number, number, number, number] {
  if (!hex) return [0, 0, 0, 0];
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, 0];
  return [
    parseInt(result[1]!, 16) / 255,
    parseInt(result[2]!, 16) / 255,
    parseInt(result[3]!, 16) / 255,
    1,
  ];
}

function createForceSplitDrawImage<T extends XRenderer>(
  maxSize: number,
  draw: (
    this: T,
    image: ImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => void,
) {
  const DrawCache = new WeakMap<
    ImageSource,
    Map<
      string,
      ((this: T, dx: number, dy: number, dw: number, dh: number) => void)[]
    >
  >();

  function drawCache(
    this: T,
    image: ImageSource,
    [sx, sy, sw, sh, dx, dy, dw, dh]: [
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ],
    fn: () => Generator<
      (this: T, dx: number, dy: number, dw: number, dh: number) => void
    >,
  ) {
    const key = `${sx},${sy},${sw},${sh}`;
    let icache = DrawCache.get(image);
    if (icache == null) {
      DrawCache.set(image, (icache = new Map()));
    }
    let ops = icache.get(key);
    if (ops == null) {
      icache.set(key, (ops = Array.from(fn())));
    }
    for (const op of ops) {
      op.call(this, dx, dy, dw, dh);
    }
  }

  const splitImage = createPromiseCache(async function splitImage(
    src: ImageSource,
  ): Promise<{ x: number; y: number; bitmap: ImageBitmap }[]> {
    const result: { x: number; y: number; bitmap: ImageBitmap }[] = [];
    for (const tile of splitNPOTtoPOT({
      width: src.width,
      height: src.height,
      maxSize,
      minSize: 64,
      overlap: 8,
    })) {
      const bitmap = await createImageBitmap(
        src,
        tile.x,
        tile.y,
        tile.textureWidth,
        tile.textureHeight,
        { premultiplyAlpha: "none" },
      );
      result.push({ x: tile.x, y: tile.y, bitmap });
    }
    return result;
  }).async;

  return function (
    this: T,
    image: ImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) {
    if (image.width >= maxSize / 4 || image.height >= maxSize / 4) {
      const tiles = splitImage(image);
      if (!tiles) return;
      drawCache.call(
        this,
        image,
        [sx, sy, sw, sh, dx, dy, dw, dh],
        function* (this: T) {
          for (const tile of tiles) {
            const tileWidth = tile.bitmap.width;
            const tileHeight = tile.bitmap.height;

            // 瓦片的区域边界
            const tileLeft = tile.x;
            const tileRight = tile.x + tileWidth;
            const tileTop = tile.y;
            const tileBottom = tile.y + tileHeight;

            // 源区域的边界
            const srcLeft = sx;
            const srcRight = sx + sw;
            const srcTop = sy;
            const srcBottom = sy + sh;

            // 检查瓦片是否与源区域重叠
            if (
              tileLeft >= srcRight || // 瓦片在源区域右边
              tileRight <= srcLeft || // 瓦片在源区域左边
              tileTop >= srcBottom || // 瓦片在源区域下边
              tileBottom <= srcTop // 瓦片在源区域上边
            ) {
              continue; // 无重叠，跳过此瓦片
            }

            // 计算瓦片中与源区域重叠的部分（相对于瓦片的坐标系）
            const clipX = Math.max(srcLeft, tileLeft) - tileLeft;
            const clipY = Math.max(srcTop, tileTop) - tileTop;
            const clipX2 = Math.min(srcRight, tileRight) - tileLeft;
            const clipY2 = Math.min(srcBottom, tileBottom) - tileTop;
            const clipWidth = clipX2 - clipX;
            const clipHeight = clipY2 - clipY;

            // 计算瓦片中重叠区域在原图中的相对偏移
            const offsetX = tile.x + clipX - sx;
            const offsetY = tile.y + clipY - sy;

            yield function (
              this: T,
              dx: number,
              dy: number,
              dw: number,
              dh: number,
            ) {
              const scaleX = dw / sw;
              const scaleY = dh / sh;

              // 计算在 canvas 上的目标位置和尺寸
              const destX = dx + offsetX * scaleX;
              const destY = dy + offsetY * scaleY;
              const destWidth = clipWidth * scaleX;
              const destHeight = clipHeight * scaleY;
              draw.call(
                this,
                tile.bitmap,
                clipX,
                clipY,
                clipWidth,
                clipHeight,
                destX,
                destY,
                destWidth,
                destHeight,
              );
            };
          }
        },
      );
    } else {
      draw.call(this, image, sx, sy, sw, sh, dx, dy, dw, dh);
    }
  };
}

function createDrawImage<T extends XRenderer>(
  draw: (
    this: T,
    image: ImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => void,
) {
  return function (
    this: T,
    image: ImageSource,
    sx: number,
    sy: number,
    sw?: number,
    sh?: number,
    dx?: number,
    dy?: number,
    dw?: number,
    dh?: number,
  ) {
    if (sw == null) {
      dx = sx;
      dy = sy;
      sx = 0;
      sy = 0;
      sw = image.width;
      sh = image.height;
      dw = image.width;
      dh = image.height;
    } else if (dx == null) {
      dx = sx;
      dy = dy;
      dw = sw;
      dh = sh;
      sx = 0;
      sy = 0;
      sw = image.width;
      sh = image.height;
    }

    draw.call(this, image, sx!, sy!, sw!, sh!, dx!, dy!, dw!, dh!);
  };
}
