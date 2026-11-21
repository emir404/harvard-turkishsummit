"""David Rubenstein Treehouse (Studio Gang, Harvard) -> strokes-only line drawing.

A measured massing model (feet) built from the published plans and elevations,
projected with a pinhole or parallel camera, with hidden lines removed in 2D.
Output: an SVG with three stroke weights and no fills.

usage: python treehouse.py <out.svg> [key=value ...]

Needs shapely (pip install shapely). The drawing on the site was made with:

    python scripts/treehouse/treehouse.py hero.svg width=1440 az=26 camh=90 dist=800 \
        ml=0.4433 mr=0.0412 mt=0.012 mb=0.08 pad=0 bleed=0.65
    node scripts/treehouse/svg-to-ts.mjs hero.svg
"""
import math
import sys

from shapely.geometry import LineString, MultiLineString, Polygon, GeometryCollection
from shapely.ops import linemerge, unary_union

# ---------------------------------------------------------------- parameters
P = dict(
    mode="persp2",     # persp2 (verticals stay vertical) | persp | ortho
    az=30.0,           # camera bearing from the building centre, degrees west of north
    el=13.0,           # camera elevation above the horizon, degrees (persp / ortho)
    camh=120.0,        # camera height in ft (persp2)
    dist=650.0,        # camera distance
    width=1200.0,      # output width in px
    ml=0.10, mr=0.10, mt=0.06, mb=0.10,   # frame margins as fractions of the building width
    bleed=0.0,         # let site lines run this far past the frame on both sides (fraction of the building width)
    pad=2.0,
    ground=1,          # draw site lines
    mull=5.0,          # level-3 mullion spacing (ft)
    bg="#0b0b0c",
    preview=0,         # 1 = add a dark background rect for previewing
    detail=1,          # 0 = drop the faint glazing lines (for small sizes)
    sa="1.5", sb="1.1", sc_="0.8", oa="1", ob="0.62", oc="0.34",
)
for arg in sys.argv[2:]:
    k, v = arg.split("=")
    P[k] = type(P[k])(v) if not isinstance(P[k], str) else v

# ---------------------------------------------------------------- plan (feet; x east, y north)
NW, Nk, NE = (0.0, 143.8), (90.0, 143.8), (175.2, 121.3)
Ew, SE, Sk = (161.2, 72.1), (176.4, 23.7), (90.9, 0.0)
SW, Ww = (0.0, 0.0), (13.0, 72.1)
L3 = [NW, Nk, NE, Ew, SE, Sk, SW, Ww]          # clockwise from above
ZG, ZS, ZB0, ZB1, ZR0, ZR1 = 0.0, 18.8, 33.7, 38.1, 61.0, 66.8
CANT = 8.0                                      # level-2 inset at the soffit


def sub(a, b): return tuple(x - y for x, y in zip(a, b))
def add(a, b): return tuple(x + y for x, y in zip(a, b))
def mul(a, s): return tuple(x * s for x in a)
def dot(a, b): return sum(x * y for x, y in zip(a, b))
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def norm(a):
    n = math.sqrt(dot(a, a))
    return tuple(x / n for x in a)
def lerp(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))
def p3(xy, z): return (xy[0], xy[1], z)


def inset(poly, d):
    """Mitred inward offset of a clockwise polygon, vertex for vertex."""
    out = []
    n = len(poly)
    for i in range(n):
        a, b, c = poly[i - 1], poly[i], poly[(i + 1) % n]
        e1, e2 = norm(sub(b, a)), norm(sub(c, b))
        n1, n2 = (e1[1], -e1[0]), (e2[1], -e2[0])   # inward normals for clockwise order
        # intersect the two offset lines
        p1, p2 = add(a, mul(n1, d)), add(b, mul(n2, d))
        den = e1[0] * e2[1] - e1[1] * e2[0]
        if abs(den) < 1e-9:
            out.append(add(b, mul(n1, d)))
            continue
        t = ((p2[0] - p1[0]) * e2[1] - (p2[1] - p1[1]) * e2[0]) / den
        out.append(add(p1, mul(e1, t)))
    return out


S = inset(L3, CANT)            # soffit / ground-floor line
ROOF_IN = inset(L3, 2.6)       # parapet inner line


