import { EmptyState, ErrorState } from "@/components/feedback/States";

export function CatalogNotice({ status, message }: { status: "unconfigured" | "error" | "empty"; message?: string }) {
  if (status === "error") return <ErrorState title="The catalog could not be loaded">{message}</ErrorState>;
  if (status === "empty") return <EmptyState title="Nothing here yet">No products have been published yet.</EmptyState>;
  return <EmptyState title="Store not connected">The store backend is not connected yet. Add Supabase credentials in .env.local to load the catalog.</EmptyState>;
}
