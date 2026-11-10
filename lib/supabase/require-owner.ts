import { NextResponse } from "next/server";
import { isCloudEnabled, libraryOwnerId } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Returns a 401/403 response unless the request comes from the library owner. */
export async function requireOwner(): Promise<NextResponse | null> {
  if (!isCloudEnabled()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  if (data.user.id !== libraryOwnerId()) {
    return NextResponse.json({ error: "read_only" }, { status: 403 });
  }
  return null;
}
