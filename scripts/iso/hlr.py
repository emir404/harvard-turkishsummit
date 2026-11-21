"""Hidden-line renderer for the isometric drawings.

Takes solid parts (polygon meshes) and wires (polylines), and returns the
visible lines as 2D polylines in the hero's true isometric projection:
azimuth 45 deg, elevation atan(1/sqrt 2), y up, orthographic.

1. Candidate lines: per part, silhouettes (front/back-facing neighbours),
   boundaries and creases; the lines where parts cut into each other; wires.
2. Visibility: points along each candidate, spaced finely on screen, are
   tested with a ray towards the camera against every occluding face (a
   BVH); the switches between visible and hidden are refined by bisection.
3. Clean-up in 2D: collinear overlaps are merged (the stronger ink wins),
   segments are chained into polylines and simplified.

Ink classes follow the hero: 0 edge, 1 detail, 2 fine, 3 ground.
"""
import math
from collections import defaultdict

from mathutils import Vector
from mathutils import geometry as mg
from mathutils.bvhtree import BVHTree

from geom import centroid, newell

C = Vector((1.0, 1.0, 1.0)).normalized()  # towards the camera
RIGHT = Vector((1.0, 0.0, -1.0)).normalized()
UP = Vector((-1.0, 2.0, -1.0)).normalized()
ZERO = Vector((0.0, 0.0, 0.0))
# The hero's light: from the upper left of the view (scene.ts: right*-0.62 + up*0.62 + forward*-0.48).
LIGHT = (RIGHT * -0.62 + UP * 0.62 + C * 0.48).normalized()

# Surface brightness before shading, by material. With the hero's Lambert term
# (0.62 + 0.75 * lit) and the step mapping below, a wall lands on step 2 (its
# side away from the light), 4 (towards it) and 6 (its top).
MATERIALS = {
    "wall": 1.0,
    "stone": 0.97,
    "roof": 1.04,
    "metal": 0.9,
    "dark": 0.62,
    "wood": 0.82,
    "light": 1.15,  # cloth, paper, white things
    "ground": 0.84,
    "plinth": 0.9,
    "foliage": 0.68,
    "water": 0.42,
    "glass": 0.3,
    "reveal": 0.36,
    "lamp": 1.1,
}
TONE_A, TONE_S = -2.22, 6.8


def shade(base, n):
    """Tone step 0-7 for a face of brightness `base` with normal n (turned to face the camera)."""
    if n.dot(C) < 0:
        n = -n
    b = base * (0.62 + 0.75 * max(n.dot(LIGHT), 0.0))
    return int(max(0, min(7, round(TONE_A + TONE_S * b))))


def proj(p):
    """World point -> projected (x right, y up), in world units."""
    return (p.dot(RIGHT), p.dot(UP))


class Part:
    """A solid (or two-sided surface). `ink` forces its lines to a weaker class.

    `sil=False` leaves out silhouettes traced along mesh edges (creases and
    boundaries stay): for curved surfaces whose exact outline is drawn as wires
    instead, since a silhouette following mesh edges zig-zags on them.

    Fills: `mat` picks the brightness (MATERIALS); `tone` fixes one step for
    the whole part; `flat` gives the whole part one step, shaded as if it faced
    the camera (spheres, foliage). `light` makes faces that can be lit: one
    `s` for the whole part, or a list with an `s` (or None) per face;
    `light_group` (a list per face) joins faces into one light. `region=False`
    keeps the part's lines out of the region map (they still draw)."""

    def __init__(self, mesh, ink=None, crease=(15.0, 35.0), lines=True, occlude=True, intersect=True, sil=True,
                 mat="wall", tone=None, flat=False, radial=None, light=None, light_group=None, region=True, draw=True, name=""):
        self.mesh = mesh
        self.ink = ink
        self.crease = crease
        self.lines = lines
        self.occlude = occlude
        self.intersect = intersect and occlude
        self.sil = sil
        self.mat = mat
        self.tone = tone
        self.flat = flat
        self.radial = radial  # an axis: steep faces shade as a cylinder round it, in clean vertical bands
        self.light = light
        self.light_group = light_group
        self.region = region
        self.draw = draw  # False: its edges only bound fills (window panes too small to outline)
        self.name = name
        self._tones = None

    def face_tones(self):
        if self._tones is None:
            base = MATERIALS[self.mat]
            if self.tone is not None:
                self._tones = [self.tone] * len(self.mesh.faces)
            elif self.flat:
                self._tones = [shade(base, C)] * len(self.mesh.faces)
            else:
                tones = []
                for f in self.mesh.faces:
                    n = newell([self.mesh.verts[i] for i in f])
                    if self.radial is not None:
                        u = self.radial
                        if abs(n.dot(u)) < 0.85:
                            n = (n - u * n.dot(u)).normalized()
                    tones.append(shade(base, n))
                self._tones = tones
        return self._tones

    def light_of(self, fi):
        if self.light is None:
            return None
        if isinstance(self.light, (int, float)):
            return float(self.light)
        return self.light[fi]

    def group_of(self, fi):
        return self.light_group[fi] if self.light_group is not None else 0


