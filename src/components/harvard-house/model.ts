/**
 * A procedural model of a Harvard river house, after the line drawing in the
 * hero design: a U of brick ranges around a courtyard, five pedimented fronts
 * on the street side, and a clock tower with an octagonal belfry and an onion
 * dome on the central block.
 *
 * Everything is built from flat faces and explicitly drawn lines, so the scene
 * can render it as a hidden-line drawing: dark fills that hide what is behind
 * them, and crisp lines on top. Units are roughly metres; x runs east, y up,
 * and z south, towards the street front.
 */
import { ShapeUtils, Vector2 } from "three";

export type Vec3 = [number, number, number];

/** Surface kinds. The scene gives each one its own tone. */
export const Surface = { wall: 0, roof: 1, trim: 2, reveal: 3, stone: 4, dome: 5, canopy: 6 } as const;

/** Line weights, as a share of full line brightness. */
export const Ink = { edge: 1, detail: 0.72, fine: 0.46, ground: 0.4 } as const;

export type WindowInfo = {
  /** Centre of the pane, in world space. */
  center: Vec3;
  normal: Vec3;
  /** 0 is the ground floor; the belfry is 9. */
  floor: number;
  door: boolean;
};

export type ClockFace = { center: Vec3; normal: Vec3; radius: number };

export type HouseModel = {
  fill: { position: Float32Array; normal: Float32Array; surface: Float32Array; offset: Float32Array };
  glass: { position: Float32Array; normal: Float32Array; window: Float32Array; uv: Float32Array };
  lines: {
    start: Float32Array;
    end: Float32Array;
    offsetStart: Float32Array;
    offsetEnd: Float32Array;
    ink: Float32Array;
    delay: Float32Array;
  };
  windows: WindowInfo[];
  /** Boxes that stand in for the building when finding what the pointer is over. */
  blocks: { min: Vec3; max: Vec3 }[];
  clocks: ClockFace[];
  /** Where the weather vane turns, and how large it is drawn. */
  vane: Vec3;
  vaneSize: number;
  /** Top of the vane. */
  height: number;
  /** Centre of the footprint at ground level, and the radius that holds it. */
  center: Vec3;
  radius: number;
};

// ---------------------------------------------------------------------------
// Vector helpers

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const deg = (d: number) => (d * Math.PI) / 180;

const UP: Vec3 = [0, 1, 0];

/** A wall plane: `o` is its origin at ground level, `u` runs along it to the right seen from outside, `n` faces out. */
type Frame = { o: Vec3; u: Vec3; n: Vec3 };

function frame(o: Vec3, n: Vec3): Frame {
  return { o, u: unit(cross(UP, n)), n };
}

/** A point on a wall plane, `s` along it and `y` up, pushed `d` out from the face. */
function at(f: Frame, s: number, y: number, d = 0): Vec3 {
  return [f.o[0] + f.u[0] * s + f.n[0] * d, y, f.o[2] + f.u[2] * s + f.n[2] * d];
}

/** Small deterministic noise, so the same windows are lit on every load. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Proportions

const EAVE = 13.6;
const PITCH = deg(35);
const PEDIMENT_PITCH = deg(23);
const ROOF_THICKNESS = 0.36;
const OVERHANG = 0.5;
const CORNICE_HEIGHT = 0.6;
const CORNICE_DEPTH = 0.42;
const PLINTH = 0.65;
const STRING_COURSE = 4.25;
const WINDOW_WIDTH = 1.3;
const BAY = 3.2;

/** Sill and head of the windows on each floor. */
const FLOORS = [
  { sill: 1.35, head: 3.45 },
  { sill: 5.0, head: 7.3 },
  { sill: 8.35, head: 10.45 },
  { sill: 11.35, head: 12.75 },
];

/** Where things stand. The front range faces south (+z); the wings run north from it. */
const WING = { outer: 32, inner: 21, back: -24, front: 26.2 };
const MIDDLE = { inner: 9, outer: 21, back: 14, front: 25 };
const CENTER = { half: 9, back: 14, front: 26.6 };
const TOWER = { x: 0, z: 19.5 };
/** The pavilion that stands proud of each wing's outer wall. */
const PAVILION = { z: 0.8, half: 5.5, depth: 0.9 };

type Opening = {
  shape: "rect" | "arch" | "round";
  /** Centre along the wall. */
  s: number;
  /** Bottom edge, or centre for a round opening. */
  y: number;
  /** Width, or diameter for a round opening. */
  w: number;
  /** Height of the straight-sided part. */
  h: number;
  depth?: number;
  floor: number;
  door?: boolean;
  muntins?: boolean;
};

// ---------------------------------------------------------------------------

class Builder {
  readonly fill = { position: [] as number[], normal: [] as number[], surface: [] as number[], offset: [] as number[] };
  readonly glass = { position: [] as number[], normal: [] as number[], window: [] as number[], uv: [] as number[] };
  readonly line = {
    start: [] as number[],
    end: [] as number[],
    offsetStart: [] as number[],
    offsetEnd: [] as number[],
    ink: [] as number[],
  };
  readonly windows: WindowInfo[] = [];

