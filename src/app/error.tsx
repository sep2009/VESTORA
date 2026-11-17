"use client";
import { ErrorState } from "@/components/feedback/States";
import { Container } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <Container className="py-24"><ErrorState action={<Button onClick={reset} variant="secondary">Try again</Button>}>An unexpected error occurred. You can try again.</ErrorState></Container>;
}