class Wire:
    """A polyline drawn where it is not hidden. Occludes nothing. `keep(p)` can veto points.

    `region=True` makes it bound fills too: for exact outlines drawn as wires
    (spheres, domes, lathes), which are the only lines round those faces."""

    def __init__(self, points, k=0, closed=False, keep=None, region=False, name=""):
        self.points = [Vector(p) for p in points]
        self.k = k
        self.closed = closed
        self.keep = keep
        self.region = region
        self.name = name


# ---------------------------------------------------------------------------
# Candidates


def _tris(mesh):
    out = []
    for f in mesh.faces:
        for i in range(1, len(f) - 1):
            out.append((f[0], f[i], f[i + 1]))
    return out


def feature_edges(part):
    """Drawn edges as (a, b, k, offset); edges with k = -1 are splitters: not drawn, but where the
    tone of the surface changes, so the fills can follow it."""
    m = part.mesh
    V = m.verts
    normals, centers = [], []
    for f in m.faces:
        pts = [V[i] for i in f]
        normals.append(newell(pts))
        centers.append(centroid(pts))
    tones = part.face_tones()
    edge_faces = defaultdict(list)
    for fi, f in enumerate(m.faces):
        n = len(f)
        for i in range(n):
            a, b = f[i], f[(i + 1) % n]
            edge_faces[(a, b) if a < b else (b, a)].append(fi)
    lo, hi = part.crease
    out = []
    for (a, b), fs in edge_faces.items():
        pa, pb = V[a], V[b]
        if (pb - pa).length < 1e-9:
            continue
        if len(fs) == 1:
            n1 = normals[fs[0]]
            off = (pb - pa).normalized().cross(n1)
            if off.dot((pa + pb) / 2 - centers[fs[0]]) < 0:
                off = -off
            k = 0
        elif len(fs) == 2:
            n1, n2 = normals[fs[0]], normals[fs[1]]
            s1, s2 = n1.dot(C), n2.dot(C)
            ang = math.degrees(n1.angle(n2, 0.0))
            if (s1 > 0) != (s2 > 0) and part.sil:
                k = 0
            elif ang >= hi:
                k = 0
            elif ang >= lo:
                k = 1
            elif tones[fs[0]] != tones[fs[1]] or part.group_of(fs[0]) != part.group_of(fs[1]):
                k = -1
            else:
                continue
            off = n1 + n2
            if off.length < 1e-9:
                off = n1
        else:
            k = 0
            off = ZERO
        if part.ink is not None and k >= 0:
            k = max(k, part.ink)
        if not part.draw:
            k = -1
        out.append((pa.copy(), pb.copy(), k, off.normalized() if off.length > 1e-12 else ZERO))
    return out


def _seg_tri(a, b, t):
    d = b - a
    L2 = d.length_squared
    if L2 < 1e-18:
        return None
    for (o, r, flip) in ((a, d, False), (b, -d, True)):
        p = mg.intersect_ray_tri(t[0], t[1], t[2], r, o, True)
        if p is not None:
            s = (p - a).dot(d) / L2
            if -1e-7 <= s <= 1 + 1e-7:
                return p
    return None


