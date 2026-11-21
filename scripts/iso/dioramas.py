"""Panel dioramas: one small scene per part of the program, each on the same
stepped square plinth, framed identically in a 320 x 320 viewBox so they line
up on the cards. Drawn for day and night: lights are what can glow at night.
"""
import math

from mathutils import Vector

from geom import Mesh, box, circle_points, frustum, helix_band, prism, vec
from hlr import RIGHT, UP, proj
from kit import (
    Lathe, Scene, add_lathe, bezier, box_windows, bulb, chair, cone, cylinder, disc, flag, grid, lamp_post, panes,
    quad, timing, tree,
)

BOX = 320.0
SCALE = 45.0  # viewBox px per world unit, shared by every diorama
PAD = 14.0  # below the plinth's front corner
BASE, BASE_T = 4.2, 0.16
TOPW, TOP_T = 3.96, 0.12
G = BASE_T + TOP_T  # the plinth's top: everything stands here
EDGE = TOPW / 2


def plinth(sc):
    b, t = BASE / 2, TOPW / 2
    sc.box(-b, 0, -b, b, BASE_T, b, mat="plinth", name="plinth")
    sc.box(-t, BASE_T, -t, t, G, t, mat="plinth", name="plinth-top")


def frame():
    b = BASE / 2
    front = proj(vec(b, 0, b))[1]
    fy1 = front + (BOX - PAD) / SCALE
    half = BOX / 2 / SCALE
    return (-half, half, fy1 - BOX / SCALE, fy1)


def finish(sc):
    return {"parts": sc.parts, "wires": sc.wires, "frame": frame(), "scale": SCALE, "order": lambda p: p.y, "fills": True}


def zigzag(a, b, c, d, n):
    """A truss lattice on the quad a-b-c-d (a, b along the bottom; d, c along the top): n bays of diagonals."""
    pts = []
    for i in range(n + 1):
        t = i / n
        bottom, top = a.lerp(b, t), d.lerp(c, t)
        pts.append(bottom if i % 2 == 0 else top)
    return pts


# ---------------------------------------------------------------------------