# ---------------------------------------------------------------- camera
CEN = (88.0, 72.0, 30.0)
az, el = math.radians(P["az"]), math.radians(P["el"])
cdir = (-math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el))   # centre -> camera
if P["mode"] == "persp2":
    CAM = (CEN[0] - math.sin(az) * P["dist"], CEN[1] + math.cos(az) * P["dist"], P["camh"])
    FWD = norm((CEN[0] - CAM[0], CEN[1] - CAM[1], 0.0))
    RIGHT = norm(cross(FWD, (0, 0, 1)))
    UP = (0.0, 0.0, 1.0)
else:
    CAM = add(CEN, mul(cdir, P["dist"]))
    FWD = norm(sub(CEN, CAM))
    RIGHT = norm(cross(FWD, (0, 0, 1)))
    UP = cross(RIGHT, FWD)


def proj(p):
    v = sub(p, CAM)
    x, y, z = dot(v, RIGHT), dot(v, UP), dot(v, FWD)
    if P["mode"] == "ortho":
        return (x, -y)
    f = P["dist"]
    return (f * x / z, -f * y / z)


def poly(pts3):
    g = Polygon([proj(p) for p in pts3])
    return g if g.is_valid else g.buffer(0)


def seg(a, b): return LineString([proj(a), proj(b)])
def pline(pts3): return LineString([proj(p) for p in pts3])


# ---------------------------------------------------------------- sides
class Side:
    """A run of facade edges; u is distance along the level-3 line."""

    def __init__(self, idx):
        self.Lp = [L3[i] for i in idx]
        self.Sp = [S[i] for i in idx]
        self.len = [math.dist(self.Lp[i], self.Lp[i + 1]) for i in range(len(idx) - 1)]
        self.total = sum(self.len)
        self.breaks = [sum(self.len[:i]) for i in range(len(idx))]

    def _loc(self, u):
        u = min(max(u, 0.0), self.total)
        for i, ln in enumerate(self.len):
            if u <= self.breaks[i] + ln + 1e-9:
                return i, (u - self.breaks[i]) / ln
        return len(self.len) - 1, 1.0

    def L(self, u, z):
        i, f = self._loc(u)
        return p3(lerp(self.Lp[i], self.Lp[i + 1], f), z)

    def Sg(self, u, z):
        i, f = self._loc(u)
        return p3(lerp(self.Sp[i], self.Sp[i + 1], f), z)

    def C(self, u, t):
        """Point on the canted level-2 plane: t=0 soffit, t=1 belt."""
        return lerp(self.Sg(u, ZS), self.L(u, ZB0), t)

    def spans(self, u0, u1):
        """Split [u0,u1] at fold lines."""
        cuts = [u0] + [b for b in self.breaks[1:-1] if u0 + 1e-6 < b < u1 - 1e-6] + [u1]
        return list(zip(cuts[:-1], cuts[1:]))


NORTH = Side([0, 1, 2])           # NW -> kink -> NE
WEST = Side([0, 7, 6])            # NW -> waist -> SW


def ribbon(a, b, w, nrm, ext=0.0):
    """Flat member of width w between 3D points a and b, lying in a plane with normal nrm."""
    ax = norm(sub(b, a))
    a, b = sub(a, mul(ax, ext)), add(b, mul(ax, ext))
    d = mul(norm(cross(ax, nrm)), w / 2)
    return poly([add(a, d), add(b, d), sub(b, d), sub(a, d)])


def plane_normal(a, b, c): return norm(cross(sub(b, a), sub(c, a)))


# ---------------------------------------------------------------- drawing list (front to back)
items = []     # each: dict(mask=[polygons], A=[lines], B=[lines], C=[lines])


def item():
    it = dict(mask=[], A=[], B=[], C=[])
    items.append(it)
    return it


def outline(g): return g.boundary