def _tri_tri(A, B):
    pts = []
    for i in range(3):
        for (p, q, t) in ((A[i], A[(i + 1) % 3], B), (B[i], B[(i + 1) % 3], A)):
            x = _seg_tri(p, q, t)
            if x is not None and all((x - y).length > 1e-7 for y in pts):
                pts.append(x)
    if len(pts) < 2:
        return None
    best, bd = None, 0.0
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            d = (pts[i] - pts[j]).length
            if d > bd:
                bd, best = d, (pts[i], pts[j])
    return best if bd > 1e-6 else None


def _bounds(points):
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    zs = [p.z for p in points]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def _overlap(b1, b2, pad=1e-6):
    return all(b1[0][i] <= b2[1][i] + pad and b2[0][i] <= b1[1][i] + pad for i in range(3))


def intersection_lines(parts):
    """The lines where solids cut into each other (what a boolean union would leave as edges)."""
    items = []
    for p in parts:
        if not p.intersect or not p.mesh.faces:
            continue
        tris = _tris(p.mesh)
        tree = BVHTree.FromPolygons(p.mesh.verts, tris, all_triangles=True)
        items.append((p, tris, tree, _bounds(p.mesh.verts)))
    out = []
    for i in range(len(items)):
        pi, ti, tri_i, bi = items[i]
        for j in range(i + 1, len(items)):
            pj, tj, tri_j, bj = items[j]
            if not _overlap(bi, bj):
                continue
            for a, b in tri_i.overlap(tri_j):
                A = [pi.mesh.verts[x] for x in ti[a]]
                B = [pj.mesh.verts[x] for x in tj[b]]
                s = _tri_tri(A, B)
                if not s:
                    continue
                na = newell(A)
                nb = newell(B)
                off = na + nb
                k = max(pi.ink or 0, pj.ink or 0)
                out.append((s[0], s[1], k, off.normalized() if off.length > 1e-9 else ZERO))
    return out


# ---------------------------------------------------------------------------
# Visibility


class Visibility:
    def __init__(self, parts, eps):
        verts, polys = [], []
        self.owner = []  # polygon index -> (part index, face index)
        for pi, p in enumerate(parts):
            if not p.occlude:
                continue
            off = len(verts)
            verts += p.mesh.verts
            polys += [tuple(i + off for i in f) for f in p.mesh.faces]
            self.owner += [(pi, fi) for fi in range(len(p.mesh.faces))]
        self.tree = BVHTree.FromPolygons(verts, polys, all_triangles=False) if polys else None
        self.eps = eps
        self.far = 1e6

    def test(self, p, off, keep):
        if keep is not None and not keep(p):
            return False
        if self.tree is None:
            return True
        o = p + off * self.eps + C * (2.0 * self.eps)
        hit = self.tree.ray_cast(o, C, self.far)
        return hit[0] is None

    def intervals(self, a, b, off, keep, step):
        """Visible stretches of the segment a-b, as (t0, t1) pairs."""
        pa, pb = proj(a), proj(b)
        length = math.hypot(pb[0] - pa[0], pb[1] - pa[1])
        if length < 1e-9:
            return [], length
        n = max(2, int(math.ceil(length / step)) + 1)
        ts = [i / (n - 1) for i in range(n)]
        vs = [self.test(a.lerp(b, t), off, keep) for t in ts]
        out = []
        start = 0.0 if vs[0] else None
        for i in range(n - 1):
            if vs[i] == vs[i + 1]:
                continue
            lo, hi = ts[i], ts[i + 1]
            for _ in range(16):
                mid = (lo + hi) / 2
                if self.test(a.lerp(b, mid), off, keep) == vs[i]:
                    lo = mid
                else:
                    hi = mid
            t = (lo + hi) / 2
            if vs[i]:
                out.append((start, t))
                start = None
            else:
                start = t
        if start is not None:
            out.append((start, 1.0))
        return out, length