def keynote():
    sc = Scene()
    plinth(sc)
    # Stage across the back half, with two steps up at the front.
    S = G + 0.3
    sc.box(-1.85, G, -1.85, 1.85, S, -0.15, mat="wood", name="stage")
    sc.box(-0.42, G, -0.15, 0.42, G + 0.1, 0.14, mat="wood", name="step")
    sc.box(-0.42, G, -0.15, 0.42, G + 0.2, -0.01, mat="wood", name="step")
    # The big screen at the back, lit, with a chart on it.
    sc.box(-1.25, S + 0.72, -1.8, 1.25, S + 2.12, -1.7, mat="dark", name="screen")
    for x in (-0.9, 0.9):
        sc.box(x - 0.04, S, -1.79, x + 0.04, S + 0.73, -1.71, mat="metal", name="screen-post")
    zf = -1.7
    panel = [vec(-1.15, S + 0.82, zf), vec(1.15, S + 0.82, zf), vec(1.15, S + 2.02, zf), vec(-1.15, S + 2.02, zf)]
    panes(sc, [panel], (0, 0, 1), always=True, s=0.05, ink=1, mat="light")
    zc = zf + 0.012
    chart = [(-0.95, 0.25), (-0.55, 0.42), (-0.2, 0.36), (0.2, 0.66), (0.55, 0.6), (0.95, 0.98)]
    sc.wire([vec(x, S + 0.82 + y, zc) for x, y in chart], k=0)
    for i, h in enumerate((0.18, 0.28, 0.4, 0.55)):
        x = -0.95 + i * 0.22
        sc.wire([vec(x, S + 0.92, zc), vec(x, S + 0.92 + h * 0.6, zc), vec(x + 0.12, S + 0.92 + h * 0.6, zc), vec(x + 0.12, S + 0.92, zc)], k=1)
    # Podium with a microphone, facing the audience (+z).
    px, pz = 1.0, -0.72
    sc.box(px - 0.3, S, pz - 0.22, px + 0.3, S + 0.95, pz + 0.22, mat="wood", name="podium")
    sc.box(px - 0.35, S + 0.95, pz - 0.27, px + 0.35, S + 1.02, pz + 0.27, mat="wood", name="podium-top")
    f = pz + 0.22 + 0.004
    sc.wire([vec(px - 0.22, S + 0.12, f), vec(px + 0.22, S + 0.12, f), vec(px + 0.22, S + 0.84, f), vec(px - 0.22, S + 0.84, f)], k=2, closed=True)
    sc.wire(circle_points(vec(px, S + 0.58, f), (1, 0, 0), (0, 1, 0), 0.12, n=64), k=2)
    sc.wire([vec(px - 0.16, S + 1.02, pz - 0.12), vec(px - 0.16, S + 1.32, pz - 0.12)], k=1)
    sc.box(px - 0.19, S + 1.3, pz - 0.2, px - 0.13, S + 1.36, pz - 0.06, mat="dark", name="mic")
    # Lighting truss over the front of the stage on two towers, lamps facing the audience.
    top = G + 3.05
    for x in (-1.78, 1.78):
        x0, x1, z0, z1 = x - 0.07, x + 0.07, -0.32, -0.18
        sc.box(x0, G, z0, x1, top, z1, mat="metal", name="truss-tower")
        lattice = [vec(x0 if i % 2 == 0 else x1, G + 0.05 + (top - G - 0.05) * i / 16, z1 + 0.003) for i in range(17)]
        sc.wire(lattice, k=2)
    sc.box(-1.85, top, -0.32, 1.85, top + 0.15, -0.18, mat="metal", name="truss")
    sc.wire(zigzag(vec(-1.71, top, -0.177), vec(1.71, top, -0.177), vec(1.71, top + 0.15, -0.177), vec(-1.71, top + 0.15, -0.177), 22), k=2)
    for i, x in enumerate((-1.3, -0.65, 0.0, 0.65, 1.3)):
        cy, cz = top - 0.2, -0.25
        sc.wire([vec(x, top, cz), vec(x, cy + 0.085, cz)], k=1)
        sc.part(frustum(vec(x, cy, cz - 0.1), (0, 0, 1), 0.07, 0.085, 0.2, n=40), mat="dark", radial=vec(0, 0, 1), name="can")
        lens = Lathe([(0, 0), (0.07, 0)], (x, cy, cz + 0.104), axis=(0, 0, 1))
        sc.part(lens.mesh(), mat="lamp", light=round(0.1 + 0.15 * i, 3), intersect=False, ink=1, name="lens")
    # Two rows of chairs facing the stage.
    for z in (0.62, 1.32):
        for x in (-1.44, -0.72, 0.0, 0.72, 1.44):
            chair(sc, x, z, G, facing=(0, 0, -1))
    return finish(sc)