  /** A triangle. The normal comes from the winding, flipped to face `facing` when one is given. */
  tri(a: Vec3, b: Vec3, c: Vec3, surface: number, facing?: Vec3) {
    let n = unit(cross(sub(b, a), sub(c, a)));
    if (facing && dot(n, facing) < 0) n = mul(n, -1);
    for (const p of [a, b, c]) {
      this.fill.position.push(p[0], p[1], p[2]);
      this.fill.normal.push(n[0], n[1], n[2]);
      this.fill.surface.push(surface);
      this.fill.offset.push(0, 0);
    }
  }

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, surface: number, facing?: Vec3) {
    this.tri(a, b, c, surface, facing);
    this.tri(a, c, d, surface, facing);
  }

  seg(a: Vec3, b: Vec3, ink: number = Ink.edge) {
    this.line.start.push(a[0], a[1], a[2]);
    this.line.end.push(b[0], b[1], b[2]);
    this.line.offsetStart.push(0, 0);
    this.line.offsetEnd.push(0, 0);
    this.line.ink.push(ink);
  }

  path(points: Vec3[], ink: number = Ink.edge, closed = false) {
    for (let i = 0; i < points.length - 1; i++) this.seg(points[i], points[i + 1], ink);
    if (closed) this.seg(points[points.length - 1], points[0], ink);
  }

  /** An axis-aligned box with all twelve edges. */
  box(min: Vec3, max: Vec3, surface: number, ink: number = Ink.edge) {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    const p: Vec3[] = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [x0, y1, z1],
    ];
    this.quad(p[4], p[5], p[6], p[7], surface, [0, 1, 0]);
    this.quad(p[3], p[2], p[6], p[7], surface, [0, 0, 1]);
    this.quad(p[0], p[1], p[5], p[4], surface, [0, 0, -1]);
    this.quad(p[1], p[2], p[6], p[5], surface, [1, 0, 0]);
    this.quad(p[0], p[3], p[7], p[4], surface, [-1, 0, 0]);
    this.quad(p[0], p[1], p[2], p[3], surface, [0, -1, 0]);
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    for (const [a, b] of edges) this.seg(p[a], p[b], ink);
  }

  /** A ball, drawn as a disc that always faces the camera. */
  ball(center: Vec3, radius: number, ink: number = Ink.edge, surface: number = Surface.dome, segments = 20) {
    const ring: [number, number][] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      ring.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
    for (let i = 0; i < segments; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % segments];
      for (const off of [[0, 0], a, b] as [number, number][]) {
        this.fill.position.push(center[0], center[1], center[2]);
        this.fill.normal.push(0, 1, 0);
        this.fill.surface.push(surface);
        this.fill.offset.push(off[0], off[1]);
      }
      this.line.start.push(center[0], center[1], center[2]);
      this.line.end.push(center[0], center[1], center[2]);
      this.line.offsetStart.push(a[0], a[1]);
      this.line.offsetEnd.push(b[0], b[1]);
      this.line.ink.push(ink);
    }
  }

  /**
   * A tree, as a model maker builds one: a trunk and a crown of a few balls,
   * each always facing the camera, so the canopy reads round from any side.
   */
  tree(foot: Vec3, radius: number, crown: number, seed: number) {
    this.seg(foot, [foot[0], crown - radius * 0.55, foot[2]], Ink.detail);
    const turn = hash(seed) * Math.PI * 2;
    const clumps: [number, number, number, number][] = [
      [0, 0, 0, 1],
      [0.62, -0.18, 0, 0.68],
      [-0.55, -0.12, 2.1, 0.7],
      [0.15, 0.52, 4.2, 0.62],
    ];
    for (const [d, dy, a, r] of clumps) {
      const angle = turn + a;
      this.ball(
        [foot[0] + Math.cos(angle) * d * radius, crown + dy * radius, foot[2] + Math.sin(angle) * d * radius],
        r * radius,
        Ink.detail,
        Surface.canopy,
        28,
      );
    }
  }

  /**
   * A flat wall with openings cut through it. `contour` is in wall coordinates
   * (along, up). Each opening gets a reveal, a pane and its outline.
   */
  wall(f: Frame, contour: [number, number][], openings: Opening[] = [], surface: number = Surface.wall) {
    const holes = openings.map(outline);
    const faces = ShapeUtils.triangulateShape(
      contour.map(([x, y]) => new Vector2(x, y)),
      holes.map((h) => h.map(([x, y]) => new Vector2(x, y))),
    );
    const all = [...contour, ...holes.flat()];
    for (const [a, b, c] of faces) {
      this.tri(at(f, ...all[a]), at(f, ...all[b]), at(f, ...all[c]), surface, f.n);
    }
    openings.forEach((o, i) => this.opening(f, o, holes[i]));
  }

  private opening(f: Frame, o: Opening, ring: [number, number][]) {
    const depth = o.depth ?? 0.3;
    const front = ring.map(([s, y]) => at(f, s, y));
    const back = ring.map(([s, y]) => at(f, s, y, -depth));
    const n = ring.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // The outline runs anticlockwise, so the opening lies to the left of each edge.
      const es = ring[j][0] - ring[i][0];
      const ey = ring[j][1] - ring[i][1];
      const inward = add(mul(f.u, -ey), mul(UP, es));
      this.quad(front[i], front[j], back[j], back[i], Surface.reveal, inward);
    }

    // The pane, fanned from its centre.
    const index = this.windows.length;
    let cs = 0;
    let cy = 0;
    for (const [s, y] of ring) {
      cs += s / n;
      cy += y / n;
    }
    const centre = at(f, cs, cy, -depth);
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    const minS = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanS = Math.max(...xs) - minS || 1;
    const spanY = Math.max(...ys) - minY || 1;
    const uv = (s: number, y: number) => [(s - minS) / spanS, (y - minY) / spanY];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const pts: [Vec3, number[]][] = [
        [centre, uv(cs, cy)],
        [back[i], uv(...ring[i])],
        [back[j], uv(...ring[j])],
      ];
      for (const [p, t] of pts) {
        this.glass.position.push(p[0], p[1], p[2]);
        this.glass.normal.push(f.n[0], f.n[1], f.n[2]);
        this.glass.window.push(index);
        this.glass.uv.push(t[0], t[1]);
      }
    }
    this.windows.push({ center: centre, normal: f.n, floor: o.floor, door: !!o.door });

    this.path(front, Ink.detail, true);
    this.path(back, Ink.fine, true);

    // Glazing bars: a centre bar and the meeting rail of the sash, or the leaves of a door.
    if (o.muntins !== false && o.shape !== "round") {
      const lift = 0.04 - depth;
      const top = o.shape === "arch" ? o.y + o.h + o.w / 2 : o.y + o.h;
      this.seg(at(f, o.s, o.y, lift), at(f, o.s, o.door ? o.y + o.h : top, lift), Ink.fine);
      const rail = o.door ? o.y + o.h : o.shape === "arch" ? o.y + o.h : o.y + o.h * 0.52;
      this.seg(at(f, o.s - o.w / 2, rail, lift), at(f, o.s + o.w / 2, rail, lift), Ink.fine);
    }
  }

  /**
   * One face of a building, from ground to eave (and up into the gable when
   * `apex` is set), with its outline, plinth and string course.
   */
  facade(f: Frame, s0: number, s1: number, openings: Opening[], apex?: number, bands = true) {
    const contour: [number, number][] = [
      [s0, 0],
      [s1, 0],
      [s1, EAVE],
    ];
    if (apex !== undefined) contour.push([(s0 + s1) / 2, apex]);
    contour.push([s0, EAVE]);
    this.wall(f, contour, openings);
    this.path(
      contour.map(([s, y]) => at(f, s, y)),
      Ink.edge,
      true,
    );
    if (!bands) return;
    for (const y of [PLINTH, STRING_COURSE]) {
      // Break the band where a door runs through it.
      const cuts = openings
        .filter((o) => o.shape !== "round" && o.y < y && o.y + o.h + (o.shape === "arch" ? o.w / 2 : 0) > y)
        .map((o) => [o.s - o.w / 2, o.s + o.w / 2])
        .sort((a, b) => a[0] - b[0]);
      let from = s0;
      for (const [l, r] of cuts) {
        if (l > from) this.seg(at(f, from, y), at(f, l, y), Ink.detail);
        from = r;
      }
      if (from < s1) this.seg(at(f, from, y), at(f, s1, y), Ink.detail);
    }
  }

  /** The projecting band under an eave or across the foot of a pediment. */
  cornice(f: Frame, s0: number, s1: number, y = EAVE) {
    // Run past both ends by the projection, so cornices meet around outside corners.
    const a = at(f, s0 - CORNICE_DEPTH, y - CORNICE_HEIGHT);
    const b = at(f, s1 + CORNICE_DEPTH, y, CORNICE_DEPTH);
    this.box(
      [Math.min(a[0], b[0]), a[1], Math.min(a[2], b[2])],
      [Math.max(a[0], b[0]), b[1], Math.max(a[2], b[2])],
      Surface.trim,
    );
  }
}

