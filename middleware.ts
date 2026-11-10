import { type NextRequest, NextResponse } from "next/server";
import { isCloudEnabled } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (!isCloudEnabled()) return NextResponse.next();
  return updateSession(request);
}

// Only routes that read the session on the server; page loads skip the auth round trip.
export const config = {
  matcher: ["/api/:path*", "/login"],
};