def biotech():
    sc = Scene()
    plinth(sc)
    # Lab bench along the back: cabinets under a worktop.
    B = G + 1.0
    sc.box(-1.85, B - 0.07, -1.7, 1.2, B, -0.72, mat="light", name="worktop")
    for x0, x1 in ((-1.8, -0.6), (-0.05, 1.15)):
        sc.box(x0, G, -1.65, x1, B - 0.07, -0.78, mat="wall", name="cabinet")
        f = -0.78 + 0.004
        mid = (x0 + x1) / 2
        for a, b in ((x0 + 0.06, mid - 0.03), (mid + 0.03, x1 - 0.06)):
            sc.wire([vec(a, G + 0.08, f), vec(b, G + 0.08, f), vec(b, B - 0.14, f), vec(a, B - 0.14, f)], k=2, closed=True)
    # Microscope: base, pillar, arm, stage, tube.
    mx, mz = -1.25, -1.2
    sc.box(mx - 0.16, B, mz - 0.2, mx + 0.16, B + 0.06, mz + 0.2, mat="dark", name="scope-base")
    sc.box(mx - 0.05, B + 0.06, mz - 0.18, mx + 0.05, B + 0.62, mz - 0.08, mat="dark", name="scope-pillar")
    sc.box(mx - 0.05, B + 0.5, mz - 0.18, mx + 0.05, B + 0.6, mz + 0.06, mat="dark", name="scope-arm")
    sc.box(mx - 0.14, B + 0.24, mz - 0.08, mx + 0.14, B + 0.28, mz + 0.16, mat="metal", name="scope-stage")
    cylinder(sc, (mx, B + 0.33, mz + 0.04), 0.045, 0.17, mat="metal", name="objective")
    cylinder(sc, (mx, B + 0.6, mz + 0.04), 0.05, 0.28, mat="dark", name="eyepiece")
    # Test-tube rack.
    rx, rz = -0.72, -1.0
    sc.box(rx - 0.32, B, rz - 0.1, rx - 0.28, B + 0.24, rz + 0.1, mat="wood", name="rack-end")
    sc.box(rx + 0.28, B, rz - 0.1, rx + 0.32, B + 0.24, rz + 0.1, mat="wood", name="rack-end")
    sc.box(rx - 0.3, B + 0.16, rz - 0.1, rx + 0.3, B + 0.2, rz + 0.1, mat="wood", name="rack-shelf")
    for i in range(4):
        x = rx - 0.15 + i * 0.1
        cylinder(sc, (x, B + 0.02, rz), 0.028, 0.34 + 0.03 * (i % 2), mat="light", name="tube")
    # Flasks.
    flask = [(0, 0), (0.16, 0), (0.165, 0.02)] + bezier([(0.165, 0.02), (0.15, 0.12), (0.06, 0.24), (0.05, 0.3)], 12)[1:] + [(0.05, 0.42), (0.065, 0.43), (0.065, 0.45)]
    add_lathe(sc, Lathe(flask, (-0.25, B + 0.002, -0.98), corners=(1,)), mat="light")
    beaker = [(0, 0), (0.12, 0), (0.12, 0.3), (0.135, 0.31)]
    add_lathe(sc, Lathe(beaker, (0.05, B + 0.002, -0.86), corners=(1, 2)), mat="light")
    # Monitor, its screen lit.
    vx, vz = 0.62, -1.3
    sc.box(vx - 0.13, B, vz - 0.12, vx + 0.13, B + 0.03, vz + 0.1, mat="dark", name="monitor-foot")
    sc.box(vx - 0.03, B + 0.03, vz - 0.08, vx + 0.03, B + 0.24, vz - 0.03, mat="dark", name="monitor-neck")
    sc.box(vx - 0.42, B + 0.22, vz - 0.03, vx + 0.42, B + 0.72, vz + 0.03, mat="dark", name="monitor")
    zf = vz + 0.03
    panes(sc, [[vec(vx - 0.38, B + 0.26, zf), vec(vx + 0.38, B + 0.26, zf), vec(vx + 0.38, B + 0.68, zf), vec(vx - 0.38, B + 0.68, zf)]], (0, 0, 1), always=True, s=0.08, ink=1, mat="light")
    zc = zf + 0.012
    trace = [(vx - 0.32 + 0.64 * i / 24, B + 0.47 + 0.12 * math.sin(i * 0.9) * (1 if i % 4 else 1.8)) for i in range(25)]
    sc.wire([vec(x, y, zc) for x, y in trace], k=0)
    # A stool in front of the bench.
    sx, sz = 0.75, 0.35
    cylinder(sc, (sx, G + 0.62, sz), 0.2, 0.06, mat="dark", name="stool-seat")
    sc.wire([vec(sx, G, sz), vec(sx, G + 0.62, sz)], k=1)
    disc(sc, (sx, G + 0.005, sz), 0.2, mat="dark", ink=1, name="stool-foot")
    # A DNA model on a stand, front right.
    dx, dz = -0.95, 1.0
    cylinder(sc, (dx, G, dz), 0.42, 0.08, mat="dark", name="dna-base")
    cylinder(sc, (dx, G + 0.08, dz), 0.04, 0.22, mat="metal", name="dna-stem")
    y0, y1 = G + 0.3, G + 2.6
    R, turns, w = 0.36, 1.2, 0.13
    for phase in (0.0, math.pi):
        sc.part(helix_band(R, y0, y1, turns, phase, w, n=200, center=(dx, 0, dz)), crease=(40, 60), mat="light", name="strand")
    for i in range(7):
        t = (i + 0.5) / 7
        y = y0 + (y1 - y0) * t
        theta = 2 * math.pi * turns * t
        d = vec(math.cos(theta), 0, math.sin(theta))
        L = R - 0.02
        sc.part(frustum(vec(dx, y, dz) - d * L, d, 0.035, 0.035, 2 * L, n=32), mat="metal", name="rung")
    # The lab's back wall, with a window over the bench and a shelf of reagents.
    sc.box(-1.98, G, -1.98, 1.98, G + 2.35, -1.88, mat="wall", name="back-wall")
    panes(sc, grid((-1.6, B + 0.55, -1.88), (1, 0, 0), (0, 1, 0), 1.5, 0.8, 3, 2, mu=0.05, mv=0.05, gu=0.05, gv=0.05), (0, 0, 1), ratio=0.5)
    sc.box(0.05, B + 0.95, -1.88, 1.15, B + 0.99, -1.66, mat="wood", name="shelf")
    for i, (x, h, r) in enumerate(((0.28, 0.26, 0.065), (0.56, 0.3, 0.06), (0.86, 0.22, 0.07))):
        bottle = [(0, 0), (r, 0), (r, h * 0.7)] + bezier([(r, h * 0.7), (r, h * 0.85), (r * 0.45, h * 0.88), (r * 0.42, h)], 6)[1:]
        add_lathe(sc, Lathe(bottle, (x, B + 0.992, -1.77), corners=(1, 2)), mat="light" if i % 2 else "glass")
    # A lab fridge in the corner, its display lit.
    sc.box(1.32, G, -1.86, 1.95, G + 2.0, -1.2, mat="light", name="fridge")
    f = -1.2 + 0.004
    sc.wire([vec(1.36, G + 1.3, f), vec(1.91, G + 1.3, f)], k=1)
    sc.wire([vec(1.86, G + 1.05, f), vec(1.86, G + 1.22, f)], k=1)
    sc.wire([vec(1.86, G + 1.42, f), vec(1.86, G + 1.62, f)], k=1)
    panes(sc, [[vec(1.42, G + 1.72, f), vec(1.66, G + 1.72, f), vec(1.66, G + 1.84, f), vec(1.42, G + 1.84, f)]], (0, 0, 1), always=True, s=0.2, ink=1)
    return finish(sc)


