import { type NextRequest, NextResponse } from "next/server";
import { isCloudEnabled } from "@/lib/env";

export async function middleware(request: NextRequest) {
  if (!isCloudEnabled()) return NextResponse.next();
  const { updateSession } = await import("@/lib/supabase/middleware");
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
