/**
 * Scroll progress for scroll-linked animation. One scroll listener and one
 * animation frame loop serve every element on the page; each gets `--p`
 * (0–1) written to its style, eased towards the scroll position so wheel
 * steps glide instead of jumping. Rects are all read before any style is
 * written, so a frame never forces layout twice.
 *
 * Modes, by where the element is in the viewport:
 * - `exit`:  0 while its top is at or below the top of the viewport, 1 once its bottom has passed the top (the hero).
 * - `pin`:   0 when its top reaches the top of the viewport, 1 when its bottom reaches the bottom (a tall section with a sticky child).
 * - `enter`: 0 as its top comes up past the bottom of the viewport, 1 once its top is a quarter of the way down.
 * - `cover`: 0 as its top comes into view, 1 as its bottom leaves.
 */
export type ProgressMode = "exit" | "pin" | "enter" | "cover";

type Entry = {
  el: HTMLElement;
  mode: ProgressMode;
  /** How quickly the value catches up with the scroll position, per second. 0 follows it exactly. */
  rate: number;
  value: number;
  target: number;
  onUpdate?: (value: number) => void;
};

const entries = new Set<Entry>();
let frame = 0;
let last = 0;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function targetFor(mode: ProgressMode, rect: DOMRect, vh: number) {
  switch (mode) {
    case "exit":
      return -rect.top / Math.max(1, rect.height);
    case "pin":
      return -rect.top / Math.max(1, rect.height - vh);
    case "enter":
      return (vh - rect.top) / (vh * 0.75);
    case "cover":
      return (vh - rect.top) / (vh + rect.height);
  }
}

function tick(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  const vh = window.innerHeight;

  // Read everything first…
  for (const e of entries) e.target = clamp01(targetFor(e.mode, e.el.getBoundingClientRect(), vh));

  // …then write.
  let moving = false;
  for (const e of entries) {
    const k = e.rate > 0 ? 1 - Math.exp(-dt * e.rate) : 1;
    let next = e.value + (e.target - e.value) * k;
    if (Math.abs(e.target - next) < 0.0004) next = e.target;
    else moving = true;
    if (next !== e.value) {
      e.value = next;
      e.el.style.setProperty("--p", next.toFixed(4));
      e.onUpdate?.(next);
    }
  }

  if (moving) {
    frame = requestAnimationFrame(tick);
  } else {
    frame = 0;
    last = 0;
  }
}

function wake() {
  if (!frame) frame = requestAnimationFrame(tick);
}

export function observeProgress(
  el: HTMLElement,
  { mode, rate = 9, onUpdate }: { mode: ProgressMode; rate?: number; onUpdate?: (value: number) => void },
) {
  // Start where the page already is, without easing in from zero.
  const start = clamp01(targetFor(mode, el.getBoundingClientRect(), window.innerHeight));
  const entry: Entry = { el, mode, rate, value: start, target: start, onUpdate };
  el.style.setProperty("--p", start.toFixed(4));
  onUpdate?.(start);
  entries.add(entry);
  if (entries.size === 1) {
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
  }
  wake();

  return () => {
    entries.delete(entry);
    if (entries.size === 0) {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
  };
}