def turbine(sc, x, z, h, blade=0.78, phase=100):
    cone(sc, (x, G, z), 0.075, 0.038, h, mat="light", name="tower")
    yh = G + h + 0.05
    sc.box(x - 0.055, yh - 0.05, z - 0.12, x + 0.055, yh + 0.05, z + 0.17, mat="light", name="nacelle")
    zr = z + 0.17
    sc.part(frustum(vec(x, yh, zr), (0, 0, 1), 0.05, 0.0, 0.1, n=32), mat="light", radial=vec(0, 0, 1), name="hub")
    for k in range(3):
        a = math.radians(phase + 120 * k)
        local = [(0.035, -0.035), (0.24, -0.055), (blade, -0.006), (blade, 0.012), (0.24, 0.03), (0.035, 0.035)]
        ca, sa = math.cos(a), math.sin(a)
        pts = [vec(x + u * ca - v * sa, yh + u * sa + v * ca, zr + 0.035) for u, v in local]
        sc.part(Mesh(pts, [(0, 1, 4, 5), (1, 2, 3, 4)]), mat="light", crease=(40, 60), intersect=False, name="blade")
    bulb(sc, (x, yh + 0.09, z - 0.02), r=0.032)


def energy():
    sc = Scene()
    plinth(sc)
    # Three turbines across the back.
    turbine(sc, -1.55, 0.0, 2.25, phase=95)
    turbine(sc, -0.75, -0.95, 2.65, phase=115)
    turbine(sc, 0.35, -1.6, 2.4, phase=80)
    # A solar array in rows at the front left, gently inclined to the south (+z).
    tilt = math.radians(18)
    for z in (0.45, 0.98, 1.51):
        x0, x1, depth, yc = -1.82, -0.18, 0.38, G + 0.3
        dz, dy = math.cos(tilt) * depth / 2, math.sin(tilt) * depth / 2
        a, b = vec(x0, yc + dy, z - dz), vec(x1, yc + dy, z - dz)
        c, d = vec(x1, yc - dy, z + dz), vec(x0, yc - dy, z + dz)
        t = 0.045
        sc.part(prism([d, c, b, a], (0, -t, 0)), mat="glass", name="panel")
        n = vec(0, math.cos(tilt), math.sin(tilt))
        lift = n * 0.004
        for i in range(1, 5):
            u = i / 5
            sc.wire([a.lerp(b, u) + lift, d.lerp(c, u) + lift], k=2)
        sc.wire([a.lerp(d, 0.5) + lift, b.lerp(c, 0.5) + lift], k=2)
        for xl in (x0 + 0.15, (x0 + x1) / 2, x1 - 0.15):
            sc.wire([vec(xl, G, z + dz * 0.6), vec(xl, yc - dy - t + 0.02, z + dz * 0.6)], k=1)
            sc.wire([vec(xl, G, z - dz * 0.6), vec(xl, yc + dy - t, z - dz * 0.6)], k=1)
    # A substation in the middle: pad, two transformers, a gantry, a fence.
    sx0, sx1, sz0, sz1 = 0.28, 1.22, -0.98, -0.14
    sc.box(sx0, G, sz0, sx1, G + 0.05, sz1, mat="ground", name="pad")
    gy = G + 0.05
    for tx in (0.5, 0.92):
        sc.box(tx - 0.14, gy, -0.62, tx + 0.14, gy + 0.3, -0.32, mat="metal", name="transformer")
        for i in range(1, 5):
            xx = tx - 0.14 + 0.28 * i / 5
            sc.wire([vec(xx, gy + 0.04, -0.316), vec(xx, gy + 0.26, -0.316)], k=2)
        for dx in (-0.07, 0.0, 0.07):
            cylinder(sc, (tx + dx, gy + 0.3, -0.54), 0.022, 0.16, mat="light", name="bushing")
    gz = -0.84
    for x in (sx0 + 0.08, sx1 - 0.08):
        sc.wire([vec(x, gy, gz), vec(x, gy + 0.8, gz)], k=1)
    sc.wire([vec(sx0 + 0.08, gy + 0.8, gz), vec(sx1 - 0.08, gy + 0.8, gz)], k=1)
    posts = [vec(sx0, gy, sz0), vec(sx1, gy, sz0), vec(sx1, gy, sz1), vec(sx0, gy, sz1)]
    for i in range(4):
        a, b = posts[i], posts[(i + 1) % 4]
        for j in range(2):
            p = a.lerp(b, j / 2)
            sc.wire([p, p + vec(0, 0.24, 0)], k=2)
        sc.wire([a + vec(0, 0.24, 0), b + vec(0, 0.24, 0)], k=2)
        sc.wire([a + vec(0, 0.12, 0), b + vec(0, 0.12, 0)], k=2)
    lamp_post(sc, sx1 - 0.05, sz1 - 0.05, gy, h=0.9)
    # A transmission pylon, front right: an open lattice of lines.
    px, pz, ph = 1.32, 1.22, 2.25
    base, topw = 0.24, 0.07
    corners = lambda y, w: [vec(px - w, y, pz - w), vec(px + w, y, pz - w), vec(px + w, y, pz + w), vec(px - w, y, pz + w)]
    lv = [0.0, 0.55, 1.05, 1.5, 1.85, ph]
    rings = [corners(G + y, base + (topw - base) * y / ph) for y in lv]
    for k in range(4):
        sc.wire([r[k] for r in rings], k=1)
    for r in rings[1:]:
        sc.wire(r + [r[0]], k=2)
    for r0, r1 in zip(rings, rings[1:]):
        for k in (1, 2):  # bracing on the two faces the camera sees
            sc.wire([r0[k], r1[(k + 1) % 4]], k=2)
            sc.wire([r0[(k + 1) % 4], r1[k]], k=2)
    tips = []
    for y, reach in ((G + 1.85, 0.55), (G + 2.12, 0.42)):
        sc.wire([vec(px - reach, y, pz), vec(px + reach, y, pz)], k=1)
        for sgn in (-1, 1):
            tip = vec(px + sgn * reach, y, pz)
            sc.wire([tip, tip - vec(0, 0.14, 0)], k=1)
            tips.append(tip - vec(0, 0.14, 0))
    # Lines away to the back of the plinth and down to the gantry.
    def sag(a, b, d=0.12, n=20):
        return [a.lerp(b, t) - vec(0, d * 4 * t * (1 - t), 0) for t in [i / n for i in range(n + 1)]]
    targets = [vec(sx0 + 0.18 + (sx1 - sx0 - 0.36) * i / 3, gy + 0.8, gz) for i in range(4)]
    for tip, target in zip(sorted(tips, key=lambda t: t.x), targets):
        sc.wire(sag(tip, target, d=0.14), k=2)
    return finish(sc)