def build_side(side, trees, bottoms, tops, name):
    T = side.total
    # ---- zones per straight span
    spans = side.spans(0, T)
    fascia = [poly([side.L(a, ZR0), side.L(b, ZR0), side.L(b, ZR1), side.L(a, ZR1)]) for a, b in spans]
    belt = [poly([side.L(a, ZB0), side.L(b, ZB0), side.L(b, ZB1), side.L(a, ZB1)]) for a, b in spans]
    zone3 = [poly([side.L(a, ZB1), side.L(b, ZB1), side.L(b, ZR0), side.L(a, ZR0)]) for a, b in spans]
    zone2 = [poly([side.Sg(a, ZS), side.Sg(b, ZS), side.L(b, ZB0), side.L(a, ZB0)]) for a, b in spans]
    zone1 = [poly([side.Sg(a, ZG), side.Sg(b, ZG), side.Sg(b, ZS), side.Sg(a, ZS)]) for a, b in spans]

    # ---- 1. fascia + belt bands
    it = item()
    it["mask"] += fascia + belt
    it["A"].append(pline([side.L(u, ZR1) for u in side.breaks]))                    # roof edge
    it["B"].append(pline([side.L(u, ZR0) for u in side.breaks]))                    # fascia underside
    it["B"].append(pline([side.L(u, ZB1) for u in side.breaks]))                    # belt top
    it["B"].append(pline([side.L(u, ZB0) for u in side.breaks]))                    # belt bottom
    for u in (0.0, T):                                                              # end edges
        it["A"].append(seg(side.L(u, ZR0), side.L(u, ZR1)))
        it["B"].append(seg(side.L(u, ZB0), side.L(u, ZB1)))
    for u in side.breaks[1:-1]:                                                     # fold lines
        it["B"].append(seg(side.L(u, ZR0), side.L(u, ZR1)))
        it["C"].append(seg(side.L(u, ZB0), side.L(u, ZB1)))
    u = 15.0
    while u < T - 4:                                                               # fascia ribs
        if all(abs(u - b) > 1 for b in side.breaks):
            it["C"].append(seg(side.L(u, ZR0 + 0.4), side.L(u, ZR1 - 0.4)))
        u += 15.0

    # ---- 2. timber members
    mem = []
    def span_of(u0, u1):
        m = (u0 + u1) / 2
        for k, (a, b) in enumerate(spans):
            if a - 1e-6 <= m <= b + 1e-6:
                return k
        return 0
    # level-3 diagonals (zigzag)
    for b in bottoms:
        near = sorted(tops, key=lambda t: abs(t - b))[:2]
        for t in near:
            k = span_of(b, t)
            a0, b0 = spans[k]
            n = plane_normal(side.L(a0, 0), side.L(b0, 0), side.L(a0, 10))
            r = ribbon(side.L(b, ZB1), side.L(t, ZR0), 2.3, n, ext=3.0)
            mem.append(r.intersection(zone3[k]))
    # level-2 branches + trunks
    for t in trees:
        for b in (t - 15, t + 15):
            if b < 0 or b > T:
                continue
            k = span_of(t, b)
            a0, b0 = spans[k]
            n = plane_normal(side.Sg(a0, ZS), side.Sg(b0, ZS), side.L(a0, ZB0))
            r = ribbon(side.C(t, 0), side.C(b, 1), 2.6, n, ext=3.0)
            mem.append(r.intersection(zone2[k]))
        k = span_of(t - 0.5, t + 0.5)
        a0, b0 = spans[k]
        # trunk: a vertical post standing on the soffit line
        ax = norm(sub(side.Sg(b0, 0), side.Sg(a0, 0)))
        c = side.Sg(t, 0)
        w = 1.45
        mem.append(poly([sub(c, mul(ax, w)), add(c, mul(ax, w)), add(p3(c[:2], ZS), mul(ax, w)), sub(p3(c[:2], ZS), mul(ax, w))]))
    mem = unary_union([m for m in mem if not m.is_empty])
    it = item()
    it["mask"].append(mem)
    it["A"].append(outline(mem))
    return dict(spans=spans, zone1=zone1, zone2=zone2, zone3=zone3)


def glazing_grid(side, u0, u1, z0, z1, n_mull, transom=None, cls="C", frame="B", it=None):
    """Rectangular glazing on a vertical wall of the given line function."""
    f = side
    it["" + frame].append(pline([f(u0, z0), f(u1, z0), f(u1, z1), f(u0, z1), f(u0, z0)]))
    for i in range(1, n_mull + 1):
        u = u0 + (u1 - u0) * i / (n_mull + 1)
        it[cls].append(seg(f(u, z0), f(u, z1)))
    if transom:
        it[cls].append(seg(f(u0, transom), f(u1, transom)))


