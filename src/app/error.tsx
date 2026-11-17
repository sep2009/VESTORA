"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3">
      <p>Something went wrong.</p>
      <button className="rounded-lg bg-white/10 px-4 py-2" onClick={reset}>Try again</button>
    </div>
  );
}