def economy():
    sc = Scene()
    plinth(sc)
    towers = [
        ((-1.85, -1.85, -0.95, -0.95), 3.35, 10),
        ((-0.75, -1.85, 0.1, -1.15), 2.45, 7),
        ((0.3, -1.85, 1.85, -1.05), 1.7, 5),
        ((1.05, -0.8, 1.85, 0.15), 2.75, 8),
    ]
    for (x0, z0, x1, z1), h, rows in towers:
        b = (x0, G, z0, x1, G + h, z1)
        sc.box(*b, mat="wall", name="tower")
        # Ribbon windows, one pane per floor and face.
        box_windows(sc, b, 1, 1, rows, y0=G + 0.12, y1=G + h - 0.1, ratio=0.42, mu=0.06, mv=0.03, gu=0.06, gv=0.11)
        # Mullions on the ribbons.
        for (o, u, w, n) in (((x0, 0, z1), vec(1, 0, 0), x1 - x0, vec(0, 0, 1)), ((x1, 0, z1), vec(0, 0, -1), z1 - z0, vec(1, 0, 0))):
            cols = max(2, int(w / 0.22))
            for c in range(1, cols):
                p = vec(*o) + u * (w * c / cols) + n * 0.012
                sc.wire([vec(p.x, G + 0.12, p.z), vec(p.x, G + h - 0.1, p.z)], k=2)
    # Crowns and roof boxes.
    sc.box(-1.7, G + 3.35, -1.7, -1.1, G + 3.62, -1.1, mat="wall", name="crown")
    sc.wire([vec(-1.4, G + 3.62, -1.4), vec(-1.4, G + 4.15, -1.4)], k=1)
    sc.box(-0.6, G + 2.45, -1.75, -0.05, G + 2.65, -1.25, mat="wall", name="crown")
    sc.box(0.55, G + 1.7, -1.7, 1.0, G + 1.9, -1.3, mat="metal", name="plant")
    sc.box(1.2, G + 2.75, -0.62, 1.7, G + 2.92, 0.0, mat="wall", name="crown")
    # The exchange: steps, hall, a portico of columns and a pediment.
    sc.box(-1.85, G, -0.4, 0.6, G + 0.08, 1.8, mat="stone", name="step")
    sc.box(-1.75, G + 0.08, -0.32, 0.5, G + 0.16, 1.7, mat="stone", name="step")
    yt = G + 1.02
    sc.box(-1.6, G + 0.16, -0.2, 0.35, yt - 0.16, 1.18, mat="stone", name="hall")
    sc.box(-1.62, yt - 0.16, -0.22, 0.37, yt, 1.56, mat="stone", name="entablature")
    for i in range(6):
        x = -1.42 + i * 0.33
        cylinder(sc, (x, G + 0.16, 1.38), 0.07, yt - 0.16 - G - 0.16, mat="stone", name="column")
    tri = [vec(-1.62, yt, 1.56), vec(0.37, yt, 1.56), vec(-0.625, yt + 0.34, 1.56)]
    sc.part(prism(tri, (0, 0, -1.78)), mat="roof", name="pediment")
    sc.wire([vec(-1.38, yt + 0.05, 1.564), vec(0.13, yt + 0.05, 1.564), vec(-0.625, yt + 0.26, 1.564), vec(-1.38, yt + 0.05, 1.564)], k=2)
    for z in (0.1, 0.5, 0.9):
        f = 0.35 + 0.004
        sc.wire([vec(f, G + 0.3, z - 0.1), vec(f, G + 0.3, z + 0.1), vec(f, G + 0.7, z + 0.1), vec(f, G + 0.7, z - 0.1)], k=2, closed=True)
    # Trees along the front right.
    for x, z, r in ((1.0, 0.75, 0.22), (1.6, 1.15, 0.25), (1.05, 1.62, 0.2)):
        tree(sc, x, z, G, r=r)
    return finish(sc)


