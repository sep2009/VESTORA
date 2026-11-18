import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminConfigured } from "@/server/auth/page-guard";

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function AdminLogin() {
  return <PageShell eyebrow="Admin" title="Sign in" intro="Catalog, inventory and showroom management."><LoginForm configured={adminConfigured()} /></PageShell>;
}
