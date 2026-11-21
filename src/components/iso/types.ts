/**
 * Drawings in the hero's isometric style, generated from 3D models by
 * scripts/iso (Blender): hidden-line strokes, optionally over tonal faces and
 * lit windows, like the hero's house. The component that renders them picks
 * the colours (per section scheme), weights and the draw-in animation.
 */

/** Line weight class, after the hero: 0 edge, 1 detail, 2 fine, 3 ground. */
export type IsoInk = 0 | 1 | 2 | 3;

export type IsoPath = {
  /** SVG path data in viewBox units. One connected visible polyline. */
  d: string;
  k: IsoInk;
  /** Where the path starts in the draw-in sequence, 0–1. */
  o: number;
};

/**
 * A visible face, filled. Faces are listed back to front (painter's order),
 * so they must be drawn in array order.
 */
export type IsoFill = {
  d: string;
  /** Tone step on the scheme's ramp: 0 deepest (reveals, unlit glass, water) to 7 brightest (lit tops). */
  t: number;
};

/** A pane or lamp that can be lit: drawn over the faces, under the lines. */
export type IsoLight = {
  d: string;
  /** When it comes on in a sequence, 0–1. */
  s: number;
};

export type IsoDrawingData = {
  viewBox: string;
  paths: IsoPath[];
  fills?: IsoFill[];
  lights?: IsoLight[];
  /** Named points in viewBox units, for placing labels next to parts of the drawing. */
  anchors?: Record<string, [number, number]>;
};