# ================================================================= NORTH
n_trees = [30.0, 90.0, 150.0]
n_bottoms = [15.0, 45.0, 75.0, 105.0, 135.0, 165.0]
n_tops = [0.0, 30.0, 60.0, 90.0, 120.0, 150.0, NORTH.total]
west_first = True

# ================================================================= WEST
# corner lambda only: one diagonal from the corner top to a floor node 14 ft south
w_bottoms = [14.5]
w_tops = [0.0]


def west_members():
    """West side has the corner diagonal and one terrace diagonal near the south end."""
    return


def build_north():
    z = build_side(NORTH, n_trees, n_bottoms, n_tops, "N")
    it = item()
    it["mask"] += z["zone1"] + z["zone2"] + z["zone3"]
    T = NORTH.total
    # level 3 glazing: mullions + one transom
    u = P["mull"]
    while u < T - 1:
        it["C"].append(seg(NORTH.L(u, ZB1), NORTH.L(u, ZR0)))
        u += P["mull"]
    zt = ZB1 + (ZR0 - ZB1) * 0.52
    it["C"].append(pline([NORTH.L(b, zt) for b in NORTH.breaks]))
    # level 2: inverted triangles in each V and a leaning window group east of each tree
    for t in n_trees:
        tri = [NORTH.C(t - 9.2, 0.88), NORTH.C(t + 9.2, 0.88), NORTH.C(t, 0.27)]
        if t == 90.0:
            # the middle tree stands on the fold: one half-triangle per face
            it["B"].append(pline([NORTH.C(t - 9.2, 0.88), NORTH.C(t, 0.88), NORTH.C(t + 9.2, 0.88), NORTH.C(t, 0.27), NORTH.C(t - 9.2, 0.88)]))
        else:
            it["B"].append(pline(tri + [tri[0]]))
        for k in (-1, 1):
            it["C"].append(seg(NORTH.C(t + k * 3.1, 0.88), NORTH.C(t + k * 1.0, 0.47)))
    for t in n_trees[:2]:
        b0, b1, lean = t + 7.0, t + 17.5, 15.0 * 0.66
        t0, t1 = 0.17, 0.83
        quad = [NORTH.C(b0, t0), NORTH.C(b1, t0), NORTH.C(b1 + lean, t1), NORTH.C(b0 + lean, t1)]
        it["B"].append(pline(quad + [quad[0]]))
        for i in (1, 2):
            f = i / 3
            it["C"].append(seg(NORTH.C(b0 + (b1 - b0) * f, t0), NORTH.C(b0 + (b1 - b0) * f + lean, t1)))
    # level 2 fold + ends
    it["B"].append(seg(NORTH.C(0, 0), NORTH.C(0, 1)))
    it["A"].append(seg(NORTH.C(T, 0), NORTH.C(T, 1)))
    it["C"].append(seg(NORTH.C(90, 0), NORTH.C(90, 1)))
    # soffit line + base line + ground-floor ends
    it["B"].append(pline([NORTH.Sg(b, ZS) for b in NORTH.breaks]))
    it["A"].append(pline([NORTH.Sg(b, ZG) for b in NORTH.breaks]))
    it["B"].append(seg(NORTH.Sg(0, ZG), NORTH.Sg(0, ZS)))
    it["A"].append(seg(NORTH.Sg(T, ZG), NORTH.Sg(T, ZS)))
    # ground floor bays between 15 ft piers
    u = 0.0
    while u < T - 6:
        a, b = u + 1.6, min(u + 15.0, T) - 1.6
        if b - a > 5:
            entry = 75.0 <= u < 105.0
            glazing_grid(NORTH.Sg, a, b, 0.0 if entry else 1.2, ZS - 3.0, 2, transom=9.2, it=it)
        u += 15.0


