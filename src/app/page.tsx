import Showroom from "@/components/showroom/Showroom";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-semibold">Step into the showroom</h1>
      <p className="max-w-xl text-neutral-400">Drag to look around. Departments and products appear here as the catalog is connected.</p>
      <Showroom />
    </section>
  );
}
