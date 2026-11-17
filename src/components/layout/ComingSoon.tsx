import { EmptyState } from "@/components/feedback/States";

/** Honest placeholder for features that arrive in a later stage. It performs no fake actions. */
export function ComingSoon({ stage, children }: { stage: string; children: string }) {
  return <EmptyState title={`Arrives in ${stage}`}>{children}</EmptyState>;
}
