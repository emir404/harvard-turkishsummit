"""Building blocks shared by the scenes: a scene collector, window panes that
can be lit, furniture, trees, lamps, and surfaces of revolution.

Units are arbitrary; y is up. The camera sees the +x, +z and +y faces.
"""
import math

from mathutils import Vector

from geom import Mesh, Y, box, circle_points, frustum, orient_outward, uv_sphere, vec
from hlr import C, RIGHT, UP, Part, Wire

# ---------------------------------------------------------------------------
# Light timing: spatially coherent, so neighbours come on close together but
# not in lockstep.


def hash01(*v):
    h = math.sin(sum(x * k for x, k in zip(v, (12.9898, 78.233, 37.719, 4.581)))) * 43758.5453
    return h - math.floor(h)


def vnoise(x, y):
    xi, yi = math.floor(x), math.floor(y)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b = hash01(xi, yi), hash01(xi + 1, yi)
    c, d = hash01(xi, yi + 1), hash01(xi + 1, yi + 1)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v


def timing(p, scale=1.6):
    n = vnoise(p.x / scale + 0.37 * p.y, p.z / scale - 0.21 * p.y)
    return round(min(1.0, max(0.0, 0.72 * n + 0.28 * hash01(p.x, p.y, p.z))), 3)


def is_lit(p, ratio=0.4):
    return hash01(p.x * 1.7 + 3.1, p.y * 2.3, p.z * 1.1 - 7.3) < ratio


# ---------------------------------------------------------------------------


class Scene:
    def __init__(self):
        self.parts = []
        self.wires = []

    def part(self, mesh, **kw):
        p = Part(mesh, **kw)
        self.parts.append(p)
        return p

    def box(self, x0, y0, z0, x1, y1, z1, **kw):
        return self.part(box(min(x0, x1), min(y0, y1), min(z0, z1), max(x0, x1), max(y0, y1), max(z0, z1)), **kw)

    def wire(self, points, k=0, **kw):
        w = Wire(points, k=k, **kw)
        self.wires.append(w)
        return w


def panes(sc, quads, normal, ratio=0.4, always=False, s=None, mat="glass", ink=2, push=0.006, outline=True):
    """Window panes: quads of 4 world points (counter-clockwise seen from outside), pushed out along
    `normal`. Each can be lit: about `ratio` of them, or all with `always`. Returns the part."""
    if not quads:
        return None
    n = Vector(normal).normalized() * push
    verts, faces, lights = [], [], []
    for quad in quads:
        base = len(verts)
        verts += [Vector(p) + n for p in quad]
        faces.append((base, base + 1, base + 2, base + 3))
        c = sum((Vector(p) for p in quad), Vector()) / 4
        on = always or is_lit(c, ratio)
        lights.append((s if s is not None else timing(c)) if on else None)
    return sc.part(Mesh(verts, faces), mat=mat, ink=ink, light=lights, light_group=list(range(len(faces))),
                   intersect=False, crease=(40, 60), draw=outline, name="panes")


def grid(origin, u, v, width, height, cols, rows, mu=0.08, mv=0.1, gu=0.08, gv=0.12):
    """Window rectangles on a wall. `origin` is the wall's lower left corner seen from outside, u runs
    along it and v up (unit vectors); margins mu/mv, gaps gu/gv."""
    o, u, v = Vector(origin), Vector(u), Vector(v)
    cw = (width - 2 * mu - (cols - 1) * gu) / cols
    ch = (height - 2 * mv - (rows - 1) * gv) / rows
    quads = []
    for r in range(rows):
        for c in range(cols):
            u0, v0 = mu + c * (cw + gu), mv + r * (ch + gv)
            quads.append([o + u * u0 + v * v0, o + u * (u0 + cw) + v * v0, o + u * (u0 + cw) + v * (v0 + ch), o + u * u0 + v * (v0 + ch)])
    return quads


def box_windows(sc, b, cols_z, cols_x, rows, y0=None, y1=None, ratio=0.4, outline=True, **kw):
    """Panes on the two walls of box b = (x0, y0, z0, x1, y1, z1) the camera sees: +z (cols_z across)
    and +x (cols_x across), `rows` high between heights y0 and y1."""
    x0, by0, z0, x1, by1, z1 = b
    y0 = by0 if y0 is None else y0
    y1 = by1 if y1 is None else y1
    out = []
    if cols_z:
        out.append(panes(sc, grid((x0, y0, z1), (1, 0, 0), (0, 1, 0), x1 - x0, y1 - y0, cols_z, rows, **kw), (0, 0, 1), ratio, outline=outline))
    if cols_x:
        out.append(panes(sc, grid((x1, y0, z1), (0, 0, -1), (0, 1, 0), z1 - z0, y1 - y0, cols_x, rows, **kw), (1, 0, 0), ratio, outline=outline))
    return out


# ---------------------------------------------------------------------------
# Things


