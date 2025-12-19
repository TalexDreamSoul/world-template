const cache = new WeakMap<ArrayBuffer, string>();
const finalizer = new FinalizationRegistry((url: string) => {
  URL.revokeObjectURL(url);
});

export function createBlobUrl(
  blob: ArrayBuffer,
  type = "application/octet-stream",
): string {
  if (cache.has(blob)) {
    return cache.get(blob)!;
  }
  const blobData = new Blob([blob], { type });
  const url = URL.createObjectURL(blobData);
  cache.set(blob, url);
  finalizer.register(blob, url);
  return url;
}
