import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { IsoDrawingData, IsoInk, IsoLight } from "./types";

/** Drawn faint to strong, so the strong lines sit on top. */
const INKS: IsoInk[] = [3, 2, 1, 0];

/** Lights come on in this many groups, so a reveal restyles a handful of groups rather than every pane. */
const LIGHT_GROUPS = 6;

type IsoDrawingProps = {
  data: IsoDrawingData;
  /** Describes the drawing. Left out, it is treated as decoration. */
  label?: string;
  /**
   * `draw`: draws itself in once when it comes into view: lines, then faces, then lights.
   * `scrub`: drawn by scrolling; needs a scroll scene (`--p`) around it.
   * `static`: shown as it is.
   */
  mode?: "draw" | "scrub" | "static";
  /**
   * For `draw`: `view` draws when the drawing itself comes into view; `parent`
   * waits for an ancestor to be marked `data-shown`.
   */
  drawOn?: "view" | "parent";
  /** Leave the faces and lights out and show the lines alone. */
  linesOnly?: boolean;
  /** Which parts to draw, for a scene split into layers with moving things between them. */
  parts?: "all" | "surfaces" | "lines";
  /** Viewbox override: show this part of the drawing (for a small layer cut out of a scene). */
  viewBox?: string;
  /** Cover the box (cropping the drawing's sides) instead of fitting inside it. */
  cover?: boolean;
  /** The width it is usually shown at, so lines are right before the runtime measures it. */
  width?: number;
  className?: string;
  style?: CSSProperties;
};

function groupLights(lights: IsoLight[]) {
  const groups: IsoLight[][] = Array.from({ length: LIGHT_GROUPS }, () => []);
  for (const light of lights) groups[Math.min(LIGHT_GROUPS - 1, Math.floor(light.s * LIGHT_GROUPS))].push(light);
  return groups;
}

/**
 * An isometric drawing in the hero's language: tonal faces, lit panes and
 * hairlines. Colours come from the section's scheme (the `--iso-*` ramp in
 * globals.css), so the same drawing reads as day on paper and night on ink.
 */
export function IsoDrawing({
  data,
  label,
  mode = "draw",
  drawOn = "view",
  linesOnly,
  parts = "all",
  viewBox,
  cover,
  width,
  className,
  style,
}: IsoDrawingProps) {
  const box = viewBox ?? data.viewBox;
  const viewBoxWidth = Number(box.split(" ")[2]);
  const sceneWidth = Number(data.viewBox.split(" ")[2]);
  const px = width ? viewBoxWidth / width : 1;
  // Drawn by scroll, each face follows its part of the drawing in: its order is taken from where it starts,
  // across the drawing, which is the way the lines are ordered too.
  const faceOrder = (d: string) => {
    const x = Number.parseFloat(d.slice(1));
    return Number.isFinite(x) ? Math.min(1, Math.max(0, x / sceneWidth)) : 0;
  };
  const surfaces = !linesOnly && parts !== "lines";
  const fills = surfaces ? data.fills : undefined;
  const lights = !surfaces || !data.lights?.length ? undefined : groupLights(data.lights);
  const lines = parts !== "surfaces";

  return (
    <svg
      data-iso=""
      data-reveal={mode === "draw" && drawOn === "view" ? "draw" : undefined}
      viewBox={box}
      preserveAspectRatio={cover ? "xMidYMid slice" : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "iso block h-auto w-full overflow-visible",
        mode === "draw" && "iso-draw",
        mode === "scrub" && "iso-scrub",
        className,
      )}
      style={{ "--iso-px": px.toFixed(3), ...style } as CSSProperties}
    >
      {/* Faces back to front: they are listed in painter's order. */}
      {fills?.length ? (
        <g className="iso-fills">
          {fills.map((fill, index) => (
            <path
              key={index}
              d={fill.d}
              className={`f${fill.t}`}
              style={mode === "scrub" ? ({ "--o": faceOrder(fill.d).toFixed(3) } as CSSProperties) : undefined}
            />
          ))}
        </g>
      ) : null}
      {lights ? (
        <g className="iso-lights">
          {lights.map((group, index) =>
            group.length ? (
              <g key={index} className="iso-lg" style={{ "--b": index / (LIGHT_GROUPS - 1) } as CSSProperties}>
                {group.map((light, i) => (
                  <path key={i} d={light.d} />
                ))}
              </g>
            ) : null,
          )}
        </g>
      ) : null}
      {/* One group per line weight, faint to strong. Opacity sits on the group, so where
          pieces of a long line meet, their overlapping ends do not add up to brighter dots. */}
      {(lines ? INKS : []).map((ink) => (
        <g key={ink} className={`iso-line k${ink}`}>
          {data.paths.map((path, index) =>
            path.k === ink ? (
              <path key={index} d={path.d} pathLength={1} style={{ "--o": path.o } as CSSProperties} />
            ) : null,
          )}
        </g>
      ))}
    </svg>
  );
}