def _clean_intervals(iv, length_px, min_run, min_gap):
    """Close pinholes shorter than `min_gap` px and drop isolated specks shorter than `min_run` px.

    A run that reaches either end of the segment is kept whatever its length:
    it continues into the next segment of the same line (curves are made of
    many short segments)."""
    if not iv:
        return iv
    merged = [list(iv[0])]
    for t0, t1 in iv[1:]:
        if (t0 - merged[-1][1]) * length_px < min_gap:
            merged[-1][1] = t1
        else:
            merged.append([t0, t1])
    return [(a, b) for a, b in merged if a <= 1e-9 or b >= 1 - 1e-9 or (b - a) * length_px >= min_run]


# ---------------------------------------------------------------------------
# 2D clean-up


class Seg:
    __slots__ = ("x0", "y0", "x1", "y1", "q0", "q1", "k")

    def __init__(self, x0, y0, x1, y1, q0, q1, k):
        self.x0, self.y0, self.x1, self.y1 = x0, y0, x1, y1
        self.q0, self.q1, self.k = q0, q1, k

    def length(self):
        return math.hypot(self.x1 - self.x0, self.y1 - self.y0)


def clip_segment(s, w, h):
    """Liang-Barsky against [0, w] x [0, h]."""
    dx, dy = s.x1 - s.x0, s.y1 - s.y0
    t0, t1 = 0.0, 1.0
    for p, q in ((-dx, s.x0), (dx, w - s.x0), (-dy, s.y0), (dy, h - s.y0)):
        if abs(p) < 1e-12:
            if q < 0:
                return None
            continue
        r = q / p
        if p < 0:
            t0 = max(t0, r)
        else:
            t1 = min(t1, r)
        if t0 > t1:
            return None
    lerp = lambda a, b, t: a + (b - a) * t
    return Seg(
        lerp(s.x0, s.x1, t0), lerp(s.y0, s.y1, t0), lerp(s.x0, s.x1, t1), lerp(s.y0, s.y1, t1),
        lerp(s.q0, s.q1, t0), lerp(s.q0, s.q1, t1), s.k,
    )


def dedupe(segs, q=0.05):
    """Drop exact repeats (the same segment from two parts, e.g. the rims of stacked discs); the stronger ink stays.

    Segments only a few grid steps long pass through untouched: rounding would
    make neighbouring pieces of a small curve look like repeats of each other."""
    best, out = {}, []
    for s in segs:
        if s.length() < 6 * q:
            out.append(s)
            continue
        a = (round(s.x0 / q), round(s.y0 / q))
        b = (round(s.x1 / q), round(s.y1 / q))
        key = (a, b) if a <= b else (b, a)
        if key not in best or s.k < best[key].k:
            best[key] = s
    return out + list(best.values())


