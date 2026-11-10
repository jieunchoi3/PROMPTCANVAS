"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";
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
  const mounted = useMounted();

  useEffect(() => {
    if (!isCloudEnabled()) router.replace("/");
  }, [router]);

  if (!isCloudEnabled() || !mounted) {
    return <div className="min-h-screen bg-[#0B0B0D]" />;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError(S.loginError);
      return;
    }
    window.location.assign("/");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#0B0B0D] px-4">
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
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
        <Link href="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300">
          {S.backToLibrary}
        </Link>
        <div className="flex justify-center">
          <LanguageSwitch />
        </div>
      </form>
    </div>
  );
}
