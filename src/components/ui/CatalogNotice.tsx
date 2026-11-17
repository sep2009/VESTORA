export function CatalogNotice({ status, message }: { status: "unconfigured" | "error" | "empty"; message?: string }) {
  const text = {
    unconfigured: "The store backend is not connected yet. Add Supabase credentials in .env.local to load the catalog.",
    error: message ?? "The catalog could not be loaded.",
    empty: "No products have been published yet.",
  }[status];
  return <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">{text}</p>;
}