function outline(o: Opening): [number, number][] {
  if (o.shape === "round") {
    const r = o.w / 2;
    return Array.from({ length: 20 }, (_, i) => {
      const a = (i / 20) * Math.PI * 2;
      return [o.s + Math.cos(a) * r, o.y + Math.sin(a) * r] as [number, number];
    });
  }
  const l = o.s - o.w / 2;
  const r = o.s + o.w / 2;
  const top = o.y + o.h;
  if (o.shape === "rect") {
    return [
      [l, o.y],
      [r, o.y],
      [r, top],
      [l, top],
    ];
  }
  const ring: [number, number][] = [
    [l, o.y],
    [r, o.y],
  ];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    ring.push([o.s + (Math.cos(a) * o.w) / 2, top + (Math.sin(a) * o.w) / 2]);
  }
  return ring;
}

// ---------------------------------------------------------------------------
// Roofs

type Roof = {
  /** Height of the roof's upper surface `s` across from the ridge. */
  top: (s: number) => number;
  ridge: number;
};

/**
 * A gable roof as a slab with thickness, so its edges read as fascia and
 * raking cornice. The ridge runs from `start` along `axis` for `length`;
 * `half` is the half width of the walls under it.
 */
function gableRoof(
  b: Builder,
  start: Vec3,
  axis: Vec3,
  length: number,
  half: number,
  pitch: number,
  overhang = { start: OVERHANG, end: OVERHANG, sides: OVERHANG },
): Roof {
  const across = unit(cross(UP, axis));
  const tan = Math.tan(pitch);
  const thick = ROOF_THICKNESS / Math.cos(pitch);
  const rise = half * tan;
  const sides = overhang.sides;

  // Cross-section, as (across, up).
  const section: Record<string, [number, number]> = {
    wb: [-half - sides, EAVE - sides * tan],
    wt: [-half - sides, EAVE - sides * tan + thick],
    rt: [0, EAVE + rise + thick],
    rb: [0, EAVE + rise],
    et: [half + sides, EAVE - sides * tan + thick],
    eb: [half + sides, EAVE - sides * tan],
  };
  const t0 = -overhang.start;
  const t1 = length + overhang.end;
  const point = (key: string, t: number): Vec3 => {
    const [s, y] = section[key];
    return [start[0] + axis[0] * t + across[0] * s, y, start[2] + axis[2] * t + across[2] * s];
  };

  b.quad(point("wt", t0), point("wt", t1), point("rt", t1), point("rt", t0), Surface.roof, UP);
  b.quad(point("rt", t0), point("rt", t1), point("et", t1), point("et", t0), Surface.roof, UP);
  b.quad(point("wb", t0), point("wb", t1), point("wt", t1), point("wt", t0), Surface.trim, mul(across, -1));
  b.quad(point("eb", t0), point("eb", t1), point("et", t1), point("et", t0), Surface.trim, across);
  b.quad(point("wb", t0), point("wb", t1), point("rb", t1), point("rb", t0), Surface.trim, mul(UP, -1));
  b.quad(point("rb", t0), point("rb", t1), point("eb", t1), point("eb", t0), Surface.trim, mul(UP, -1));
  for (const [t, facing] of [
    [t0, mul(axis, -1)],
    [t1, axis],
  ] as [number, Vec3][]) {
    b.quad(point("wb", t), point("wt", t), point("rt", t), point("rb", t), Surface.trim, facing);
    b.quad(point("rb", t), point("rt", t), point("et", t), point("eb", t), Surface.trim, facing);
    b.path(["wb", "wt", "rt", "et", "eb", "rb"].map((k) => point(k, t)), Ink.edge, true);
  }
  for (const key of ["wb", "wt", "rt", "et", "eb"]) b.seg(point(key, t0), point(key, t1), Ink.edge);

  return {
    top: (s: number) => EAVE + (half - Math.abs(s)) * tan + thick,
    ridge: EAVE + rise + thick,
  };
}

