"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, LogIn, LogOut } from "lucide-react";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { createClient } from "@/lib/supabase/client";
import { S } from "@/lib/strings";
import { useCanvas } from "@/store/canvas-store";

export function AccountButton() {
  const mode = useCanvas((s) => s.mode);
  const canEdit = useCanvas((s) => s.canEdit);
  const [signedIn, setSignedIn] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (mode !== "cloud") return;
    void createClient()
      .auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)));
  }, [mode]);

  if (mode === "local") {
    return <span className="hidden text-[11px] text-zinc-600 sm:inline">{S.localMode}</span>;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className={
          canEdit
            ? "hidden text-[11px] text-[#D9B382]/80 sm:inline"
            : "hidden rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400 sm:inline"
        }
        title={canEdit ? undefined : S.readOnlyHint}
      >
        {canEdit ? S.ownerMode : S.readOnlyMode}
      </span>
      {signedIn ? (
        <button
          type="button"
          aria-label={S.changePassword}
          title={S.changePassword}
          onClick={() => setPasswordOpen(true)}
          className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <KeyRound className="size-3.5" />
        </button>
      ) : null}
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      {signedIn ? (
        <button
          type="button"
          aria-label={S.signOut}
          title={S.signOut}
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.assign("/");
          }}
          className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <LogOut className="size-3.5" />
        </button>
      ) : (
        <Link
          href="/login"
          aria-label={S.ownerLogin}
          title={S.ownerLogin}
          className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <LogIn className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