def build_west():
    side = WEST
    T = side.total
    spans = side.spans(0, T)
    fascia = [poly([side.L(a, ZR0), side.L(b, ZR0), side.L(b, ZR1), side.L(a, ZR1)]) for a, b in spans]
    belt = [poly([side.L(a, ZB0), side.L(b, ZB0), side.L(b, ZB1), side.L(a, ZB1)]) for a, b in spans]
    zone3 = [poly([side.L(a, ZB1), side.L(b, ZB1), side.L(b, ZR0), side.L(a, ZR0)]) for a, b in spans]
    zone2 = [poly([side.Sg(a, ZS), side.Sg(b, ZS), side.L(b, ZB0), side.L(a, ZB0)]) for a, b in spans]
    zone1 = [poly([side.Sg(a, ZG), side.Sg(b, ZG), side.Sg(b, ZS), side.Sg(a, ZS)]) for a, b in spans]
    it = item()
    it["mask"] += fascia + belt
    it["A"].append(pline([side.L(u, ZR1) for u in side.breaks]))
    it["B"].append(pline([side.L(u, ZR0) for u in side.breaks]))
    it["B"].append(pline([side.L(u, ZB1) for u in side.breaks]))
    it["B"].append(pline([side.L(u, ZB0) for u in side.breaks]))
    it["A"].append(seg(side.L(T, ZR0), side.L(T, ZR1)))
    it["B"].append(seg(side.L(T, ZB0), side.L(T, ZB1)))
    it["B"].append(seg(side.L(side.breaks[1], ZR0), side.L(side.breaks[1], ZR1)))
    it["C"].append(seg(side.L(side.breaks[1], ZB0), side.L(side.breaks[1], ZB1)))
    u = 15.0
    while u < T - 4:
        if all(abs(u - b) > 2 for b in side.breaks):
            it["C"].append(seg(side.L(u, ZR0 + 0.4), side.L(u, ZR1 - 0.4)))
        u += 15.0
    # members: corner diagonal + terrace diagonal
    n1 = plane_normal(side.L(0, 0), side.L(20, 0), side.L(0, 10))
    n2 = plane_normal(side.L(T - 20, 0), side.L(T, 0), side.L(T - 20, 10))
    ter0, ter1 = T - 31.0, T - 3.0
    mem = [ribbon(side.L(14.5, ZB1), side.L(0, ZR0), 2.3, n1, ext=3.0).intersection(zone3[0]),
           ribbon(side.L(ter0 + 1.5, ZB1), side.L(ter0 + 18.5, ZR0 - 2.2), 2.3, n2, ext=3.0).intersection(
               poly([side.L(ter0, ZB1), side.L(ter1, ZB1), side.L(ter1, ZR0 - 2.2), side.L(ter0, ZR0 - 2.2)]))]
    mem = unary_union(mem)
    it = item()
    it["mask"].append(mem)
    it["A"].append(outline(mem))
    # walls
    it = item()
    it["mask"] += zone1 + zone2 + zone3
    # corner glazing triangle: mullions inside it, clipped later by the diagonal's mask
    tri = poly([side.L(0, ZB1), side.L(14.5, ZB1), side.L(0, ZR0)])
    for u in (4.8, 9.6):
        ln = seg(side.L(u, ZB1), side.L(u, ZR0)).intersection(tri)
        if not ln.is_empty:
            it["C"].append(ln)
    it["C"].append(seg(side.L(0, ZB1 + (ZR0 - ZB1) * 0.52), side.L(14.5, ZB1 + (ZR0 - ZB1) * 0.52)).intersection(tri))
    it["B"].append(seg(side.L(0, ZB1), side.L(0, ZR0)))                                  # corner edge
    it["C"].append(seg(side.L(side.breaks[1], ZB1), side.L(side.breaks[1], ZR0)))        # waist fold
    it["A"].append(seg(side.L(T, ZB1), side.L(T, ZR0)))                                  # far corner
    # slot window + terrace opening on the south half
    sl = side.breaks[1] + 24.0
    it["B"].append(pline([side.L(sl, ZB1 + 2), side.L(sl + 2.6, ZB1 + 2), side.L(sl + 2.6, ZR0 - 2), side.L(sl, ZR0 - 2), side.L(sl, ZB1 + 2)]))
    it["B"].append(pline([side.L(ter0, ZB1), side.L(ter0, ZR0 - 2.2), side.L(ter1, ZR0 - 2.2), side.L(ter1, ZB1)]))
    it["C"].append(seg(side.L(ter0, ZB1 + 3.6), side.L(ter1, ZB1 + 3.6)))                # terrace rail
    # level 2: four leaning windows, tops toward the south
    for u0 in (8.5, 40.0, side.breaks[1] + 18.0, side.breaks[1] + 50.0):
        w, lean, t0, t1 = 5.4, 6.0, 0.2, 0.84
        quad = [side.C(u0, t0), side.C(u0 + w, t0), side.C(u0 + w + lean, t1), side.C(u0 + lean, t1)]
        it["B"].append(pline(quad + [quad[0]]))
        it["C"].append(seg(side.C(u0 + w / 2, t0), side.C(u0 + w / 2 + lean, t1)))
    it["A"].append(seg(side.C(0, 0), side.C(0, 1)))                                      # canted corner
    it["A"].append(seg(side.C(T, 0), side.C(T, 1)))
    it["C"].append(seg(side.C(side.breaks[1], 0), side.C(side.breaks[1], 1)))
    it["B"].append(pline([side.Sg(b, ZS) for b in side.breaks]))
    it["A"].append(pline([side.Sg(b, ZG) for b in side.breaks]))
    it["A"].append(seg(side.Sg(0, ZG), side.Sg(0, ZS)))
    it["A"].append(seg(side.Sg(T, ZG), side.Sg(T, ZS)))
    it["C"].append(seg(side.Sg(side.breaks[1], ZG), side.Sg(side.breaks[1], ZS)))
    # ground floor: window, two doors, glazed bay
    glazing_grid(side.Sg, 4.0, 11.0, 3.0, 13.5, 1, it=it)
    for d in (23.0, 45.0):
        it["B"].append(pline([side.Sg(d, 0), side.Sg(d, 8.6), side.Sg(d + 3.6, 8.6), side.Sg(d + 3.6, 0)]))
    glazing_grid(side.Sg, side.breaks[1] + 12.0, side.breaks[1] + 38.0, 1.2, 14.5, 4, transom=9.2, it=it)