/**
 * A box that rises through a gable roof (a chimney, the tower's base), with
 * the line where it meets the roof. `s` is measured across the ridge.
 */
function throughRoof(
  b: Builder,
  roof: Roof,
  ridgeAlongZ: boolean,
  ridgeLine: number,
  centre: { s: number; t: number },
  half: { s: number; t: number },
  top: number,
  surface: number = Surface.wall,
) {
  const toWorld = (s: number, y: number, t: number): Vec3 =>
    ridgeAlongZ ? [ridgeLine + s, y, t] : [t, y, ridgeLine + s];
  const s0 = centre.s - half.s;
  const s1 = centre.s + half.s;
  const t0 = centre.t - half.t;
  const t1 = centre.t + half.t;
  const base = Math.min(roof.top(s0), roof.top(s1)) - 0.5;
  const a = toWorld(s0, base, t0);
  const c = toWorld(s1, top, t1);
  b.box([Math.min(a[0], c[0]), base, Math.min(a[2], c[2])], [Math.max(a[0], c[0]), top, Math.max(a[2], c[2])], surface);

  // Where the box meets the roof: a ridge-shaped line on the faces across the
  // ridge, level lines on the faces along it.
  const across = (t: number) => {
    const pts: Vec3[] = [toWorld(s0, roof.top(s0), t)];
    if (s0 < 0 && s1 > 0) pts.push(toWorld(0, roof.top(0), t));
    pts.push(toWorld(s1, roof.top(s1), t));
    b.path(pts, Ink.edge);
  };
  across(t0);
  across(t1);
  b.seg(toWorld(s0, roof.top(s0), t0), toWorld(s0, roof.top(s0), t1), Ink.edge);
  b.seg(toWorld(s1, roof.top(s1), t0), toWorld(s1, roof.top(s1), t1), Ink.edge);
}

/** A chimney stack with its cap, straddling a ridge that runs along z at `x`. */
function chimney(b: Builder, roof: Roof, x: number, z: number, along = 1.3, across = 2.8) {
  const top = roof.ridge + 3.1;
  throughRoof(b, roof, true, x, { s: 0, t: z }, { s: across / 2, t: along / 2 }, top);
  b.box([x - across / 2 - 0.2, top, z - along / 2 - 0.2], [x + across / 2 + 0.2, top + 0.35, z + along / 2 + 0.2], Surface.trim);
  // Two flue pots.
  for (const dx of [-across / 4, across / 4]) {
    b.box([x + dx - 0.22, top + 0.35, z - 0.22], [x + dx + 0.22, top + 0.95, z + 0.22], Surface.trim, Ink.detail);
  }
}

// ---------------------------------------------------------------------------
// Windows

function bays(from: number, to: number, skip: (s: number) => boolean = () => false) {
  const out: number[] = [];
  for (let s = from; s <= to + 1e-6; s += BAY) if (!skip(s)) out.push(s);
  return out;
}

function grid(
  columns: number[],
  opts: { arched?: boolean; door?: number; floors?: number[]; flip?: boolean } = {},
): Opening[] {
  const out: Opening[] = [];
  const floors = opts.floors ?? [0, 1, 2, 3];
  for (const floor of floors) {
    const { sill, head } = FLOORS[floor];
    for (const s0 of columns) {
      const s = opts.flip ? -s0 : s0;
      if (floor === 0 && opts.door !== undefined && Math.abs(s0 - opts.door) < 0.01) {
        out.push({ shape: "arch", s, y: 0, w: 2.3, h: 2.85, depth: 0.55, floor, door: true });
        continue;
      }
      if (floor === 1 && opts.arched) {
        const w = WINDOW_WIDTH;
        out.push({ shape: "arch", s, y: sill, w, h: head - sill - w / 2 + 0.25, floor });
        continue;
      }
      out.push({ shape: "rect", s, y: sill, w: WINDOW_WIDTH, h: head - sill, floor });
    }
  }
  return out;
}

function oculus(s: number, y: number, w = 1.5): Opening {
  return { shape: "round", s, y, w, h: 0, depth: 0.25, floor: 4, muntins: false };
}

// ---------------------------------------------------------------------------
// The house

