export async function hashFile(file: Blob, size: number): Promise<string> {
  const slice = file.slice(0, 1024 * 1024);
  const buf = await slice.arrayBuffer();
  const extra = new TextEncoder().encode(`:${size}`);
  const combined = new Uint8Array(buf.byteLength + extra.byteLength);
  combined.set(new Uint8Array(buf), 0);
  combined.set(extra, buf.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