# far side seen only as silhouettes when the camera swings: east and south are back faces here.

def build_roof():
    # monitor (lantern over the atrium)
    x0, x1, y0, y1, h, s = 69.0, 108.0, 50.0, 69.0, 9.6, 2.2
    base = [(x0, y1), (x1, y1), (x1, y0), (x0, y0)]                 # NW, NE, SE, SW
    top = [(x0 + s, y1 - s), (x1 - s, y1 - s), (x1 - s, y0 + s), (x0 + s, y0 + s)]
    zt = ZR1 + h
    it = item()
    faces = [poly([p3(base[i], ZR1), p3(base[(i + 1) % 4], ZR1), p3(top[(i + 1) % 4], zt), p3(top[i], zt)]) for i in range(4)]
    faces.append(poly([p3(t, zt) for t in top]))
    hull = unary_union(faces)
    it["mask"].append(hull)
    it["B"].append(outline(hull))
    # visible inner edges: north + west faces and the top
    it["B"].append(pline([p3(top[3], zt), p3(top[0], zt), p3(top[1], zt)]))
    it["B"].append(seg(p3(base[0], ZR1), p3(top[0], zt)))
    for i in range(1, 6):
        f = i / 6
        it["C"].append(seg(p3(lerp(base[0], base[1], f), ZR1), p3(lerp(top[0], top[1], f), zt)))
    for i in range(1, 3):
        f = i / 3
        it["C"].append(seg(p3(lerp(base[3], base[0], f), ZR1), p3(lerp(top[3], top[0], f), zt)))
    # roof plane
    it = item()
    roof = poly([p3(p, ZR1) for p in L3])
    it["mask"].append(roof)
    it["A"].append(outline(roof))
    it["C"].append(outline(poly([p3(p, ZR1) for p in ROOF_IN])))


def build_ground():
    it = item()
    # Western Avenue: sidewalk edge, kerb and far kerb, running past the building
    for off, cls in ((12.0, "C"), (30.0, "B")):
        y = 143.8 - CANT + off + 8
        it[cls].append(seg((-700.0, y, 0), (900.0, y, 0)))
    # laneway edge to the west and the paving line along the west face
    for off, cls in ((14.0, "C"), (36.0, "C")):
        it[cls].append(seg((-off, 143.8 - CANT + 20, 0), (-off, -400.0, 0)))


build_north()
build_west()
build_roof()
if P["ground"]:
    build_ground()