def tree(sc, x, z, ground, r=0.24, trunk=0.2):
    sc.part(frustum(vec(x, ground, z), (0, 1, 0), 0.03, 0.03, trunk + r * 0.5, n=20), mat="wood", name="trunk")
    c = vec(x, ground + trunk + r, z)
    sc.part(uv_sphere(c, r, 48, 24), lines=False, intersect=False, flat=True, mat="foliage", name="canopy")
    sc.wire(circle_points(c, RIGHT, UP, r, n=96), k=0, region=True)


def cypress(sc, x, z, ground, h=0.7, r=0.1):
    sc.part(frustum(vec(x, ground, z), (0, 1, 0), 0.022, 0.022, 0.12, n=16), mat="wood", name="trunk")
    sc.part(frustum(vec(x, ground + 0.1, z), (0, 1, 0), r, 0.0, h, n=40), mat="foliage", radial=Y, crease=(40, 60), name="cypress")


def chair(sc, x, z, ground, facing=(0, 0, -1), w=0.36, d=0.34, seat=0.4, back=0.4, mat="dark"):
    """A chair facing `facing` (±x or ±z): seat and back as slabs, legs as lines."""
    fx, _, fz = facing
    hx, hz = (w / 2, d / 2) if fz else (d / 2, w / 2)
    ys = ground + seat
    sc.box(x - hx, ys - 0.06, z - hz, x + hx, ys, z + hz, mat=mat, name="seat")
    t = 0.06
    if fz:
        zb = z - fz * (hz - t / 2)
        sc.box(x - hx, ys, zb - t / 2, x + hx, ys + back, zb + t / 2, mat=mat, name="back")
    else:
        xb = x - fx * (hx - t / 2)
        sc.box(xb - t / 2, ys, z - hz, xb + t / 2, ys + back, z + hz, mat=mat, name="back")
    i = 0.04
    for sx in (-1, 1):
        for sz in (-1, 1):
            sc.wire([vec(x + sx * (hx - i), ys - 0.06, z + sz * (hz - i)), vec(x + sx * (hx - i), ground, z + sz * (hz - i))], k=1)


def lamp_post(sc, x, z, ground, h=1.4, s=None):
    sc.part(frustum(vec(x, ground, z), (0, 1, 0), 0.05, 0.035, 0.1, n=20), mat="metal", name="post-base")
    sc.wire([vec(x, ground + 0.1, z), vec(x, ground + h, z)], k=1)
    c = vec(x, ground + h + 0.07, z)
    sc.part(uv_sphere(c, 0.07, 24, 12), lines=False, intersect=False, flat=True, mat="lamp",
            light=timing(c) if s is None else s, name="lamp")
    sc.wire(circle_points(c, RIGHT, UP, 0.07, n=48), k=1, region=True)


def bulb(sc, c, r=0.045, s=None):
    c = Vector(c)
    sc.part(uv_sphere(c, r, 20, 10), lines=False, intersect=False, flat=True, mat="lamp",
            light=timing(c) if s is None else s, name="bulb")
    sc.wire(circle_points(c, RIGHT, UP, r, n=36), k=1, region=True)


def flag(sc, x, z, ground, h=0.42, w=0.2, fh=0.13, face="z"):
    """A small table flag: a pole and a flat flag, square to the grid."""
    sc.part(frustum(vec(x, ground, z), (0, 1, 0), 0.035, 0.03, 0.025, n=20), mat="metal", name="flag-base")
    sc.wire([vec(x, ground, z), vec(x, ground + h, z)], k=1)
    top = ground + h - 0.01
    if face == "z":
        q = [vec(x, top - fh, z), vec(x + w, top - fh, z), vec(x + w, top, z), vec(x, top, z)]
    else:
        q = [vec(x, top - fh, z), vec(x, top - fh, z - w), vec(x, top, z - w), vec(x, top, z)]
    sc.part(Mesh(q, [(0, 1, 2, 3)]), mat="light", ink=1, intersect=False, name="flag")


# ---------------------------------------------------------------------------
# Surfaces of revolution


