# Camera, scroll and navigation (Stage 4)

## One owner
`src/modules/showroom/camera/manager.ts` is the **only** code that moves the camera. Everything else asks it:
`setMode`, `focusZone`, `focusDisplay`, `back`, `toOverview`, `zoom`, `setScrollProgress`.
- One GSAP tween at a time: every move calls `killTween()` first, so timelines never stack.
- Orbit controls are disabled during moves and in Guided mode, so two controllers never act at once. Orbit limits of the previous mode are lifted during a move and restored when it settles (otherwise the old limits clamp the move).
- UI state (mode, focus, hover, tour position) lives in `src/stores/camera-store.ts`; the manager writes it.
- Pure maths (poses, tour path, spline) is in `camera/poses.ts`, with no THREE/React, so it is tested in Node.

## Modes
| Mode | Camera driven by | Orbit controls | Touch |
|---|---|---|---|
| Guided | page scroll (GSAP ScrollTrigger) | off | `pan-y`: swiping scrolls the page |
| Explore | the visitor | on, dollhouse limits | `none`: one finger rotates, two fingers pinch |
| Focus | a move to a room or a product, then limited orbit around it | on, narrowed around the subject | `none` |

Focus keeps a stack of snapshots. Entering a room or a product pushes the current mode, focus and exact camera pose; **Back / Return / Esc** pops one level and flies back to that pose (Guided resumes at the current scroll position). Product → Back returns to the room; room → Return returns to where you were.

## Guided tour
Stops follow physical adjacency: overview → arrival → entrance hall → New Arrivals → Streetwear → Casual → Formal → Minimal → Luxury → Accessories → overview. A Catmull-Rom spline through the stops with a short dwell on each; the same scroll position always gives the same pose, so scrolling back retraces the route. Camera never dips below 2.2 m or through a wall. Portrait screens skip the arrival and entrance-hall shots (9 stops instead of 11). Scroll progress is smoothed in the manager (no jitter); the dots seek by scrolling.

Exactly one ScrollTrigger exists, created only in Guided mode inside a `gsap.context` and reverted on exit/unmount. The tall scroll track collapses in Explore/Focus, so there is no dead scrolling.

## Controls
- Mouse and trackpad drag, touch drag, pinch (or Ctrl/⌘ + wheel) to zoom. Plain wheel/swipe always scrolls the page (no scroll trapping).
- Keyboard (scene focused): arrows orbit and tilt, `+`/`-` zoom, Home overview, Esc back.
- Minimap: every room, entrance, your position and view direction, selected destination; click or Enter to fly there. On phones it collapses to a button and shows 48 px department buttons.
- Hover: ring, slight scale-up, name label, pointer cursor.

## Reduced motion
Guided mode snaps between stops (no interpolation), moves are instant, damping and the pulsing highlight are off, and the page starts in Explore.