# ---------------------------------------------------------------- hidden-line removal
EPS = 0.02
out = dict(A=[], B=[], C=[])
mask = None
for it in items:
    for cls in "ABC":
        for g in it[cls]:
            if g is None or g.is_empty:
                continue
            vis = g if mask is None else g.difference(mask)
            if not vis.is_empty:
                out[cls].append(vis)
    polys = [m for m in it["mask"] if m is not None and not m.is_empty]
    if polys:
        add_mask = unary_union(polys).buffer(-EPS)
        mask = add_mask if mask is None else unary_union([mask, add_mask])


def lines_of(g):
    if g.is_empty:
        return []
    if isinstance(g, LineString):
        return [g]
    if isinstance(g, (MultiLineString, GeometryCollection)):
        res = []
        for h in g.geoms:
            res += lines_of(h)
        return res
    if g.geom_type in ("Polygon", "MultiPolygon"):
        return lines_of(g.boundary)
    return []


allpts = []
merged = {}
for cls in "ABC":
    ls = []
    for g in out[cls]:
        ls += lines_of(g)
    m = linemerge(MultiLineString([l for l in ls if l.length > 0.05])) if ls else MultiLineString([])
    m = lines_of(m)
    merged[cls] = m
    for l in m:
        allpts += list(l.coords)

minx, maxx = min(p[0] for p in allpts), max(p[0] for p in allpts)
miny, maxy = min(p[1] for p in allpts), max(p[1] for p in allpts)
bx0 = min(proj(p3(p, z))[0] for p in L3 + S for z in (ZG, ZR1))
bx1 = max(proj(p3(p, z))[0] for p in L3 + S for z in (ZG, ZR1))
by0 = min(proj(p3(p, z))[1] for p in L3 for z in (ZR1, ZR1 + 10))
by1 = max(proj(p3(p, z))[1] for p in S for z in (ZG,))
W = P["width"]
pad = P["pad"]
bw = bx1 - bx0
fx0, fx1 = bx0 - P["ml"] * bw, bx1 + P["mr"] * bw
fy0, fy1 = by0 - P["mt"] * bw, by1 + P["mb"] * bw
sc = (W - 2 * pad) / (fx1 - fx0)
H = (fy1 - fy0) * sc + 2 * pad
from shapely.geometry import box
FRAME = box(fx0 - P["bleed"] * bw, fy0, fx1 + P["bleed"] * bw, fy1)
for cls in "ABC":
    clipped = []
    for l in merged[cls]:
        clipped += lines_of(l.intersection(FRAME))
    merged[cls] = clipped


def tx(p): return ((p[0] - fx0) * sc + pad, (p[1] - fy0) * sc + pad)


def path_d(lines):
    parts = []
    for l in lines:
        cs = [tx(c) for c in l.coords]
        # clip to the frame vertically (site lines can run past it)
        cs = [(round(x, 1), round(y, 1)) for x, y in cs]
        # drop tiny fragments
        if LineString(cs).length < 0.9:
            continue
        d = "M" + " ".join(f"{x:g} {y:g}" for x, y in cs[:1]) + "L" + " ".join(f"{x:g} {y:g}" for x, y in cs[1:])
        parts.append(d)
    return "".join(parts)


style = dict(A=(P["sa"], P["oa"]), B=(P["sb"], P["ob"]), C=(P["sc_"], P["oc"]))
if not P["detail"]:
    merged["C"] = []
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:.0f}" width="{W:g}" height="{H:.0f}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">']
if P["preview"]:
    svg[0] = svg[0].replace('<svg ', '<svg style="color:#ece9e2" ')
    svg.insert(1, f'<rect width="100%" height="100%" fill="{P["bg"]}" stroke="none"/>')
for cls in "CBA":
    sw, op = style[cls]
    d = path_d(merged[cls])
    svg.append(f'<path data-w="{cls}" stroke-width="{sw}" stroke-opacity="{op}" d="{d}"/>')
svg.append("</svg>")
open(sys.argv[1], "w").write("\n".join(svg))
bb = tx((bx0, by0)), tx((bx1, by1))
print(f"size {W:g}x{H:.0f}  bytes {sum(len(s) for s in svg)}  building x {bb[0][0]:.0f}-{bb[1][0]:.0f} y {bb[0][1]:.0f}-{bb[1][1]:.0f}  segs A{len(merged['A'])} B{len(merged['B'])} C{len(merged['C'])}")
