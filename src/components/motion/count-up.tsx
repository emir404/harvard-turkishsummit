"use client";

import { useEffect, useRef } from "react";

/**
 * A figure such as "300+" or "300–400" whose numbers count up from zero the
 * first time it comes into view. Screen readers get the figure as written.
 */
export function CountUp({ figure, className }: { figure: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const parts = figure.split(/(\d+)/);
    const render = (t: number) => {
      el.textContent = parts.map((part) => (/^\d+$/.test(part) ? String(Math.round(Number(part) * t)) : part)).join("");
    };

    // Waiting below the fold, it shows zero; already in view, it is left alone.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;
    render(0);

    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const x = Math.min(1, (now - start) / 1700);
          render(1 - Math.pow(1 - x, 4));
          if (x < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      render(1);
    };
  }, [figure]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {figure}
      </span>
      <span className="sr-only">{figure}</span>
    </span>
  );
}
