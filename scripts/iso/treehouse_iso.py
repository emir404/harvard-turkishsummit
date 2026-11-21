"""The David Rubenstein Treehouse in true isometric, for the program section.

The massing is the measured model in scripts/treehouse/treehouse.py (feet,
plan x east / y north): the level-3 outline, the 8 ft cant of level 2 down to
the ground-floor line, the belt and fascia bands, the timber trees and the
level-3 zig-zag, and the roof monitor. Here 10 ft = 1 unit, plan north is +z
and plan west is +x, so the camera sees the north and west fronts.

Glazing is glass by day and lights up for the evening; the plaza, trees, lamp
posts and benches run out to the edges so the page can fade them.
"""
import math

from mathutils import Vector

from geom import Mesh, orient_outward, vec
from kit import Scene, chair, grid, lamp_post, panes, timing, tree

# --- The measured plan (feet), clockwise from above.
NW, Nk, NE = (0.0, 143.8), (90.0, 143.8), (175.2, 121.3)
Ew, SE, Sk = (161.2, 72.1), (176.4, 23.7), (90.9, 0.0)
SW, Ww = (0.0, 0.0), (13.0, 72.1)
L3 = [NW, Nk, NE, Ew, SE, Sk, SW, Ww]
ZG, ZS, ZB0, ZB1, ZR0, ZR1 = 0.0, 18.8, 33.7, 38.1, 61.0, 66.8
CANT = 8.0


def inset(poly, d):
    """Mitred inward offset of a clockwise polygon, vertex for vertex (as in treehouse.py)."""
    out = []
    n = len(poly)
    for i in range(n):
        a, b, c = poly[i - 1], poly[i], poly[(i + 1) % n]
        e1 = _n2(b[0] - a[0], b[1] - a[1])
        e2 = _n2(c[0] - b[0], c[1] - b[1])
        n1, n2 = (e1[1], -e1[0]), (e2[1], -e2[0])
        p1 = (a[0] + n1[0] * d, a[1] + n1[1] * d)
        p2 = (b[0] + n2[0] * d, b[1] + n2[1] * d)
        den = e1[0] * e2[1] - e1[1] * e2[0]
        if abs(den) < 1e-9:
            out.append((b[0] + n1[0] * d, b[1] + n1[1] * d))
            continue
        t = ((p2[0] - p1[0]) * e2[1] - (p2[1] - p1[1]) * e2[0]) / den
        out.append((p1[0] + e1[0] * t, p1[1] + e1[1] * t))
    return out


def _n2(x, y):
    m = math.hypot(x, y)
    return (x / m, y / m)


S = inset(L3, CANT)  # the ground-floor line, and level 2's foot


def W(p, z):
    """Plan point (feet) and height (feet) -> world."""
    return vec(-(p[0] - 88.0) / 10.0, z / 10.0, (p[1] - 72.0) / 10.0)


