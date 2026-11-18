"use client";
/** Last-resort boundary for errors in the root layout itself (it replaces the whole document). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui, sans-serif", background: "#f5f3ef", color: "#121212", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
      <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}><h1 style={{ fontSize: 24 }}>Something went wrong</h1><p>The page could not be shown. Please try again.</p><button onClick={reset} style={{ minHeight: 44, padding: "0 20px", background: "#121212", color: "#f5f3ef", border: 0, borderRadius: 2, cursor: "pointer" }}>Try again</button></main>
    </body></html>
  );
}
