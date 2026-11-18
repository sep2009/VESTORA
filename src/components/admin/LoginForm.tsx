"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "./api";
import { Errors, Field, Input } from "./kit";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (!configured) {
    return <p role="alert" className="max-w-md rounded-md border border-line bg-surface p-4 text-sm">Admin sign-in is not configured on this server. Set <code>SESSION_SECRET</code> and <code>ADMIN_PASSWORD_HASH</code> in <code>.env.local</code> (see <code>.env.example</code>). There is no default password.</p>;
  }
  return (
    <form className="max-w-sm space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErrors([]);
      const r = await api("POST", "/api/admin/login", { password });
      setBusy(false);
      if (r.ok) { router.push("/admin"); router.refresh(); } else setErrors(r.errors);
    }}>
      <Field label="Password"><Input type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Errors errors={errors} />
      <Button type="submit" disabled={busy || password.length === 0}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