export function buildHouse(): HouseModel {
  const b = new Builder();
  const pitchRise = (half: number, pitch = PITCH) => half * Math.tan(pitch);

  // --- Wings: long ranges running north from the street front.
  for (const side of [-1, 1]) {
    const xo = side * WING.outer;
    const xi = side * WING.inner;
    const xc = side * ((WING.outer + WING.inner) / 2);
    const half = (WING.outer - WING.inner) / 2;
    const apex = EAVE + pitchRise(half);

    // Street front, a pediment. Wall coordinates run left to right seen from outside.
    const front = frame([xc, 0, WING.front], [0, 0, 1]);
    b.facade(front, -half, half, [...grid([-BAY, 0, BAY]), oculus(0, EAVE + 1.45)], apex);
    b.cornice(front, -half, half);

    // North end, a pediment over the courtyard gate.
    const back = frame([xc, 0, WING.back], [0, 0, -1]);
    b.facade(back, -half, half, [...grid([-BAY, 0, BAY]), oculus(0, EAVE + 1.45)], apex);
    b.cornice(back, -half, half);

    // Outer wall, with a pedimented pavilion in the middle.
    const outer = frame([xo, 0, 0], [side, 0, 0]);
    const pavFrom = PAVILION.z - PAVILION.half;
    const pavTo = PAVILION.z + PAVILION.half;
    // Along this wall, s runs north for the east wing and south for the west wing.
    const sOf = (z: number) => -side * z;
    const outerBays = bays(WING.back + 2.4, WING.front - 2.4, (z) => z > pavFrom - 1.2 && z < pavTo + 1.2);
    b.facade(
      outer,
      Math.min(sOf(WING.back), sOf(WING.front)),
      Math.max(sOf(WING.back), sOf(WING.front)),
      grid(outerBays.map(sOf)),
    );
    b.cornice(outer, Math.min(sOf(WING.back), sOf(WING.front)), Math.max(sOf(WING.back), sOf(WING.front)));

    const xp = xo + side * PAVILION.depth;
    const pav = frame([xp, 0, PAVILION.z], [side, 0, 0]);
    b.facade(
      pav,
      -PAVILION.half,
      PAVILION.half,
      [...grid([-BAY, 0, BAY].map((z) => z)), oculus(0, EAVE + 1.45)],
      EAVE + pitchRise(PAVILION.half),
    );
    b.cornice(pav, -PAVILION.half, PAVILION.half);
    for (const [z, nz] of [
      [pavFrom, -1],
      [pavTo, 1],
    ] as [number, number][]) {
      const ret = frame([xo + (side * PAVILION.depth) / 2, 0, z], [0, 0, nz]);
      b.facade(ret, -PAVILION.depth / 2, PAVILION.depth / 2, []);
      b.cornice(ret, -PAVILION.depth / 2, PAVILION.depth / 2);
    }
    gableRoof(b, [xc, 0, PAVILION.z], [side, 0, 0], Math.abs(xp - xc), PAVILION.half, PITCH, {
      start: 0,
      end: OVERHANG,
      sides: OVERHANG,
    });
    // Valleys where the pavilion roof dies into the wing roof.
    const thick = ROOF_THICKNESS / Math.cos(PITCH);
    for (const dz of [-PAVILION.half, PAVILION.half]) {
      b.seg([xo, EAVE + thick, PAVILION.z + dz], [xc, EAVE + pitchRise(half) + thick, PAVILION.z], Ink.edge);
    }

    // Courtyard wall, and the short return beside the middle block's front.
    const inner = frame([xi, 0, 0], [-side, 0, 0]);
    const innerBays = bays(WING.back + 2.4, MIDDLE.back - 3.2);
    const doorZ = innerBays[Math.floor(innerBays.length / 2)];
    b.facade(
      inner,
      Math.min(side * WING.back, side * MIDDLE.back),
      Math.max(side * WING.back, side * MIDDLE.back),
      grid(innerBays.map((z) => side * z), { door: side * doorZ }),
    );
    b.cornice(inner, Math.min(side * WING.back, side * MIDDLE.back), Math.max(side * WING.back, side * MIDDLE.back));
    const ret = frame([xi, 0, 0], [-side, 0, 0]);
    b.facade(ret, Math.min(side * MIDDLE.front, side * WING.front), Math.max(side * MIDDLE.front, side * WING.front), []);
    b.cornice(ret, Math.min(side * MIDDLE.front, side * WING.front), Math.max(side * MIDDLE.front, side * WING.front));

    const roof = gableRoof(b, [xc, 0, WING.back], [0, 0, 1], WING.front - WING.back, half, PITCH);
    for (const z of [WING.back + 1.5, -9.6, 11.4]) chimney(b, roof, xc, z);
  }

  // --- Middle blocks of the street range, between the wings and the centre.
  for (const side of [-1, 1]) {
    const xc = side * ((MIDDLE.inner + MIDDLE.outer) / 2);
    const half = (MIDDLE.outer - MIDDLE.inner) / 2;
    const apex = EAVE + pitchRise(half);
    const front = frame([xc, 0, MIDDLE.front], [0, 0, 1]);
    b.facade(front, -half, half, [...grid([-3.4, 0, 3.4]), oculus(0, EAVE + 1.55, 1.3)], apex);
    b.cornice(front, -half, half);
    const back = frame([xc, 0, MIDDLE.back], [0, 0, -1]);
    b.facade(back, -half, half, [...grid([-3.4, 0, 3.4]), oculus(0, EAVE + 1.55, 1.3)], apex);
    b.cornice(back, -half, half);
    const roof = gableRoof(b, [xc, 0, MIDDLE.back], [0, 0, 1], MIDDLE.front - MIDDLE.back, half, PITCH);
    chimney(b, roof, xc, MIDDLE.back + 1.4, 1.2, 2.6);
    // Valleys against the wing and the centre block.
    const thick = ROOF_THICKNESS / Math.cos(PITCH);
    b.seg([side * MIDDLE.outer, EAVE + thick, MIDDLE.back], [side * MIDDLE.outer, EAVE + thick, MIDDLE.front], Ink.edge);
    b.seg([side * MIDDLE.inner, EAVE + thick, MIDDLE.back], [side * MIDDLE.inner, EAVE + thick, MIDDLE.front], Ink.edge);
  }

  // --- The centre block, with the entrance and the tower.
  const centreRise = pitchRise(CENTER.half, PEDIMENT_PITCH);
  const centreColumns = [-6.6, -3.3, 0, 3.3, 6.6];
  const front = frame([0, 0, CENTER.front], [0, 0, 1]);
  b.facade(
    front,
    -CENTER.half,
    CENTER.half,
    [...grid(centreColumns, { arched: true, door: 0 }), oculus(0, EAVE + 1.4, 1.7)],
    EAVE + centreRise,
  );
  b.cornice(front, -CENTER.half, CENTER.half);
  const back = frame([0, 0, CENTER.back], [0, 0, -1]);
  b.facade(
    back,
    -CENTER.half,
    CENTER.half,
    [...grid(centreColumns, { arched: true, door: 0 }), oculus(0, EAVE + 1.4, 1.7)],
    EAVE + centreRise,
  );
  b.cornice(back, -CENTER.half, CENTER.half);
  for (const side of [-1, 1]) {
    const ret = frame([side * CENTER.half, 0, 0], [side, 0, 0]);
    const a = -side * MIDDLE.front;
    const c = -side * CENTER.front;
    b.facade(ret, Math.min(a, c), Math.max(a, c), []);
    b.cornice(ret, Math.min(a, c), Math.max(a, c));
  }
  const centreRoof = gableRoof(
    b,
    [0, 0, CENTER.back],
    [0, 0, 1],
    CENTER.front - CENTER.back,
    CENTER.half,
    PEDIMENT_PITCH,
  );

  // Entrance steps.
  for (let i = 0; i < 3; i++) {
    const w = 2.3 - i * 0.35;
    const d = 1.5 - i * 0.45;
    b.box([-w, i * 0.22, CENTER.front], [w, (i + 1) * 0.22, CENTER.front + d], Surface.stone, Ink.detail);
  }

  const tower = buildTower(b, centreRoof);

  // --- Courtyard: a low wall and gate across the open north side, and paths.
  const wallH = 1.5;
  const gateHalf = 2.6;
  for (const side of [-1, 1]) {
    const x0 = side * gateHalf;
    const x1 = side * WING.inner;
    b.box([Math.min(x0, x1), 0, WING.back - 0.35], [Math.max(x0, x1), wallH, WING.back + 0.35], Surface.stone, Ink.edge);
    b.box(
      [Math.min(x0, x1) - 0.08, wallH, WING.back - 0.45],
      [Math.max(x0, x1) + 0.08, wallH + 0.2, WING.back + 0.45],
      Surface.trim,
      Ink.detail,
    );
    // Gate piers with ball finials.
    const px = side * (gateHalf + 0.5);
    b.box([px - 0.55, 0, WING.back - 0.55], [px + 0.55, 3.0, WING.back + 0.55], Surface.stone);
    b.box([px - 0.7, 3.0, WING.back - 0.7], [px + 0.7, 3.3, WING.back + 0.7], Surface.trim);
    b.ball([px, 3.75, WING.back], 0.45);
  }
  // Iron gates: just their bars.
  for (let i = 0; i <= 12; i++) {
    const x = -gateHalf + (i / 12) * gateHalf * 2;
    const h = 2.3 + Math.sin((i / 12) * Math.PI) * 0.45;
    b.seg([x, 0, WING.back], [x, h, WING.back], Ink.fine);
  }
  b.seg([-gateHalf, 0.35, WING.back], [gateHalf, 0.35, WING.back], Ink.fine);
  b.seg([-gateHalf, 2.1, WING.back], [gateHalf, 2.1, WING.back], Ink.fine);

  // Paths: from the gate to the centre door, and across between the wing doors.
  const y = 0.02;
  const pw = 1.4;
  b.seg([-pw, y, WING.back], [-pw, y, CENTER.back - 0.05], Ink.ground);
  b.seg([pw, y, WING.back], [pw, y, CENTER.back - 0.05], Ink.ground);
  const cz = -5.6;
  b.seg([-WING.inner, y, cz - pw], [-pw, y, cz - pw], Ink.ground);
  b.seg([pw, y, cz - pw], [WING.inner, y, cz - pw], Ink.ground);
  b.seg([-WING.inner, y, cz + pw], [-pw, y, cz + pw], Ink.ground);
  b.seg([pw, y, cz + pw], [WING.inner, y, cz + pw], Ink.ground);

  // Courtyard trees: on the back lawns and either side of the gate, clear of
  // the tower from the resting view.
  const trees: [number, number, number][] = [
    [-11.5, -14.5, 2.7],
    [11.5, -13.5, 2.8],
    [-6.5, -20.6, 2.1],
    [6.8, -20.2, 2.2],
  ];
  trees.forEach(([x, z, r], i) => b.tree([x, 0, z], r, 6.4 + r, i + 1));

  // Picking volumes.
  const blocks: HouseModel["blocks"] = [
    { min: [-WING.outer, 0, WING.back], max: [-WING.inner, EAVE + 4, WING.front] },
    { min: [WING.inner, 0, WING.back], max: [WING.outer, EAVE + 4, WING.front] },
    { min: [-WING.inner, 0, MIDDLE.back], max: [WING.inner, EAVE + 4, CENTER.front] },
    { min: [-WING.outer - PAVILION.depth, 0, PAVILION.z - PAVILION.half], max: [-WING.outer, EAVE + 3, PAVILION.z + PAVILION.half] },
    { min: [WING.outer, 0, PAVILION.z - PAVILION.half], max: [WING.outer + PAVILION.depth, EAVE + 3, PAVILION.z + PAVILION.half] },
    { min: [TOWER.x - 3.6, EAVE, TOWER.z - 3.6], max: [TOWER.x + 3.6, 36, TOWER.z + 3.6] },
  ];

  return finish(b, blocks, tower);
}