def geopolitics():
    sc = Scene()
    plinth(sc)
    H = 2.5
    # Two walls make a room corner; tall windows in both.
    sc.box(-EDGE, G, -EDGE, EDGE, G + H, -1.86, mat="wall", name="back-wall")
    sc.box(-EDGE, G, -1.86, -1.86, G + H, EDGE, mat="wall", name="side-wall")
    for x in (-1.2, -0.2, 0.8):
        q = grid((x, G + 0.45, -1.86), (1, 0, 0), (0, 1, 0), 0.72, 1.75, 2, 3, mu=0.04, mv=0.04, gu=0.04, gv=0.04)
        p = panes(sc, q, (0, 0, 1), ratio=0.0)
        on = timing(vec(x, G + 1.2, -1.86))
        p.light = [on if (x != -0.2) else None] * len(q)
        p.light_group = [0] * len(q)
    for z in (-1.0, 0.0, 1.0):
        q = grid((-1.86, G + 0.45, z + 0.36), (0, 0, -1), (0, 1, 0), 0.72, 1.75, 2, 3, mu=0.04, mv=0.04, gu=0.04, gv=0.04)
        p = panes(sc, q, (1, 0, 0), ratio=0.0)
        on = timing(vec(-1.86, G + 1.2, z))
        p.light = [on if z != 0.0 else None] * len(q)
        p.light_group = [0] * len(q)
    # A rug, the table, chairs round it, and flags on it.
    sc.box(-1.25, G, -0.85, 1.35, G + 0.02, 0.85, mat="dark", ink=1, name="rug")
    T = G + 0.62
    sc.box(-1.0, T - 0.06, -0.42, 1.05, T, 0.42, mat="wood", name="table")
    for x in (-0.72, 0.78):
        sc.box(x - 0.04, G + 0.02, -0.3, x + 0.04, T - 0.06, 0.3, mat="wood", name="table-leg")
    for x in (-0.55, 0.05, 0.65):
        chair(sc, x, -0.72, G + 0.02, facing=(0, 0, 1), back=0.5)
        chair(sc, x, 0.72, G + 0.02, facing=(0, 0, -1), back=0.5)
        flag(sc, x - 0.08, 0.0, T, h=0.55, w=0.27, fh=0.17, face="z")
    chair(sc, -1.3, 0.0, G + 0.02, facing=(1, 0, 0), back=0.5)
    chair(sc, 1.36, 0.0, G + 0.02, facing=(-1, 0, 0), back=0.5)
    # A globe on a stand in the front corner, its axis upright.
    gx, gz, r = 1.42, 1.38, 0.32
    c = vec(gx, G + 0.95, gz)
    cylinder(sc, (gx, G, gz), 0.22, 0.05, mat="dark", name="globe-base")
    sc.wire([vec(gx, G + 0.05, gz), vec(gx, c.y - r - 0.06, gz)], k=1)
    from geom import ring_sector, uv_sphere

    sc.part(ring_sector(c, RIGHT, vec(0, 1, 0), r + 0.05, r + 0.09, math.radians(90), math.radians(270), n=96), mat="metal", crease=(40, 60), intersect=False, name="mount")
    sc.part(uv_sphere(c, r, 64, 32), lines=False, intersect=False, mat="light", flat=True, name="globe")
    sc.wire(circle_points(c, RIGHT, UP, r, n=160), k=0, region=True)
    front = lambda p, c=c: (p - c).dot(vec(1, 1, 1).normalized()) > 0
    rr = r * 1.004
    for i in range(6):
        phi = math.pi * i / 6
        m = vec(math.cos(phi), 0, math.sin(phi))
        sc.wire(circle_points(c, m, vec(0, 1, 0), rr, n=120), k=2, keep=front)
    for lat in (-50, -20, 20, 50):
        la = math.radians(lat)
        sc.wire(circle_points(c + vec(0, rr * math.sin(la), 0), vec(1, 0, 0), vec(0, 0, 1), rr * math.cos(la), n=120), k=2, keep=front)
    sc.wire(circle_points(c, vec(1, 0, 0), vec(0, 0, 1), rr, n=120), k=1, keep=front)
    # A floor lamp in the far corner.
    lamp_post(sc, -1.55, -1.55, G, h=1.5)
    return finish(sc)


