import { EmptyState } from "@/components/feedback/States";
import { Container } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return <Container className="py-24"><EmptyState title="Page not found" action={<Button href="/">Back to the showroom</Button>}>That page does not exist.</EmptyState></Container>;
}