// ---------------------------------------------------------------------------
// The tower

/** The cupola is drawn a little larger than life, so it carries the composition as it does in the drawing. */
const TOWER_SCALE = 1.22;

type Tower = { clocks: ClockFace[]; vane: Vec3; vaneSize: number; height: number };

function buildTower(b: Builder, roof: Roof): Tower {
  const { x, z } = TOWER;
  const S = TOWER_SCALE;

  // Base: a short block rising out of the centre block's roof, with a cornice.
  const baseHalf = 3.4;
  const baseTop = roof.ridge + 1.9;
  throughRoof(b, roof, true, x, { s: 0, t: z }, { s: baseHalf, t: baseHalf }, baseTop);
  const slab = baseHalf + 0.38;
  b.box([x - slab, baseTop, z - slab], [x + slab, baseTop + 0.4, z + slab], Surface.trim);

  // Balustrade around the clock stage.
  const deck = baseTop + 0.4;
  const railY = deck + 1.0;
  const rh = baseHalf + 0.1;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]) {
    const px = x + sx * rh;
    const pz = z + sz * rh;
    b.box([px - 0.2, deck, pz - 0.2], [px + 0.2, railY + 0.25, pz + 0.2], Surface.trim, Ink.detail);
  }
  for (const s of [-1, 1]) {
    b.box([x - rh, railY, z + s * rh - 0.14], [x + rh, railY + 0.22, z + s * rh + 0.14], Surface.trim, Ink.detail);
    b.box([x + s * rh - 0.14, railY, z - rh], [x + s * rh + 0.14, railY + 0.22, z + rh], Surface.trim, Ink.detail);
    const n = 24;
    for (let i = 1; i < n; i++) {
      const t = -rh + (i / n) * rh * 2;
      if (Math.abs(t) < 0.3) continue;
      b.seg([x + t, deck, z + s * rh], [x + t, railY, z + s * rh], Ink.fine);
      b.seg([x + s * rh, deck, z + t], [x + s * rh, railY, z + t], Ink.fine);
    }
  }

  // Clock stage, with corner pilasters and a clock on each face.
  const ch = 2.3 * S;
  const clockTop = deck + 4.0 * S;
  const clockCentre = deck + 2.05 * S;
  b.box([x - ch, deck, z - ch], [x + ch, clockTop, z + ch], Surface.wall);
  const pw = 0.42 * S;
  const pp = 0.1 * S;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const cx = x + sx * ch;
    const cz = z + sz * ch;
    b.box(
      [Math.min(cx, cx - sx * pw) - (sx < 0 ? pp : 0), deck, Math.min(cz, cz - sz * pw) - (sz < 0 ? pp : 0)],
      [Math.max(cx, cx - sx * pw) + (sx > 0 ? pp : 0), clockTop, Math.max(cz, cz - sz * pw) + (sz > 0 ? pp : 0)],
      Surface.trim,
      Ink.detail,
    );
  }
  const clocks: ClockFace[] = [];
  const dial = 0.86 * S;
  for (const n of [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
  ] as Vec3[]) {
    const f = frame([x + n[0] * (ch + 0.02), 0, z + n[2] * (ch + 0.02)], n);
    for (const [r, ink] of [
      [1.05 * S, Ink.edge],
      [dial, Ink.detail],
    ]) {
      const ring: Vec3[] = [];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        ring.push(at(f, Math.cos(a) * r, clockCentre + Math.sin(a) * r));
      }
      b.path(ring, ink, true);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = (i % 3 === 0 ? 0.62 : 0.72) * S;
      b.seg(
        at(f, Math.cos(a) * r0, clockCentre + Math.sin(a) * r0),
        at(f, Math.cos(a) * 0.82 * S, clockCentre + Math.sin(a) * 0.82 * S),
        Ink.fine,
      );
    }
    clocks.push({ center: at(f, 0, clockCentre, 0.02), normal: n, radius: dial });
  }
  const cap = ch + 0.35 * S;
  b.box([x - cap, clockTop, z - cap], [x + cap, clockTop + 0.4 * S, z + cap], Surface.trim);

  // Flared skirt under the belfry.
  const ap = 1.6 * S;
  const skirtFoot = clockTop + 0.4 * S;
  const belfryFrom = skirtFoot + 1.2 * S;
  const belfryTo = belfryFrom + 3.5 * S;
  const skirt: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    skirt.push([ap + 0.75 * S * Math.pow(1 - t, 2.2), skirtFoot + t * (belfryFrom - skirtFoot)]);
  }
  lathe8(b, x, z, skirt, Surface.roof);

  // Belfry: an octagon with arched openings on the four main faces.
  const faceHalf = ap * Math.tan(deg(22.5));
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const n: Vec3 = [Math.sin(a), 0, Math.cos(a)];
    const f = frame([x + n[0] * ap, 0, z + n[2] * ap], n);
    const contour: [number, number][] = [
      [-faceHalf, belfryFrom],
      [faceHalf, belfryFrom],
      [faceHalf, belfryTo],
      [-faceHalf, belfryTo],
    ];
    const w = 0.78 * S;
    const opening: Opening[] =
      k % 2 === 0
        ? [{ shape: "arch", s: 0, y: belfryFrom + 0.45 * S, w, h: 1.95 * S, depth: 0.32 * S, floor: 9, muntins: false }]
        : [];
    b.wall(f, contour, opening);
    b.path(contour.map(([s, y]) => at(f, s, y)), Ink.edge, true);
  }
  octagonSlab(b, x, z, ap + 0.35 * S, belfryTo, belfryTo + 0.32 * S);
  octagonSlab(b, x, z, ap + 0.2 * S, belfryTo + 0.32 * S, belfryTo + 0.56 * S);

  // Onion dome.
  const d0 = belfryTo + 0.56 * S;
  const dome: [number, number][] = (
    [
      [1.62, 0],
      [1.8, 0.45],
      [1.76, 0.95],
      [1.48, 1.45],
      [1.05, 1.95],
      [0.95, 2.38],
      [0.5, 2.75],
      [0.22, 3.08],
      [0.1, 3.38],
    ] as [number, number][]
  ).map(([r, y]) => [r * S, d0 + y * S]);
  lathe8(b, x, z, dome, Surface.dome);

  // Finial: balls on a spire, the compass arms, and the vane above them.
  const foot = d0 + 3.38 * S;
  b.ball([x, foot + 0.3 * S, z], 0.32 * S);
  b.seg([x, foot + 0.6 * S, z], [x, foot + 3.0 * S, z], Ink.edge);
  b.ball([x, foot + 1.1 * S, z], 0.18 * S);
  const arms = foot + 1.7 * S;
  b.seg([x - 0.75 * S, arms, z], [x + 0.75 * S, arms, z], Ink.detail);
  b.seg([x, arms, z - 0.75 * S], [x, arms, z + 0.75 * S], Ink.detail);
  b.ball([x, foot + 3.08 * S, z], 0.09 * S);

  return { clocks, vane: [x, foot + 2.25 * S, z], vaneSize: S, height: foot + 3.2 * S };
}

