"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IsoDrawing } from "./iso-drawing";
import type { IsoDrawingData } from "./types";

/**
 * The generated drawings, each its own chunk. They are large, so instead of
 * riding in every page's HTML, each is fetched once, shortly before it
 * scrolls into view, and shared by every place that shows it. The view boxes
 * are listed here so the space is held before the data arrives; scripts/iso
 * keeps them fixed. (The Bosphorus, split into moving layers, loads itself in
 * bosphorus-scene.tsx.)
 */
const drawings = {
  treehouse: { viewBox: "0 0 960 680", load: () => import("./drawings/treehouse").then((m) => m.treehouse) },
  keynote: { viewBox: "0 0 320 320", load: () => import("./drawings/keynote").then((m) => m.keynote) },
  biotech: { viewBox: "0 0 320 320", load: () => import("./drawings/biotech").then((m) => m.biotech) },
  energy: { viewBox: "0 0 320 320", load: () => import("./drawings/energy").then((m) => m.energy) },
  economy: { viewBox: "0 0 320 320", load: () => import("./drawings/economy").then((m) => m.economy) },
  geopolitics: { viewBox: "0 0 320 320", load: () => import("./drawings/geopolitics").then((m) => m.geopolitics) },
  gala: { viewBox: "0 0 320 320", load: () => import("./drawings/gala").then((m) => m.gala) },
} satisfies Record<string, { viewBox: string; load: () => Promise<IsoDrawingData> }>;

export type DrawingName = keyof typeof drawings;

const cache = new Map<DrawingName, Promise<IsoDrawingData>>();
const loadDrawing = (name: DrawingName) => {
  let pending = cache.get(name);
  if (!pending) {
    pending = drawings[name].load();
    cache.set(name, pending);
  }
  return pending;
};

type LazyIsoDrawingProps = Omit<Parameters<typeof IsoDrawing>[0], "data"> & {
  name: DrawingName;
  /** Labels and the like, placed over the drawing once it has arrived. */
  overlay?: (data: IsoDrawingData) => ReactNode;
  /** Holds the drawing's own shape before it arrives; leave it off when the parent sets the size. */
  holdShape?: boolean;
  wrapperClassName?: string;
};

export function LazyIsoDrawing({ name, overlay, holdShape = true, wrapperClassName, ...props }: LazyIsoDrawingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<IsoDrawingData | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        loadDrawing(name).then((loaded) => live && setData(loaded));
      },
      // Well ahead of the viewport, so it is drawn by the time it is seen.
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [name]);

  const [, , width, height] = drawings[name].viewBox.split(" ").map(Number);
  return (
    <div
      ref={ref}
      className={cn("relative", wrapperClassName)}
      style={holdShape ? ({ aspectRatio: `${width} / ${height}` } as CSSProperties) : undefined}
    >
      {data ? (
        <>
          <IsoDrawing data={data} {...props} />
          {overlay?.(data)}
        </>
      ) : null}
    </div>
  );
}
