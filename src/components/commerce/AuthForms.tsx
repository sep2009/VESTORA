"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Errors, Field, Input, Notice } from "@/components/admin/kit";
import { cn } from "@/lib/cn";
import { announceAuthChange, post } from "./auth-client";

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/account");

/** Sign in and create account. The password is sent over the page's own connection and only a salted scrypt hash is stored. */
export function AuthForms({ next }: { next: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErrors([]);
    const r = await post(mode === "login" ? "POST" : "POST", mode === "login" ? "/api/auth/login" : "/api/auth/register", mode === "login" ? { email: f.email, password: f.password } : f);
    setBusy(false);
    if (!r.ok) return setErrors(r.errors);
    announceAuthChange(); router.push(safeNext(next)); router.refresh();
  };
  const tab = (m: "login" | "register", label: string) => <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErrors([]); }} className={cn("min-h-11 border-b-2 px-4 text-xs uppercase tracking-[0.16em]", mode === m ? "border-ink" : "border-transparent text-mute")}>{label}</button>;
  return (
    <div className="max-w-md">
      <div role="tablist" aria-label="Account" className="mb-6 flex border-b border-line">{tab("login", "Sign in")}{tab("register", "Create account")}</div>
      <form onSubmit={(e) => void submit(e)} className="grid gap-4" noValidate>
        {mode === "register" && <Field label="Full name"><Input autoComplete="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>}
        <Field label="Email"><Input type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" hint={mode === "register" ? "At least 10 characters." : undefined}><Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Errors errors={errors} />
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
        {mode === "login" && <p className="text-sm"><Link href="/account/forgot" className="underline">Forgot your password?</Link></p>}
      </form>
    </div>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErrors([]); const r = await post<{ message: string }>("POST", "/api/auth/forgot", { email }); setBusy(false); if (r.ok) setDone(r.data.message); else setErrors(r.errors); };
  return done ? <div className="max-w-md space-y-3"><Notice>{done}</Notice><p className="text-sm text-mute">The link works for one hour and once only.</p></div> : (
    <form onSubmit={(e) => void submit(e)} className="grid max-w-md gap-4"><Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Errors errors={errors} /><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button></form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErrors([]); const r = await post("POST", "/api/auth/reset", { token, password }); setBusy(false); if (r.ok) { setDone(true); setTimeout(() => router.push("/account"), 1500); } else setErrors(r.errors); };
  return done ? <Notice>Password changed. Taking you to sign in…</Notice> : (
    <form onSubmit={(e) => void submit(e)} className="grid max-w-md gap-4"><Field label="New password" hint="At least 10 characters."><Input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field><Errors errors={errors} /><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Set new password"}</Button></form>
  );
}
