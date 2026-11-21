"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IsoDrawing } from "@/components/iso/iso-drawing";
import type { IsoDrawingData } from "@/components/iso/types";

type Layers = typeof import("@/components/iso/drawings/bosphorus-layers");

const SCENE = { w: 1600, h: 720 };

/** Where each ferry is on its route when the page opens, so the strait is never empty: one about to pass under the bridge, one mid-strait below it, one off to the east. */
const START = [0.5, 0.22, 0.3, 0.6];

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

/** The box a drawing covers, read from its path data (absolute M, L and Z only), with a little room for strokes. */
function boundsOf(data: IsoDrawingData) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const all = [...data.paths, ...(data.fills ?? []), ...(data.lights ?? [])];
  for (const { d } of all) {
    const n = d.match(/-?\d+(?:\.\d+)?/g);
    if (!n) continue;
    for (let i = 0; i + 1 < n.length; i += 2) {
      const x = Number(n[i]);
      const y = Number(n[i + 1]);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const pad = 4;
  return {
    x: x0 - pad,
    y: y0 - pad,
    w: x1 - x0 + pad * 2,
    h: y1 - y0 + pad * 2,
  };
}

const lanePath = (points: [number, number][]) =>
  points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join("");

/**
 * Where the near legs of the towers stand in front of the carriageways
 * (from scripts/iso): a car passing there goes behind the leg.
 */
const LEGS = [
  { x: 520, y0: 526, y1: 566 },
  { x: 1113, y0: 183, y1: 223 },
];

/** Cars on the bridge: headlights one way, taillights the other, each running its lane at its own pace. */
function Traffic({ lanes }: { lanes: Layers["bosphorusLanes"] }) {
  const ways = [
    {
      path: lanePath(lanes.europeToAsia),
      color: "#fff1d0",
      count: 7,
      seconds: 19,
    },
    {
      path: lanePath(lanes.asiaToEurope),
      color: "#ff5a4c",
      count: 6,
      seconds: 22,
    },
  ];
  return (
    <svg
      viewBox={`0 0 ${SCENE.w} ${SCENE.h}`}
      aria-hidden="true"
      className="bos-traffic absolute inset-0 h-full w-full overflow-visible"
    >
      <defs>
        <mask id="bos-legs" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="1120">
          <rect x="-200" y="-200" width="2000" height="1120" fill="white" />
          {LEGS.map((leg) => (
            <rect key={leg.x} x={leg.x - 6} y={leg.y0} width="12" height={leg.y1 - leg.y0} fill="black" />
          ))}
        </mask>
      </defs>
      <g mask="url(#bos-legs)">
        {ways.map((way, w) =>
          Array.from({ length: way.count }, (_, i) => {
            // Spread along the lane with a little irregularity, so the cars never move as a column.
            const spacing = (i + (0.37 * ((i * 7 + w * 3) % 5)) / 5) / way.count;
            const seconds = way.seconds * (0.9 + 0.2 * (((i * 5 + w) % 7) / 7));
            return (
              <g key={`${w}-${i}`}>
                <circle r="4.5" fill={way.color} opacity="0.18" />
                <circle r="1.7" fill={way.color} />
                <animateMotion
                  path={way.path}
                  dur={`${seconds.toFixed(2)}s`}
                  begin={`${(-spacing * seconds).toFixed(2)}s`}
                  repeatCount="indefinite"
                />
              </g>
            );
          }),
        )}
      </g>
    </svg>
  );
}

/**
 * The Bosphorus at night, alive. Drawn by scroll from the European shore to
 * the Asian one (inside a scroll scene), then the ferries cross the strait,
 * passing under the bridge, cars run its deck both ways, and now and then a
 * window goes dark or comes on. It is a stack of layers on one box: water,
 * ferries, the land's faces and lights (so the deck hides a ferry under it),
 * traffic, the land's lines. The ferries ride their own composited layers,
 * so they move without repainting the scene. Everything rests for reduced
 * motion and while the scene is off screen.
 */
export function BosphorusScene({ label, shores }: { label: string; shores: { europe: string; asia: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState<Layers | null>(null);

  // The drawing is a quarter of a megabyte: fetch it shortly before it scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        import("@/components/iso/drawings/bosphorus-layers").then((loaded) => live && setLayers(loaded));
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, []);

  // Life: rests off screen and for reduced motion; windows go dark and come on now and then.
  useEffect(() => {
    const el = ref.current;
    if (!el || !layers) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const traffic = el.querySelector<SVGSVGElement>(".bos-traffic");
    const panes = Array.from(el.querySelectorAll<SVGPathElement>(".bos-land .iso-lights path")).filter(
      // Windows are quads; the round lamps on the bridge and quays stay lit.
      (path) => (path.getAttribute("d")?.match(/[ML]/g)?.length ?? 0) === 4,
    );
    let visible = false;
    let timer = 0;
    const flicker = () => {
      if (visible && panes.length) {
        const pane = panes[Math.floor(Math.random() * panes.length)];
        pane.toggleAttribute("data-off");
      }
      timer = window.setTimeout(flicker, 1600 + Math.random() * 2600);
    };
    const setRunning = (running: boolean) => {
      el.toggleAttribute("data-paused", !running);
      if (running) traffic?.unpauseAnimations();
      else traffic?.pauseAnimations();
    };
    if (reduced) {
      setRunning(false);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setRunning(visible);
    });
    io.observe(el);
    timer = window.setTimeout(flicker, 2000);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [layers]);

  const anchors = layers?.bosphorusLand.anchors;
  const shore = (at: [number, number] | undefined, text: string, appear: number) =>
    at ? (
      <span
        className="fade-at absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-[0.8125rem] whitespace-nowrap text-fg-secondary"
        style={
          {
            left: pct(at[0], SCENE.w),
            top: pct(at[1], SCENE.h),
            "--at": appear,
          } as CSSProperties
        }
      >
        <span aria-hidden="true" className="size-1 rounded-full bg-fg-secondary" />
        {text}
      </span>
    ) : null;

  return (
    <div ref={ref} className="bos relative aspect-[1600/720] [container-type:inline-size]">
      {layers ? (
        <>
          {/* The strait is the page itself: only its swell is drawn, so no water plate shows an edge. */}
          <IsoDrawing
            data={layers.bosphorusWater}
            parts="lines"
            mode="scrub"
            width={SCENE.w}
            className="absolute inset-0 h-full w-full"
          />

          <div className="bos-live absolute inset-0">
            {layers.bosphorusFerries.map((ferry, index) => {
              const box = boundsOf(ferry.data);
              return (
                <IsoDrawing
                  key={index}
                  data={ferry.data}
                  viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
                  mode="static"
                  className="bos-ferry absolute"
                  style={
                    {
                      left: pct(box.x, SCENE.w),
                      top: pct(box.y, SCENE.h),
                      width: pct(box.w, SCENE.w),
                      "--tx": ferry.travel[0],
                      "--ty": ferry.travel[1],
                      "--dur": `${ferry.seconds}s`,
                      "--start": START[index % START.length],
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>

          <IsoDrawing
            data={layers.bosphorusLand}
            parts="surfaces"
            mode="scrub"
            width={SCENE.w}
            className="bos-land absolute inset-0 h-full w-full"
          />

          <div className="bos-live absolute inset-0">
            <Traffic lanes={layers.bosphorusLanes} />
          </div>

          <IsoDrawing
            data={layers.bosphorusLand}
            parts="lines"
            mode="scrub"
            width={SCENE.w}
            label={label}
            className="absolute inset-0 h-full w-full"
          />

          {shore(anchors?.europe, shores.europe, 0.15)}
          {shore(anchors?.asia, shores.asia, 0.8)}
        </>
      ) : null}
    </div>
  );
}