def gala():
    sc = Scene()
    plinth(sc)
    # A round table dressed to the floor.
    tz = -0.15
    cloth = [(1.2, 0.0), (1.17, 0.55), (1.15, 0.74), (0, 0.74)]
    add_lathe(sc, Lathe(cloth, (0, G + 0.004, tz), corners=(2,)), mat="light")
    T = G + 0.744
    # Ice bucket and an upright bottle.
    bx, bz = -0.3, tz - 0.42
    bucket = Lathe([(0, 0), (0.17, 0), (0.21, 0.42)], (bx, T + 0.002, bz), corners=(1,))
    add_lathe(sc, bucket, mat="metal")
    body = ([(0, 0.0), (0.085, 0.0), (0.095, 0.05), (0.095, 0.52)]
            + bezier([(0.095, 0.52), (0.095, 0.66), (0.042, 0.71), (0.037, 0.82)], 14)[1:]
            + [(0.034, 0.96), (0.042, 0.96), (0.042, 1.01), (0, 1.01)])
    bottle = Lathe(body, (bx, T + 0.03, bz), corners=(1, len(body) - 4, len(body) - 3, len(body) - 2))
    add_lathe(sc, bottle, mat="glass")
    # Two coupes, champagne in them.
    def coupe(x, z, s=0.72):
        prof = [(r * s, y * s) for r, y in (
            bezier([(0.26, 0.0), (0.09, 0.012), (0.046, 0.09)], 14)
            + [(0.039, 0.14), (0.035, 0.22), (0.034, 0.5)]
            + bezier([(0.036, 0.55), (0.06, 0.64), (0.33, 0.62), (0.46, 0.86)], 30))]
        glass = Lathe(prof, (x, T + 0.003, z))
        add_lathe(sc, glass, mat="light")
        level = 0.72 * s
        wine = Lathe([(0, level), (glass.radius_at(level) * 0.985, level)], (x, T + 0.003, z))
        sc.part(wine.mesh(), ink=1, sil=False, intersect=False, mat="light", name="champagne")
    coupe(0.38, tz - 0.02)
    coupe(-0.16, tz + 0.5)
    # Candles, their flames lit.
    for i, (x, z, h) in enumerate(((0.45, tz - 0.55, 0.36), (0.66, tz - 0.32, 0.3), (0.28, tz + 0.5, 0.26))):
        cylinder(sc, (x, T, z), 0.055, 0.025, mat="metal", name="holder")
        cylinder(sc, (x, T + 0.025, z), 0.026, h, mat="light", name="candle")
        y = T + 0.025 + h + 0.015
        d = vec(1, 0, -1).normalized() * 0.022
        flame = [vec(x, y, z), vec(x, y + 0.05, z) + d, vec(x, y + 0.11, z), vec(x, y + 0.05, z) - d]
        quad(sc, flame, mat="lamp", ink=2, light=round(0.1 + 0.2 * i, 3), name="flame")
    # Four chairs round the table.
    chair(sc, 0.0, tz + 1.3, G, facing=(0, 0, -1), back=0.55, mat="wood")
    chair(sc, 1.32, tz, G, facing=(-1, 0, 0), back=0.55, mat="wood")
    chair(sc, -1.32, tz, G, facing=(1, 0, 0), back=0.55, mat="wood")
    chair(sc, 0.0, tz - 1.32, G, facing=(0, 0, 1), back=0.55, mat="wood")
    # Strings of lamps along the back and left edges, on three posts.
    ph = G + 2.35
    posts = [vec(-1.85, G, -1.85), vec(1.85, G, -1.85), vec(-1.85, G, 1.85)]
    for p in posts:
        sc.box(p.x - 0.035, G, p.z - 0.035, p.x + 0.035, ph, p.z + 0.035, mat="metal", name="post")
    for a, b in ((posts[0], posts[1]), (posts[0], posts[2])):
        a, b = vec(a.x, ph - 0.02, a.z), vec(b.x, ph - 0.02, b.z)
        cat = [a.lerp(b, t) - vec(0, 0.32 * 4 * t * (1 - t), 0) for t in [i / 40 for i in range(41)]]
        sc.wire(cat, k=1)
        for j in range(1, 8):
            t = j / 8
            q = a.lerp(b, t) - vec(0, 0.32 * 4 * t * (1 - t), 0)
            sc.wire([q, q - vec(0, 0.08, 0)], k=2)
            bulb(sc, q - vec(0, 0.12, 0), r=0.04)
    return finish(sc)