def merge_collinear(segs, ang_tol=0.003, off_tol=0.25, gap=0.3, min_len=1.5):
    """Union overlapping collinear straight segments; where classes overlap, the stronger (lower k) wins.

    Only segments at least `min_len` px long take part (pieces of curves are
    short and are left alone), and each joins the cluster of the longest line
    it matches, so a gently turning curve can never be flattened onto one line.
    """
    segs = dedupe(segs)
    short = [s for s in segs if s.length() < min_len]
    segs = sorted((s for s in segs if s.length() >= min_len), key=lambda s: -s.length())
    info = []
    for s in segs:
        dx, dy = s.x1 - s.x0, s.y1 - s.y0
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        if uy < 0 or (abs(uy) < 1e-12 and ux < 0):
            ux, uy = -ux, -uy
        th = math.atan2(uy, ux)
        if th > math.pi - ang_tol:
            th -= math.pi
            ux, uy = -ux, -uy
        rho = -uy * s.x0 + ux * s.y0
        info.append((th, rho, ux, uy))

    seeds = defaultdict(list)  # bin -> seed indices
    clusters = defaultdict(list)
    for i, (th, rho, _, _) in enumerate(info):
        kb = (int(math.floor(th / ang_tol)), int(math.floor(rho / off_tol)))
        home = None
        for dt in (-1, 0, 1):
            for dr in (-1, 0, 1):
                for j in seeds.get((kb[0] + dt, kb[1] + dr), ()):
                    if abs(info[j][0] - th) < ang_tol and abs(info[j][1] - rho) < off_tol:
                        home = j
                        break
                if home is not None:
                    break
            if home is not None:
                break
        if home is None:
            home = i
            seeds[kb].append(i)
        clusters[home].append(i)

    out = list(short)
    for members in clusters.values():
        if len(members) == 1:
            out.append(segs[members[0]])
            continue
        _, _, ux, uy = info[members[0]]
        rho = sum(info[i][1] for i in members) / len(members)
        fx, fy = -uy * rho, ux * rho
        by_k = defaultdict(list)
        for i in members:
            s = segs[i]
            a = ux * s.x0 + uy * s.y0
            b = ux * s.x1 + uy * s.y1
            if a <= b:
                by_k[s.k].append([a, b, s.q0, s.q1])
            else:
                by_k[s.k].append([b, a, s.q1, s.q0])
        stronger = []
        for k in sorted(by_k):
            iv = sorted(by_k[k])
            merged = [iv[0][:]]
            for cur in iv[1:]:
                last = merged[-1]
                if cur[0] <= last[1] + gap:
                    if cur[1] > last[1]:
                        last[1], last[3] = cur[1], cur[3]
                else:
                    merged.append(cur[:])
            pieces = merged
            for (u0, u1, _, _) in stronger:
                nxt = []
                for (a, b, qa, qb) in pieces:
                    if u1 <= a or u0 >= b:
                        nxt.append((a, b, qa, qb))
                        continue
                    q = lambda s: qa + (qb - qa) * ((s - a) / (b - a) if b > a else 0)
                    if u0 > a:
                        nxt.append((a, u0, qa, q(u0)))
                    if u1 < b:
                        nxt.append((u1, b, q(u1), qb))
                pieces = nxt
            for (a, b, qa, qb) in pieces:
                if b - a > 0.05:
                    out.append(Seg(fx + ux * a, fy + uy * a, fx + ux * b, fy + uy * b, qa, qb, k))
            stronger += [tuple(m) for m in merged]
    return out


def chain(segs, tol=0.12):
    """Join segments of one class that share endpoints into polylines: lists of (x, y, q).

    Specks shorter than the joining tolerance are dropped first; the pieces on
    either side of one are close enough to join across the gap."""
    segs = [s for s in segs if s.length() > tol]
    reps = []  # cluster representative points
    grid = defaultdict(list)
    cell = tol * 2

    def node(x, y):
        gx, gy = int(math.floor(x / cell)), int(math.floor(y / cell))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for idx in grid.get((gx + dx, gy + dy), ()):
                    rx, ry = reps[idx]
                    if (rx - x) ** 2 + (ry - y) ** 2 <= tol * tol:
                        return idx
        reps.append((x, y))
        grid[(gx, gy)].append(len(reps) - 1)
        return len(reps) - 1

    ends = []
    adj = defaultdict(list)
    for i, s in enumerate(segs):
        a, b = node(s.x0, s.y0), node(s.x1, s.y1)
        ends.append((a, b))
        adj[a].append(i)
        adj[b].append(i)

    used = [False] * len(segs)
    lines = []

    def walk(start_node, i):
        pts = []
        cur = start_node
        while i is not None:
            used[i] = True
            s = segs[i]
            a, b = ends[i]
            if a == cur:
                if not pts:
                    pts.append((s.x0, s.y0, s.q0))
                pts.append((s.x1, s.y1, s.q1))
                cur = b
            else:
                if not pts:
                    pts.append((s.x1, s.y1, s.q1))
                pts.append((s.x0, s.y0, s.q0))
                cur = a
            nxt = [j for j in adj[cur] if not used[j]]
            i = nxt[0] if len(adj[cur]) == 2 and nxt else None
        return pts

    for n_id, members in list(adj.items()):
        if len(members) != 2:
            for i in members:
                if not used[i]:
                    lines.append(walk(n_id, i))
    for i in range(len(segs)):
        if not used[i]:
            lines.append(walk(ends[i][0], i))
    return lines


