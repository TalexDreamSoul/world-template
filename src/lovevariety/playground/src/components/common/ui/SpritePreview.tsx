import { useEffect, useRef } from "react";
import { createBlobUrl } from "../../../utils/blob.ts";

export function SpritePreview({
  buffer,
  mime = "image/png",
  frameW,
  frameH,
  className,
  alt = "sprite-preview",
}: {
  buffer: ArrayBuffer | null | undefined;
  mime?: string | null;
  frameW?: number | null;
  frameH?: number | null;
  className?: string;
  alt?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!buffer) {
      // Optionally draw a placeholder background for empty sprite
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let cancelled = false;
    const url = createBlobUrl(buffer, mime ?? "image/png");
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;

      const dpr = window.devicePixelRatio || 1;

      // determine source crop (top-left frame)
      const sx = 0;
      const sy = 0;
      const sWidth = frameW && frameW > 0 ? frameW : img.naturalWidth;
      const sHeight = frameH && frameH > 0 ? frameH : img.naturalHeight;

      // determine destination size (CSS pixels). If canvas has no CSS size set,
      // fall back to source size so we get a meaningful default.
      const rect = canvas.getBoundingClientRect();
      const destCssW = rect.width || sWidth;
      const destCssH = rect.height || sHeight;

      // Set actual canvas bitmap size in device pixels.
      canvas.width = Math.max(1, Math.round(destCssW * dpr));
      canvas.height = Math.max(1, Math.round(destCssH * dpr));

      // Clear and set rendering flags
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false; // pixel-art friendly

      // Compute scale to 'contain' the source rectangle inside the canvas,
      // preserving aspect ratio.
      // The source sizes are in image pixels; destination CSS sizes are in CSS
      // pixels; canvas has device pixels = css * dpr.
      const scaleX = destCssW / sWidth;
      const scaleY = destCssH / sHeight;
      const scale = Math.min(scaleX, scaleY);

      // Destination size in canvas (device) pixels
      const dstW = Math.max(1, Math.round(sWidth * scale * dpr));
      const dstH = Math.max(1, Math.round(sHeight * scale * dpr));

      // Center the image within the full canvas area (in device pixels)
      const offsetX = Math.round((canvas.width - dstW) / 2);
      const offsetY = Math.round((canvas.height - dstH) / 2);

      // Draw only the top-left frame scaled and centered (object-fit: contain)
      ctx.drawImage(img, sx, sy, sWidth, sHeight, offsetX, offsetY, dstW, dstH);
    };

    img.onerror = () => {
      if (cancelled) return;
      // draw a simple red X to indicate an error
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#f00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.moveTo(canvas.width, 0);
      ctx.lineTo(0, canvas.height);
      ctx.stroke();
    };

    img.src = url;

    return () => {
      cancelled = true;
      // no need to revoke url because createBlobUrl manages it via FinalizationRegistry
    };
  }, [buffer, mime, frameW, frameH]);

  return <canvas aria-label={alt} ref={canvasRef} className={className} />;
}
