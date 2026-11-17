/** Shown while the 3D scene chunk loads. Indeterminate bar; static under reduced motion. */
export function ShowroomLoader() {
  return (
    <div role="status" aria-live="polite" className="grid size-full place-items-center bg-paper">
      <div className="flex w-56 flex-col items-center gap-5 text-center">
        <span className="font-display text-sm tracking-[0.4em] uppercase">Vestora</span>
        <div className="h-px w-full overflow-hidden bg-line">
          <div className="h-full w-1/3 bg-ink animate-[vestora-slide_1.4s_var(--ease-soft)_infinite] motion-reduce:w-full motion-reduce:animate-none" />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-mute">Entering the showroom</p>
      </div>
    </div>
  );
}