def simplify(pts, tol=0.1):
    """Ramer-Douglas-Peucker on (x, y, q) points."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        ax, ay, _ = pts[i]
        bx, by, _ = pts[j]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        best, bi = 0.0, -1
        for k in range(i + 1, j):
            px, py, _ = pts[k]
            if L < 1e-12:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best:
                best, bi = d, k
        if best > tol and bi > 0:
            keep[bi] = True
            stack.append((i, bi))
            stack.append((bi, j))
    return [p for p, k in zip(pts, keep) if k]


def polyline_length(pts):
    return sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))


def split_by_key(pts, span):
    """Cut a polyline wherever its order key has moved more than `span` since the last cut."""
    out = [[pts[0]]]
    base = pts[0][2]
    for i in range(1, len(pts)):
        x0, y0, q0 = out[-1][-1]
        x1, y1, q1 = pts[i]
        while abs(q1 - base) > span and abs(q1 - q0) > 1e-12:
            target = base + span * (1 if q1 > base else -1)
            t = (target - q0) / (q1 - q0)
            if not (0 < t < 1):
                break
            cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            out[-1].append((cx, cy, target))
            out.append([(cx, cy, target)])
            x0, y0, q0 = cx, cy, target
            base = target
        out[-1].append((x1, y1, q1))
    return [p for p in out if len(p) > 1 and polyline_length(p) > 0.5]


def fmt(v):
    s = f"{v:.1f}"
    if s.endswith(".0"):
        s = s[:-2]
    if s == "-0":
        s = "0"
    return s


def path_d(pts):
    head = f"M{fmt(pts[0][0])} {fmt(pts[0][1])}"
    rest = " ".join(f"{fmt(x)} {fmt(y)}" for x, y, _ in pts[1:])
    return f"{head}L{rest}"


# ---------------------------------------------------------------------------


def render(parts, wires, *, frame, scale, order, clip=False, chunk=None, step_px=0.45, fills=False, verbose=True):
    """
    frame: (x0, x1, y0, y1) in projected world units; the viewBox is that box times `scale`.
    order: function of a world point giving its draw-order key (low draws first).
    chunk: when set, polylines are cut so each covers at most this share of the key range.
    fills: also return the visible faces as tonal fills, and the lit panes as lights.
    """
    import regions

    fx0, fx1, fy0, fy1 = frame
    W, H = (fx1 - fx0) * scale, (fy1 - fy0) * scale
    step = step_px / scale

    allpts = [v for p in parts for v in p.mesh.verts] + [v for w in wires for v in w.points]
    lo, hi = _bounds(allpts)
    size = max(hi[i] - lo[i] for i in range(3))
    # Ray offsets small on screen (0.04 px), whatever the scene's extent: a large offset moves where
    # an edge passes behind something off that thing's outline, and the fills then leak through.
    vis = Visibility(parts, eps=min(size * 1e-4, 0.04 / scale))

    # Candidates: (a, b, k, offset, keep, region). k = -1: not drawn, only bounds fills.
    cands = []
    for p in parts:
        if p.lines:
            cands += [(a, b, k, off, None, p.region) for (a, b, k, off) in feature_edges(p) if k >= 0 or fills]
    inter = intersection_lines(parts)
    cands += [(a, b, k, off, None, True) for (a, b, k, off) in inter]
    for w in wires:
        pts = w.points + ([w.points[0]] if w.closed else [])
        for i in range(len(pts) - 1):
            cands.append((pts[i], pts[i + 1], w.k, ZERO, w.keep, w.region))

    def preclip(a, b):
        """Trim a candidate to the part that can land inside the frame (plus a margin)."""
        (ax, ay), (bx, by) = proj(a), proj(b)
        m = 4.0 / scale
        dx, dy = bx - ax, by - ay
        t0, t1 = 0.0, 1.0
        for p, q in ((-dx, ax - (fx0 - m)), (dx, (fx1 + m) - ax), (-dy, ay - (fy0 - m)), (dy, (fy1 + m) - ay)):
            if abs(p) < 1e-12:
                if q < 0:
                    return None
                continue
            r = q / p
            if p < 0:
                t0 = max(t0, r)
            else:
                t1 = min(t1, r)
            if t0 > t1:
                return None
        return a.lerp(b, t0), a.lerp(b, t1)

    segs = []  # drawn
    rsegs = []  # bounding the fills
    for a, b, k, off, keep, region in cands:
        if k < 0 and not region:
            continue
        if clip:
            trimmed = preclip(a, b)
            if trimmed is None:
                continue
            a, b = trimmed
        iv, length = vis.intervals(a, b, off, keep, step)
        iv = _clean_intervals(iv, length * scale, min_run=0.35, min_gap=0.3)
        for t0, t1 in iv:
            p0, p1 = a.lerp(b, t0), a.lerp(b, t1)
            (sx0, sy0), (sx1, sy1) = proj(p0), proj(p1)
            s = Seg((sx0 - fx0) * scale, (fy1 - sy0) * scale, (sx1 - fx0) * scale, (fy1 - sy1) * scale, order(p0), order(p1), k)
            if clip:
                s = clip_segment(s, W, H)
            if s is None or s.length() <= 0.05:
                continue
            if k >= 0:
                segs.append(s)
            if fills and region:
                rsegs.append((s.x0, s.y0, s.x1, s.y1))

    segs = merge_collinear(segs)
    by_k = defaultdict(list)
    for s in segs:
        by_k[s.k].append(s)

    lines = []
    for k, ss in by_k.items():
        for pl in chain(ss):
            pl = simplify(pl)
            if polyline_length(pl) < 0.6:
                continue
            if pl[-1][2] < pl[0][2] - 1e-9:
                pl = pl[::-1]
            lines.append((k, pl))

    qs = [q for _, pl in lines for (_, _, q) in pl]
    q0, q1 = min(qs), max(qs)
    if chunk:
        span = chunk * (q1 - q0)
        lines = [(k, piece) for k, pl in lines for piece in split_by_key(pl, span)]

    paths = []
    for k, pl in lines:
        if pl[-1][2] < pl[0][2] - 1e-9:
            pl = pl[::-1]
        o = (min(q for _, _, q in pl) - q0) / (q1 - q0) if q1 > q0 else 0.0
        paths.append({"d": path_d(pl), "k": int(k), "o": round(min(1.0, max(0.0, o)), 3)})
    paths.sort(key=lambda p: (p["o"], p["k"]))
    out = {"viewBox": f"0 0 {fmt(W)} {fmt(H)}", "width": W, "height": H, "paths": paths}

    if fills:
        if clip:
            rsegs += [(0, 0, W, 0), (W, 0, W, H), (W, H, 0, H), (0, H, 0, 0)]
        far = size * 4 + 10
        light_s = {}

        def label_at(X, Y):
            sx, sy = X / scale + fx0, fy1 - Y / scale
            hit = vis.tree.ray_cast(RIGHT * sx + UP * sy + C * far, -C, 2 * far)
            if hit[0] is None:
                return None
            pi, fi = vis.owner[hit[2]]
            part = parts[pi]
            s = part.light_of(fi)
            key = None
            if s is not None:
                key = (pi, part.group_of(fi))
                light_s.setdefault(key, s)
            return ((part.face_tones()[fi], key), hit[3])

        regs = regions.build(rsegs, label_at)
        regs.sort(key=lambda r: -r[1])  # back to front
        out["fills"], out["lights"] = [], []
        for (t, key), _, rings in regs:
            d = regions.ring_d(rings, fmt)
            out["fills"].append({"d": d, "t": t})
            if key is not None:
                out["lights"].append({"d": d, "s": round(light_s[key], 3)})
    if verbose:
        counts = defaultdict(int)
        for p in paths:
            counts[p["k"]] += 1
        extra = f", fills {len(out['fills'])}, lights {len(out['lights'])}" if fills else ""
        print(f"  candidates {len(cands)} (intersections {len(inter)}), segments {len(segs)}, paths {len(paths)} {dict(counts)}{extra}")
    return out


def to_view(frame, scale, p):
    """A world point in viewBox units, for anchors."""
    fx0, fx1, fy0, fy1 = frame
    sx, sy = proj(Vector(p))
    return [round((sx - fx0) * scale, 1), round((fy1 - sy) * scale, 1)]
