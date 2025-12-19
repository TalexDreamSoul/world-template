import { runCJSModule } from "@codehz/min-cjs-runner";
import type { ScriptEntrypoint } from "@miehoukingdom/world-interface";
import { newMessagePortRpcSession } from "capnweb";
import { ApiWrapper } from "./wrapper.ts";

import * as ecsNS from "@codehz/ecs";
import * as pipelineNS from "@codehz/pipeline";
import * as worldInterfaceNS from "@miehoukingdom/world-interface";
import * as worldRuntimeNS from "@miehoukingdom/world-runtime";

function normalizeInterop<T extends object>(
  mod: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pick?: (m: any) => boolean,
): T {
  // Bundlers/ESM interop sometimes produce `{ default: ... }` wrappers.
  // Prefer the object that actually contains the expected named exports.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any = mod;
  if (!m || (typeof m !== "object" && typeof m !== "function")) return mod;

  if (pick?.(m)) return m as T;

  // If it has any meaningful keys besides "default", keep it.
  const keys = Object.keys(m).filter((k) => k !== "default");
  if (keys.length > 0) return m as T;

  const d = m.default;
  if (d && (typeof d === "object" || typeof d === "function")) {
    if (pick?.(d)) return d as T;
    return d as T;
  }

  return m as T;
}

function asCjsModule<T extends object>(mod: T): T {
  // `runCJSModule` expects a CommonJS-ish export object. In bundlers, `import * as ns`
  // may become `{ default: ... }` wrappers; merge both levels into a plain object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any = mod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = Object.create(null);
  if (m && (typeof m === "object" || typeof m === "function")) {
    Object.assign(out, m);
    const d = m.default;
    if (d && (typeof d === "object" || typeof d === "function")) {
      Object.assign(out, d);
    }
  }
  return out as T;
}

const ecs = asCjsModule(normalizeInterop(ecsNS, (m) => "component" in m));
const pipeline = asCjsModule(
  normalizeInterop(pipelineNS, (m) => "createPipeline" in m),
);

const worldInterfaceRaw = normalizeInterop(
  worldInterfaceNS,
  (m) => "defineScriptEntrypoint" in m,
);
const worldInterface = asCjsModule(worldInterfaceRaw) as typeof worldInterfaceRaw & {
  defineScriptEntrypoint: unknown;
};
worldInterface.defineScriptEntrypoint =
  typeof (worldInterface as any).defineScriptEntrypoint === "function"
    ? (worldInterface as any).defineScriptEntrypoint
    : typeof (worldInterfaceRaw as any)?.default?.defineScriptEntrypoint === "function"
      ? (worldInterfaceRaw as any).default.defineScriptEntrypoint
      : (name: string, description: string, ...plugins: unknown[]) =>
          (create: unknown) => ({
            name,
            description,
            plugins,
            create,
          });

const worldRuntime = asCjsModule(normalizeInterop(worldRuntimeNS, (m) => "GridMap" in m));

self.addEventListener("message", (ev) => {
  const port = ev.ports[0];
  if (!port) return;
  const exports = runCJSModule(ev.data, {
    "@codehz/ecs": ecs,
    "@codehz/pipeline": pipeline,
    "@miehoukingdom/world-interface": worldInterface,
    "@miehoukingdom/world-runtime": worldRuntime,
  }) as { default: ScriptEntrypoint };
  const entrypoint = exports.default;
  newMessagePortRpcSession(port, {
    name: entrypoint.name,
    description: entrypoint.description,
    create: ApiWrapper.wrapCreate(entrypoint.create),
  });
});