/** An eight-sided solid of revolution. `profile` gives (apothem, height) pairs from the bottom up. */
function lathe8(b: Builder, x: number, z: number, profile: [number, number][], surface: number) {
  const corner = (r: number, k: number, y: number): Vec3 => {
    const a = ((k + 0.5) * Math.PI) / 4;
    const rc = r / Math.cos(deg(22.5));
    return [x + Math.sin(a) * rc, y, z + Math.cos(a) * rc];
  };
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[i + 1];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const out: Vec3 = [Math.sin(a), 0, Math.cos(a)];
      b.quad(corner(r0, k - 1, y0), corner(r0, k, y0), corner(r1, k, y1), corner(r1, k - 1, y1), surface, add(out, [0, 0.3, 0]));
    }
  }
  for (let k = 0; k < 8; k++) {
    b.path(
      profile.map(([r, y]) => corner(r, k, y)),
      Ink.edge,
    );
  }
  for (const [r, y] of [profile[0]]) {
    b.path(
      Array.from({ length: 8 }, (_, k) => corner(r, k, y)),
      Ink.edge,
      true,
    );
  }
}

function octagonSlab(b: Builder, x: number, z: number, apothem: number, y0: number, y1: number) {
  lathe8(
    b,
    x,
    z,
    [
      [apothem, y0],
      [apothem, y1],
    ],
    Surface.trim,
  );
  const corner = (k: number, y: number): Vec3 => {
    const a = ((k + 0.5) * Math.PI) / 4;
    const rc = apothem / Math.cos(deg(22.5));
    return [x + Math.sin(a) * rc, y, z + Math.cos(a) * rc];
  };
  const top = Array.from({ length: 8 }, (_, k) => corner(k, y1));
  b.path(top, Ink.edge, true);
  for (let k = 1; k < 7; k++) b.tri(top[0], top[k], top[k + 1], Surface.trim, UP);
}

