"use client";
import { useState } from "react";
import type { Product } from "@/modules/catalog/types";
import { cn } from "@/lib/cn";

/** Image gallery: thumbnails, previous/next, arrow keys. Shows exactly the images in the record; none are invented. */
export function ProductGallery({ images, name, demo }: { images: Product["images"]; name: string; demo: boolean }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return <div className="grid aspect-[4/5] place-items-center rounded-sm bg-ink/6 text-xs uppercase tracking-[0.2em] text-mute">No image available</div>;
  }
  const go = (n: number) => setI((n + images.length) % images.length);
  const cur = images[i]!;
  return (
    <div className="space-y-3" onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); } }}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-ink/6" role="group" aria-roledescription="carousel" aria-label={`${name} images`} tabIndex={0}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.url} alt={cur.alt} className="size-full object-cover" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(i - 1)} aria-label="Previous image" className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-card">‹</button>
            <button type="button" onClick={() => go(i + 1)} aria-label="Next image" className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-card">›</button>
          </>
        )}
        <p className="absolute bottom-2 left-2 rounded-sm bg-ink/80 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-paper" aria-live="polite">{i + 1} / {images.length}</p>
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2" aria-label="Image thumbnails">
          {images.map((im, k) => (
            <li key={im.url}>
              <button type="button" onClick={() => setI(k)} aria-label={`Show image ${k + 1}`} aria-current={k === i} className={cn("block size-16 overflow-hidden rounded-sm border-2 bg-ink/6", k === i ? "border-ink" : "border-transparent")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-mute">{demo ? "Demo illustration, not a real photograph." : [cur.credit && `Image: ${cur.credit}`, cur.license && `Licence: ${cur.license}`].filter(Boolean).join(" · ")}</p>
    </div>
  );
}
