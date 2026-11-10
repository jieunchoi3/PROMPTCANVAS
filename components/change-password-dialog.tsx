"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { S } from "@/lib/strings";

const MIN_PASSWORD = 8;

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close(next: boolean) {
    if (!next) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function submit() {
    if (password.length < MIN_PASSWORD) {
      setError(S.passwordTooShort(MIN_PASSWORD));
      return;
    }
    if (password !== confirm) {
      setError(S.passwordMismatch);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(S.passwordChangeFailed);
      return;
    }
    toast.success(S.passwordChanged);
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="bg-[#141416] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{S.changePassword}</DialogTitle>
          <DialogDescription>{S.changePasswordHint}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{S.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{S.confirmPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="bg-black/40"
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button
            type="submit"
            className="w-full bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
            disabled={busy}
          >
            {S.changePassword}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