def bezier(points, n):
    """Quadratic or cubic Bezier through control points (r, y), as n + 1 samples."""
    out = []
    for i in range(n + 1):
        t = i / n
        if len(points) == 3:
            w = ((1 - t) ** 2, 2 * (1 - t) * t, t * t)
        else:
            w = ((1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3)
        out.append((sum(wi * p[0] for wi, p in zip(w, points)), sum(wi * p[1] for wi, p in zip(w, points))))
    return out


class Lathe:
    """A profile (r, y) revolved about an axis: a mesh for occlusion, rings and
    rims from the mesh, and the exact outline in the iso view as wires.

    `corners` are profile indices where the profile turns sharply; the outline
    is computed separately on each smooth run between them."""

    def __init__(self, profile, origin, axis=(0, 1, 0), corners=(), seg=0.025):
        self.profile = [(float(r), float(y)) for r, y in profile]
        u = vec(*axis).normalized()
        rot = Y.rotation_difference(u).to_matrix()
        self.o, self.e1, self.u, self.e3 = vec(*origin), rot @ vec(1, 0, 0), u, rot @ vec(0, 0, 1)
        self.corners = sorted(set(corners))
        widest = max(r for r, _ in self.profile)
        self.n = max(32, min(192, math.ceil(2 * math.pi * widest / seg)))

    def point(self, r, y, phi):
        return self.o + self.e1 * (r * math.cos(phi)) + self.u * y + self.e3 * (r * math.sin(phi))

    def mesh(self):
        verts, rings = [], []
        for r, y in self.profile:
            if r < 1e-9:
                rings.append([len(verts)])
                verts.append(self.point(0, y, 0))
            else:
                ring = list(range(len(verts), len(verts) + self.n))
                verts += [self.point(r, y, 2 * math.pi * i / self.n) for i in range(self.n)]
                rings.append(ring)
        faces = []
        n = self.n
        for A, B in zip(rings, rings[1:]):
            if len(A) == 1 and len(B) == 1:
                continue
            if len(A) == 1:
                faces += [(A[0], B[i], B[(i + 1) % n]) for i in range(n)]
            elif len(B) == 1:
                faces += [(A[i], B[0], A[(i + 1) % n]) for i in range(n)]
            else:
                faces += [(A[i], B[i], B[(i + 1) % n], A[(i + 1) % n]) for i in range(n)]
        return Mesh(verts, faces)

    def outline(self, offset=0.003):
        """Silhouette curves: where the surface normal is perpendicular to the view."""
        a, b, c = self.e1.dot(C), self.e3.dot(C), self.u.dot(C)
        amp, delta = math.hypot(a, b), math.atan2(b, a)
        bounds = [0, *self.corners, len(self.profile) - 1]
        curves = []
        for s, e in zip(bounds, bounds[1:]):
            run = self.profile[s:e + 1]
            if len(run) < 2:
                continue
            branches = ([], [])
            for i, (r, y) in enumerate(run):
                i0, i1 = max(0, i - 1), min(len(run) - 1, i + 1)
                dr, dy = run[i1][0] - run[i0][0], run[i1][1] - run[i0][1]
                q = None
                if r > 1e-6 and abs(dy) > 1e-12 and amp > 1e-12:
                    q = dr * c / (dy * amp)
                if q is None or abs(q) > 1:
                    for br in branches:
                        if len(br) > 1:
                            curves.append(list(br))
                        br.clear()
                    continue
                for br, phi in zip(branches, (delta + math.acos(q), delta - math.acos(q))):
                    nrm = (self.e1 * math.cos(phi) + self.e3 * math.sin(phi)) * dy - self.u * dr
                    br.append(self.point(r, y, phi) + nrm.normalized() * offset)
            for br in branches:
                if len(br) > 1:
                    curves.append(list(br))
        return curves

    def radius_at(self, y):
        for (r0, y0), (r1, y1) in zip(self.profile, self.profile[1:]):
            if min(y0, y1) <= y <= max(y0, y1) and abs(y1 - y0) > 1e-12:
                return r0 + (r1 - r0) * (y - y0) / (y1 - y0)
        return None


def add_lathe(sc, lathe, k=0, mat="wall", **part_args):
    p = sc.part(lathe.mesh(), sil=False, intersect=False, crease=(40, 60), radial=lathe.u, mat=mat, **part_args)
    for curve in lathe.outline():
        sc.wire(curve, k=k, region=True)
    return p


def disc(sc, center, r, mat="wall", **kw):
    """A flat horizontal disc (a lathe of one ring)."""
    lathe = Lathe([(0, 0), (r, 0)], center)
    return sc.part(lathe.mesh(), sil=False, intersect=False, crease=(40, 60), mat=mat, **kw)


def cylinder(sc, base, r, h, mat="wall", n=None, **kw):
    """An upright cylinder: mesh outline is exact for vertical sides, so plain mesh edges will do."""
    if n is None:
        n = max(16, min(96, math.ceil(2 * math.pi * r / 0.03)))
    kw.setdefault("crease", (40, 60))  # smooth sides: no line on every facet
    return sc.part(frustum(vec(*base), (0, 1, 0), r, r, h, n=n), mat=mat, radial=Y, **kw)


def cone(sc, base, r0, r1, h, mat="wall", n=None, **kw):
    if n is None:
        n = max(16, min(96, math.ceil(2 * math.pi * max(r0, r1) / 0.03)))
    kw.setdefault("crease", (40, 60))
    return sc.part(frustum(vec(*base), (0, 1, 0), r0, r1, h, n=n), mat=mat, radial=Y, **kw)


def quad(sc, pts, **kw):
    return sc.part(Mesh([Vector(p) for p in pts], [(0, 1, 2, 3)]), intersect=False, **kw)


__all__ = [
    "Scene", "panes", "grid", "box_windows", "tree", "cypress", "chair", "lamp_post", "bulb", "flag",
    "bezier", "Lathe", "add_lathe", "disc", "cylinder", "cone", "quad", "timing", "is_lit", "hash01",
    "orient_outward",
]
