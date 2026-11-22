// The signature move: when you keep a question, its numbered chip travels from the card into the
// letter, to the paragraph that now asks it. A clone flies above the page; the real elements never
// move, so layout and focus are untouched. Reduced motion skips the flight; the letter still updates.

/** --t-scene: how long a chip takes to reach the letter. */
export const FLIGHT_MS = 560;

let running: Animation | null = null;
let flying: HTMLElement | null = null;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface Launch { node: HTMLElement; rect: DOMRect }

/** Captures the chip where it sits now: the card it belongs to is about to change. */
export function captureChip(source: Element | null): Launch | null {
  if (!(source instanceof HTMLElement) || prefersReducedMotion()) return null;
  const rect = source.getBoundingClientRect();
  return rect.width ? { node: source.cloneNode(true) as HTMLElement, rect } : null;
}

export function flyChip(launch: Launch | null, target: Element | null): Promise<void> {
  running?.cancel();
  if (!launch || !target || prefersReducedMotion()) return Promise.resolve();
  const from = launch.rect;
  const to = target.getBoundingClientRect();
  // A target scrolled out of view would send the chip off-screen; only fly to what can be seen.
  if (to.bottom < 0 || to.top > innerHeight) return Promise.resolve();

  const chip = launch.node;
  chip.removeAttribute("data-chip-source");
  chip.setAttribute("aria-hidden", "true");
  chip.classList.add("chip-flight");
  Object.assign(chip.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(chip);
  flying = chip;

  const dx = to.left + 6 - from.left;
  const dy = to.top + 2 - from.top;
  const lift = Math.min(120, Math.abs(dy) * 0.35 + 40);
  const animation = chip.animate([
    { transform: "translate(0, 0) scale(1)", opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(1.15)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.9)`, opacity: 0 },
  ], { duration: FLIGHT_MS, easing: "cubic-bezier(.2, .7, .2, 1)" });
  running = animation;
  // A preference change mid-flight stops it at once.
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stop = () => { if (media.matches) animation.cancel(); };
  media.addEventListener("change", stop);
  return new Promise(resolve => {
    const done = () => { media.removeEventListener("change", stop); chip.remove(); if (running === animation) { running = null; flying = null; } resolve(); };
    animation.addEventListener("finish", done, { once: true });
    animation.addEventListener("cancel", done, { once: true });
  });
}

/** Stops a flight at once, for example when its page goes away; the clone leaves with it. */
export function cancelFlight() {
  running?.cancel();
  flying?.remove();
  running = null;
  flying = null;
}
