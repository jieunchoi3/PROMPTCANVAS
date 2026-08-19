export async function fetchImageBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("image_fetch_failed");
  const blob = await res.blob();
  const mimeType = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return { data: btoa(binary), mimeType };
}
