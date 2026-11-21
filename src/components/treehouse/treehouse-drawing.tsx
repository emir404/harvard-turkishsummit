import { cn } from "@/lib/cn";
import { treehouseLayers } from "./paths";

const viewBoxes = {
  /** The hero frame: building on the right, street lines running the full width. */
  wide: "0 0 1440 508",
  /** The building alone, for narrow screens. */
  tight: "372 0 1068 508",
} as const;

/**
 * Strokes-only drawing of the David Rubenstein Treehouse seen from Western
 * Avenue. The paths come from the model in scripts/treehouse.
 */
export function TreehouseDrawing({
  framing = "wide",
  className,
}: {
  framing?: keyof typeof viewBoxes;
  className?: string;
}) {
  return (
    <svg
      viewBox={viewBoxes[framing]}
      role="img"
      aria-label="Line drawing of the David Rubenstein Treehouse, seen from Western Avenue"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("block h-auto w-full text-fg", className)}
    >
      {treehouseLayers.map((layer) => (
        <path
          key={layer.id}
          d={layer.d}
          strokeWidth={layer.strokeWidth}
          strokeOpacity={layer.opacity}
          vectorEffect="non-scaling-stroke"
          // The faint glazing lines turn to noise at phone widths.
          className={layer.id === "detail" ? "hidden sm:block" : undefined}
        />
      ))}
    </svg>
  );
}
