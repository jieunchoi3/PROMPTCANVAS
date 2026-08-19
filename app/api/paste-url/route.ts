import { NextResponse } from "next/server";
import { MAX_FILE_BYTES } from "@/lib/constants";
import { S } from "@/lib/strings";
import { z } from "zod";

const Body = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: S.pasteUrlFail }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: S.pasteUrlFail }, { status: 400 });
  }
  const { url } = parsed.data;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: S.pasteUrlFail }, { status: 400 });
  }
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json({ error: S.pasteUrlFail }, { status: 400 });
    }
    const mime = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0];
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: S.uploadRejectSize }, { status: 400 });
    }
    const ext = mime.split("/")[1]?.split("+")[0] ?? "bin";
    return NextResponse.json({
      filename: `paste.${ext}`,
      mime,
      base64: buf.toString("base64"),
    });
  } catch {
    return NextResponse.json({ error: S.pasteUrlFail }, { status: 400 });
  }
}
