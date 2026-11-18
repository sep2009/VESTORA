import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ForgotForm } from "@/components/commerce/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };
export default function Page() { return <PageShell eyebrow="Account" title="Reset your password" intro="Enter your email and we will send you a link to choose a new password."><ForgotForm /></PageShell>; }
