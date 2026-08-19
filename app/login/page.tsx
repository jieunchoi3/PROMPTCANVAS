"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCloudEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { S } from "@/lib/strings";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isCloudEnabled()) router.replace("/");
  }, [router]);

  if (!isCloudEnabled()) return null;

  async function submit(mode: "in" | "up") {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const fn =
      mode === "in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error: authError } = await fn;
    setBusy(false);
    if (authError) {
      setError(mode === "in" ? S.loginError : S.signupError);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#0B0B0D] px-4">
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("in");
        }}
      >
        <div>
          <h1 className="text-lg font-medium text-zinc-100">{S.appName}</h1>
          <p className="text-sm text-zinc-500">{S.loginSubtitle}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{S.email}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-black/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{S.password}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-black/40"
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button
          type="submit"
          className="w-full bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
          disabled={busy}
        >
          {S.signIn}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => void submit("up")}
        >
          {S.signUp}
        </Button>
      </form>
    </div>
  );
}
