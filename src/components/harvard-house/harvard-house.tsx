"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type HarvardHouseProps = {
  /**
   * Places the canvas. Set `--house-x` and `--house-y` (the building's centre,
   * as a share of the canvas) and `--house-fill` (the share of the canvas it
   * may fill across a full turn) here too; they can change at breakpoints.
   */
  className?: string;
  /** Places the "drag to turn" hint, which fades once someone has played with the building. */
  hintClassName?: string;
};

/**
 * The interactive drawing of a Harvard house. three.js and the model load
 * after the page is up, and the canvas fades in once the scene exists.
 * Without WebGL the space simply stays empty.
 */
export function HarvardHouse({ className, hintClassName }: HarvardHouseProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./scene").then(({ createHouseScene }) => {
      const host = hostRef.current;
      const canvas = canvasRef.current;
      if (cancelled || !host || !canvas) return;
      try {
        dispose = createHouseScene(host, canvas, { reducedMotion, onInteract: () => setPlayed(true) }).dispose;
        setReady(true);
      } catch {
        // No WebGL here; the hero reads fine without the drawing.
      }
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <>
      <div ref={hostRef} className={cn("relative", className)}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label="Line drawing of a Harvard house with a clock tower. Drag, or use the left and right arrow keys, to turn it; press Enter to light up its windows."
          className={cn(
            "absolute inset-0 size-full touch-pan-y outline-none transition-opacity duration-500 select-none",
            "focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-white/40",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      <p
        aria-hidden="true"
        className={cn(
          "pointer-events-none text-[0.8125rem] leading-5 text-white/50 transition-opacity duration-700",
          // Shows once the drawing has finished building itself.
          ready && !played ? "opacity-100 delay-[2600ms] motion-reduce:delay-0" : "opacity-0",
          hintClassName,
        )}
      >
        ( Drag to turn · <span className="pointer-coarse:hidden">Click</span>
        <span className="hidden pointer-coarse:inline">Tap</span> to light it up )
      </p>
    </>
  );
}