def lerp2(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


class Side:
    """A run of the facade; u is feet along the level-3 line."""

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
        return W(lerp2(self.Lp[i], self.Lp[i + 1], f), z)

    def Sg(self, u, z):
        i, f = self._loc(u)
        return W(lerp2(self.Sp[i], self.Sp[i + 1], f), z)

    def C(self, u, t):
        """A point on the canted level-2 face: t = 0 at the soffit, 1 at the belt."""
        return self.Sg(u, ZS).lerp(self.L(u, ZB0), t)

    def spans(self):
        return list(zip(self.breaks[:-1], self.breaks[1:]))

    def out(self, u):
        """Outward horizontal normal of the span at u (world)."""
        i, _ = self._loc(u)
        a, b = W(self.Lp[i], 0), W(self.Lp[i + 1], 0)
        d = (b - a).normalized()
        n = vec(d.z, 0, -d.x)
        return n if n.dot(W(self.Lp[i], 0) - W((88.0, 72.0), 0)) > 0 else -n


NORTH = Side([0, 1, 2])
WEST = Side([0, 7, 6])


def ring_solid(sc, bottom, top, **kw):
    """A solid between two horizontal rings of world points with matching vertices (prism or loft)."""
    n = len(bottom)
    verts = list(bottom) + list(top)
    area = sum(bottom[i].x * bottom[(i + 1) % n].z - bottom[(i + 1) % n].x * bottom[i].z for i in range(n))
    faces = []
    for i in range(n):
        j = (i + 1) % n
        f = (i, j, n + j, n + i)
        d = top[j] - top[i] if (bottom[j] - bottom[i]).length < 1e-9 else bottom[j] - bottom[i]
        # Outward is to the right of each edge for a ring wound counter-clockwise in (x, z), to the left otherwise.
        out = vec(d.z, 0, -d.x) if area > 0 else vec(-d.z, 0, d.x)
        a, b, e = verts[i], verts[j], verts[n + i]
        if (b - a).cross(e - a).dot(out) < 0:
            f = tuple(reversed(f))
        faces.append(f)
    # Caps: top facing up, bottom facing down (the ring order decides the winding).
    top_f = tuple(range(n, 2 * n))
    bot_f = tuple(range(n))
    # Newell in x-z: a ring wound with negative x-z area faces +y.
    if area > 0:
        top_f = tuple(reversed(top_f))
    else:
        bot_f = tuple(reversed(bot_f))
    faces += [top_f, bot_f]
    return sc.part(Mesh(verts, faces), intersect=False, **kw)


def strip(sc, a0, a1, b1, b0, normal, push=0.03, **kw):
    """A flat timber member: the quad a0-a1-b1-b0, pushed out of its wall, as two triangles."""
    off = Vector(normal) * push
    q = [p + off for p in (a0, a1, b1, b0)]
    return sc.part(Mesh(q, [(0, 1, 2), (0, 2, 3)]), mat="wood", crease=(25, 60), intersect=False, name="timber", **kw)


def treehouse():
    sc = Scene()
    # --- The ground: plaza, Western Avenue to the north with its far sidewalk, all flush.
    big = 40.0
    kerb, far_kerb = (155.8 - 72.0) / 10, (173.8 - 72.0) / 10
    sc.box(-big, -0.3, -big, big, 0.0, kerb, mat="ground", name="plaza")
    sc.box(-big, -0.3, kerb, big, 0.0, far_kerb, mat="dark", name="road")
    sc.box(-big, -0.3, far_kerb, big, 0.0, big, mat="ground", name="sidewalk")
    for x in range(-14, 16, 2):
        sc.wire([vec(x, 0.002, (kerb + far_kerb) / 2), vec(x + 1.0, 0.002, (kerb + far_kerb) / 2)], k=3)
    lane_x = -(-14.0 - 88.0) / 10  # the laneway's edge to the west of the building
    sc.wire([vec(lane_x, 0.002, kerb - 0.4), vec(lane_x, 0.002, -big)], k=3)
    for z in (5.0, 2.0, -1.0, -4.0):
        sc.wire([vec(8.9, 0.002, z), vec(lane_x - 0.05, 0.002, z)], k=3)

    # --- Massing: ground floor, the canted level 2, and belt + level 3 + fascia as one ring.
    s_ring0 = [W(p, ZG) for p in S]
    s_ring1 = [W(p, ZS) for p in S]
    l_ring0 = [W(p, ZB0) for p in L3]
    l_ring1 = [W(p, ZR1) for p in L3]
    ring_solid(sc, s_ring0, s_ring1, mat="dark", name="level-1")
    ring_solid(sc, s_ring1, l_ring0, mat="wall", name="level-2")
    ring_solid(sc, l_ring0, l_ring1, mat="light", name="upper")

    # Band lines on the two fronts: top of the belt, underside of the fascia.
    for side in (NORTH, WEST):
        for z in (ZB1, ZR0):
            sc.wire([side.L(u, z) + side.out(u) * 0.004 for u in side.breaks], k=1)

    # --- Level 3 glazing: 5 ft bays split at the transom, on both fronts.
    zt = ZB1 + (ZR0 - ZB1) * 0.52
    for side in (NORTH, WEST):
        for a, b in side.spans():
            n_bays = max(1, round((b - a) / 5.0))
            for i in range(n_bays):
                u0 = a + (b - a) * i / n_bays + 0.45
                u1 = a + (b - a) * (i + 1) / n_bays - 0.45
                for z0, z1 in ((ZB1 + 0.6, zt - 0.35), (zt + 0.35, ZR0 - 0.6)):
                    q = [side.L(u0, z0), side.L(u1, z0), side.L(u1, z1), side.L(u0, z1)]
                    panes(sc, [q], side.out((u0 + u1) / 2), ratio=0.78, outline=False)
    # --- Level 2 glazing on the canted faces, between the belt and the soffit.
    for side in (NORTH, WEST):
        for a, b in side.spans():
            n = max(1, round((b - a) / 15.0))
            for i in range(n):
                u0 = a + (b - a) * i / n + 0.6
                u1 = a + (b - a) * (i + 1) / n - 0.6
                q = [side.C(u0, 0.1), side.C(u1, 0.1), side.C(u1, 0.9), side.C(u0, 0.9)]
                nrm = (q[1] - q[0]).cross(q[3] - q[0]).normalized()
                if nrm.dot(side.out((u0 + u1) / 2)) < 0:
                    nrm = -nrm
                panes(sc, [q], nrm, ratio=0.7, outline=False)
    # --- Ground floor: glazed bays between 15 ft piers on the north; a window, doors and a bay on the west.
    T = NORTH.total
    u = 0.0
    while u < T - 6:
        a, b = u + 1.6, min(u + 15.0, T) - 1.6
        if b - a > 5:
            entry = 75.0 <= u < 105.0
            z0 = 0.0 if entry else 1.2
            q = [NORTH.Sg(a, z0), NORTH.Sg(b, z0), NORTH.Sg(b, ZS - 3.0), NORTH.Sg(a, ZS - 3.0)]
            panes(sc, [q], NORTH.out((a + b) / 2), ratio=0.85, outline=False)
        u += 15.0
    wb = WEST.breaks[1]
    for a, b, z0, z1 in ((4.0, 11.0, 3.0, 13.5), (23.0, 26.6, 0.0, 8.6), (45.0, 48.6, 0.0, 8.6), (wb + 12.0, wb + 38.0, 1.2, 14.5)):
        q = [WEST.Sg(a, z0), WEST.Sg(b, z0), WEST.Sg(b, z1), WEST.Sg(a, z1)]
        panes(sc, [q], WEST.out((a + b) / 2), ratio=0.85, outline=False)

    # --- The timber: trees (a trunk on the ground floor, branching into a V on level 2) ...
    for t in (30.0, 90.0, 150.0):
        o = NORTH.out(t)
        along = (NORTH.Sg(t + 1, 0) - NORTH.Sg(t - 1, 0)).normalized()
        c0, c1 = NORTH.Sg(t, ZG), NORTH.Sg(t, ZS)
        w = along * 0.145
        trunk = [c0 - w + o * 0.03, c0 + w + o * 0.03, c1 + w + o * 0.03, c1 - w + o * 0.03]
        tw = Mesh([p for p in trunk] + [p + o * 0.12 for p in trunk],
                  [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])
        sc.part(orient_outward(tw), mat="wood", intersect=False, name="trunk")
        for b in (t - 15.0, t + 15.0):
            p0, p1 = NORTH.C(t, 0.0), NORTH.C(b, 1.0)
            nrm = (NORTH.C(t + 1, 0.0) - NORTH.C(t - 1, 0.0)).cross(NORTH.C(t, 1.0) - NORTH.C(t, 0.0)).normalized()
            if nrm.dot(o) < 0:
                nrm = -nrm
            ax = (p1 - p0).normalized()
            sd = ax.cross(nrm).normalized() * 0.13
            strip(sc, p0 - sd, p0 + sd, p1 + sd, p1 - sd, nrm, push=0.04)
    # ... and the level-3 zig-zag, from belt nodes to fascia nodes, ends square to the bands.
    tops = [0.0, 30.0, 60.0, 90.0, 120.0, 150.0, NORTH.total]
    for b in (15.0, 45.0, 75.0, 105.0, 135.0, 165.0):
        for t in sorted(tops, key=lambda x: abs(x - b))[:2]:
            run, rise = abs(t - b), ZR0 - ZB1
            h = 1.15 * math.hypot(run, rise) / rise
            q = [NORTH.L(b - h, ZB1), NORTH.L(b + h, ZB1), NORTH.L(t + h, ZR0), NORTH.L(t - h, ZR0)]
            strip(sc, *q, NORTH.out((b + t) / 2), push=0.035)
    # West: the corner diagonal.
    run, rise = 14.5, ZR0 - ZB1
    h = 1.15 * math.hypot(run, rise) / rise
    strip(sc, WEST.L(14.5 - h, ZB1), WEST.L(14.5 + h, ZB1), WEST.L(0 + h, ZR0), WEST.L(max(0.0, 0 - h), ZR0), WEST.out(5.0), push=0.035)

    # --- Roof: parapet line and the monitor over the atrium, its glazing lit.
    roof_in = inset(L3, 2.6)
    sc.wire([W(p, ZR1 + 0.02) for p in roof_in] + [W(roof_in[0], ZR1 + 0.02)], k=2)
    x0, x1, y0, y1, mh, st = 69.0, 108.0, 50.0, 69.0, 9.6, 2.2
    base = [(x0, y1), (x1, y1), (x1, y0), (x0, y0)]
    top = [(x0 + st, y1 - st), (x1 - st, y1 - st), (x1 - st, y0 + st), (x0 + st, y0 + st)]
    ring_solid(sc, [W(p, ZR1) for p in base], [W(p, ZR1 + mh) for p in top], mat="light", name="monitor")
    for (pa, pb, ta, tb, nb) in ((base[0], base[1], top[0], top[1], 6), (base[3], base[0], top[3], top[0], 3)):
        quads = []

        def on_face(f, s):
            # f along the face, s up it (0 at the roof, 1 at the monitor's top), on the sloped plane itself
            return W(lerp2(lerp2(pa, ta, s), lerp2(pb, tb, s), f), ZR1 + mh * s)

        for i in range(nb):
            f0, f1 = (i + 0.16) / nb, (i + 0.84) / nb
            quads.append([on_face(f0, 0.14), on_face(f1, 0.14), on_face(f1, 0.84), on_face(f0, 0.84)])
        nrm = (quads[0][1] - quads[0][0]).cross(quads[0][3] - quads[0][0]).normalized()
        if nrm.dot(W(lerp2(pa, pb, 0.5), 0) - W(((x0 + x1) / 2, (y0 + y1) / 2), 0)) < 0:
            nrm = -nrm
        panes(sc, quads, nrm, ratio=0.9, outline=False)

    # Rooftop plant: a few low units.
    for (px, py, w, d, h) in ((132.0, 98.0, 14.0, 9.0, 4.0), (38.0, 108.0, 10.0, 12.0, 3.4), (128.0, 34.0, 11.0, 8.0, 3.0)):
        a0, a1 = W((px - w / 2, py + d / 2), ZR1), W((px + w / 2, py - d / 2), ZR1 + h)
        sc.box(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, mat="metal", name="plant")

    # --- The plaza: trees along Western Avenue and on the west, lamp posts, benches.
    zt_row = (kerb + (143.8 - 72.0) / 10 + 0.0) / 2 + 0.25
    for x in (-8.5, -5.6, -2.7, 0.2, 3.1, 6.0, 9.4):
        tree(sc, x, zt_row, 0.0, r=0.42, trunk=0.45)
    for x in (-7.0, -1.25, 4.55):
        lamp_post(sc, x, zt_row, 0.0, h=1.15)
    for x in (-9.0, -4.0, 1.0, 6.0, 11.0):
        tree(sc, x, far_kerb + 0.9, 0.0, r=0.4, trunk=0.45)
    for z in (4.6, 0.6, -3.4, -7.4):
        tree(sc, lane_x + 0.9, z, 0.0, r=0.42, trunk=0.45)
    for z in (2.6, -1.4, -5.4):
        lamp_post(sc, lane_x - 0.5, z, 0.0, h=1.15)
        sc.box(lane_x - 1.15, 0.0, z - 0.75, lane_x - 0.85, 0.16, z + 0.75, mat="wood", name="bench")
        sc.box(lane_x - 1.15, 0.16, z - 0.75, lane_x - 1.08, 0.38, z + 0.75, mat="wood", name="bench-back")

    # Frame: the building in the middle, with plaza all round, 960 x 680.
    from hlr import proj
    pts = [W(p, z) for p in L3 for z in (ZG, ZR1)] + [W(p, ZR1 + mh) for p in top]
    xs = [proj(p)[0] for p in pts]
    ys = [proj(p)[1] for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    w = (max(xs) - min(xs)) / 0.64
    hgt = w * 680 / 960
    frame = (cx - w / 2, cx + w / 2, cy - hgt / 2 - 0.4, cy + hgt / 2 - 0.4)
    return {
        "parts": sc.parts, "wires": sc.wires, "frame": frame, "scale": 960 / w,
        "order": lambda p: p.y, "clip": True, "fills": True,
    }


def _box_from(a, b):
    return (min(a.x, b.x), min(a.y, b.y), min(a.z, b.z), max(a.x, b.x), max(a.y, b.y), max(a.z, b.z))