// ---------------------------------------------------------------------------

function finish(b: Builder, blocks: HouseModel["blocks"], tower: Tower): HouseModel {
  const height = tower.height;
  const count = b.line.ink.length;
  const start = new Float32Array(b.line.start);
  const end = new Float32Array(b.line.end);
  const offsetStart = new Float32Array(b.line.offsetStart);
  const offsetEnd = new Float32Array(b.line.offsetEnd);
  const delay = new Float32Array(count);

  // Each line draws itself from its lower end. Lines start in order of height,
  // sweeping back from the street front, so the drawing builds up like a sketch.
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const i2 = i * 2;
    if (start[i3 + 1] > end[i3 + 1] + 1e-4) {
      for (let k = 0; k < 3; k++) {
        const t = start[i3 + k];
        start[i3 + k] = end[i3 + k];
        end[i3 + k] = t;
      }
      for (let k = 0; k < 2; k++) {
        const t = offsetStart[i2 + k];
        offsetStart[i2 + k] = offsetEnd[i2 + k];
        offsetEnd[i2 + k] = t;
      }
    }
    const y = start[i3 + 1];
    const sweep = (WING.front - (start[i3 + 2] + end[i3 + 2]) / 2) / (WING.front - WING.back);
    // Outlines first, then the windows inside them, then the finest detail.
    const ink = b.line.ink[i];
    const lag = ink >= Ink.edge ? 0 : ink >= Ink.detail ? 0.09 : 0.15;
    delay[i] = Math.min(0.84, 0.02 + (y / height) * 0.6 + sweep * 0.08 + lag + hash(i) * 0.015);
  }

  return {
    fill: {
      position: new Float32Array(b.fill.position),
      normal: new Float32Array(b.fill.normal),
      surface: new Float32Array(b.fill.surface),
      offset: new Float32Array(b.fill.offset),
    },
    glass: {
      position: new Float32Array(b.glass.position),
      normal: new Float32Array(b.glass.normal),
      window: new Float32Array(b.glass.window),
      uv: new Float32Array(b.glass.uv),
    },
    lines: { start, end, offsetStart, offsetEnd, ink: new Float32Array(b.line.ink), delay },
    windows: b.windows,
    blocks,
    clocks: tower.clocks,
    vane: tower.vane,
    vaneSize: tower.vaneSize,
    height,
    center: [0, 0, (WING.front + WING.back) / 2],
    radius: Math.hypot(WING.outer + PAVILION.depth, (WING.front - WING.back) / 2),
  };
}
