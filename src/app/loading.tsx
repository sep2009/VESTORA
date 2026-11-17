import { Container } from "@/components/layout/PageShell";
import { Skeleton, Spinner } from "@/components/feedback/States";

export default function Loading() {
  return (
    <Container className="py-16"><Spinner />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}</div>
    </Container>
  );
}
