"use client";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { smallBtn } from "./kit";

export function LogoutButton() {
  const router = useRouter();
  return <button type="button" className={smallBtn} onClick={async () => { await api("POST", "/api/admin/logout"); router.push("/admin/login"); router.refresh(); }}>Sign out</button>;
}
