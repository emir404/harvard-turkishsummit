"use client";

import { useEffect, useRef } from "react";
import { themes } from "@/content/summit";

/** A cube seen from the isometric angle, between the themes. */
function Cube() {
  return (
    <svg
      viewBox="-10 -11 20 22"
      aria-hidden="true"
      className="mx-7 size-2.5 shrink-0 overflow-visible opacity-70 lg:mx-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <path d="M0 -10 8.66 -5 8.66 5 0 10 -8.66 5 -8.66 -5Z" />
      <path d="M-8.66 -5 0 0 8.66 -5M0 0V10" />
    </svg>
  );
}

/** Pixels per second at rest. */
const SPEED = 38;

/**
 * The year's themes on one running line under the hero. It drifts left on
 * its own, picks up a little speed while the page scrolls down, turns round
 * while it scrolls up, and slows almost to a stop under the pointer. Two
 * identical halves make the loop; the second is hidden from assistive
 * technology. It rests for reduced motion and while off screen.
 */
export function ThemeMarquee() {
  const bandRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    const track = trackRef.current;
    if (!band || !track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let offset = 0;
    let rate = 1; // signed: below zero the line runs the other way
    let target = 1;
    let hover = false;
    let visible = false;
    let frame = 0;
    let last = 0;
    let lastScroll = window.scrollY;
    let lastScrollTime = performance.now();

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      // Ease the rate towards its target, so speed and direction change smoothly.
      const goal = hover ? target * 0.15 : target;
      rate += (goal - rate) * (1 - Math.exp(-dt * 3));
      target += (Math.sign(target) - target) * (1 - Math.exp(-dt * 1.5));
      const half = track.scrollWidth / 2;
      offset = (((offset + SPEED * rate * dt) % half) + half) % half;
      track.style.transform = `translate3d(${(-offset).toFixed(2)}px, 0, 0)`;
      frame = visible ? requestAnimationFrame(tick) : 0;
      if (!visible) last = 0;
    };

    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - lastScroll;
      const velocity = dy / Math.max(16, now - lastScrollTime); // px per ms
      lastScroll = window.scrollY;
      lastScrollTime = now;
      if (Math.abs(velocity) < 0.02) return;
      const direction = Math.sign(velocity);
      target = direction * Math.min(3, 1 + Math.abs(velocity) * 1.6);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(tick);
    });
    io.observe(band);
    const enter = () => (hover = true);
    const leave = () => (hover = false);
    band.addEventListener("pointerenter", enter);
    band.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      band.removeEventListener("pointerenter", enter);
      band.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section ref={bandRef} aria-label="Summit themes" className="scheme-crimson relative z-10 overflow-hidden">
      <div className="edge-mask [--mask-x:8%] [--mask-y:0px]">
        <div ref={trackRef} className="flex w-max py-5 will-change-transform lg:py-6">
          {[0, 1].map((half) => (
            <ul key={half} aria-hidden={half === 1 ? true : undefined} className="flex shrink-0 items-center">
              {[0, 1].map((round) =>
                themes.map((theme, index) => (
                  <li
                    key={`${round}-${theme}`}
                    aria-hidden={round === 1 ? true : undefined}
                    className="flex items-center whitespace-nowrap"
                  >
                    <span className="mr-2.5 self-start pt-1 text-[0.6875rem] font-semibold text-fg-tertiary tabular-nums lg:pt-1.5">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[1.625rem] leading-none font-light tracking-[-0.02em] lg:text-[2.125rem]">
                      {theme}
                    </span>
                    <Cube />
                  </li>
                )),
              )}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
