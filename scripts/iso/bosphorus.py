"""The Bosphorus at night: the Mission key visual.

The bridge runs along z, Europe at +z (lower left on screen) and Asia at -z
(upper right), climbing across the middle of a wide frame. The scene runs past
all four edges (water and both shores), so the page can fade the edges out.
Draw order: Europe, then the bridge, then Asia.
"""
import math

from mathutils import Vector

from geom import Mesh, box, circle_points, dome, frustum, orient_outward, prism, tapered_box, vec
from hlr import RIGHT, UP, proj
import kit
from kit import Scene, cylinder, cone, cypress, grid, lamp_post, timing, tree


def panes(*a, **kw):
    kw.setdefault("outline", False)  # too small here to outline: they show as glass and light
    return kit.panes(*a, **kw)


def box_windows(*a, **kw):
    kw.setdefault("outline", False)
    return kit.box_windows(*a, **kw)

QUAY = 0.22
SHORE = 4.6
TOWER_Z = 5.0
DECK_Y = 0.72
DECK_HALF = 0.22
LEG_X = 0.28
TOWER_TOP = 2.36
ANCHOR_Z = 7.3
FAR = 26.0


def hip_roof(sc, x0, z0, x1, z1, y, h, mat="roof"):
    """A hipped roof: the ridge runs along the longer side."""
    if x1 - x0 >= z1 - z0:
        inset = (z1 - z0) / 2
        a, b = vec(x0 + inset, y + h, (z0 + z1) / 2), vec(x1 - inset, y + h, (z0 + z1) / 2)
    else:
        inset = (x1 - x0) / 2
        a, b = vec((x0 + x1) / 2, y + h, z0 + inset), vec((x0 + x1) / 2, y + h, z1 - inset)
    base = [vec(x0, y, z0), vec(x1, y, z0), vec(x1, y, z1), vec(x0, y, z1)]
    if (a - b).length < 1e-6:
        verts = base + [a]
        faces = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (3, 2, 1, 0)]
    else:
        verts = base + [a, b]
        if x1 - x0 >= z1 - z0:
            faces = [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (3, 2, 1, 0)]
        else:
            faces = [(1, 2, 5, 4), (3, 0, 4, 5), (0, 1, 4), (2, 3, 5), (3, 2, 1, 0)]
    sc.part(orient_outward(Mesh(verts, faces)), mat=mat, name="roof")


def house(sc, x, z, w, d, h, ground, floors=2, roof=0.22, cols=None, ratio=0.4):
    x0, x1, z0, z1 = x - w / 2, x + w / 2, z - d / 2, z + d / 2
    sc.box(x0, ground, z0, x1, ground + h, z1, mat="wall", name="house")
    cz = cols if cols else max(1, round(w / 0.24))
    cx = max(1, round(d / 0.24))
    box_windows(sc, (x0, ground, z0, x1, ground + h, z1), cz, cx, floors, ratio=ratio, mu=0.07, mv=0.07, gu=0.09, gv=0.1)
    hip_roof(sc, x0, z0, x1, z1, ground + h, roof)


def block(sc, x, z, w, d, h, ground, floors, ratio=0.4):
    """An apartment block: flat roof with a parapet line, window grids."""
    x0, x1, z0, z1 = x - w / 2, x + w / 2, z - d / 2, z + d / 2
    sc.box(x0, ground, z0, x1, ground + h, z1, mat="wall", name="block")
    box_windows(sc, (x0, ground, z0, x1, ground + h, z1), max(2, round(w / 0.2)), max(2, round(d / 0.2)), floors,
                y0=ground + 0.05, y1=ground + h - 0.05, ratio=ratio, mu=0.06, mv=0.05, gu=0.07, gv=0.08)
    sc.box(x0 + 0.12, ground + h, z0 + 0.12, x0 + 0.4, ground + h + 0.12, z0 + 0.36, mat="wall", name="stair-head")


def minaret(sc, x, z, ground, h=1.32):
    sc.box(x - 0.075, ground, z - 0.075, x + 0.075, ground + 0.26, z + 0.075, mat="stone", name="minaret-base")
    cone(sc, (x, ground + 0.26, z), 0.05, 0.045, h - 0.26, mat="stone", name="minaret")
    cylinder(sc, (x, ground + h * 0.72, z), 0.085, 0.05, mat="stone", name="balcony")
    cone(sc, (x, ground + h, z), 0.055, 0.0, 0.24, mat="roof", name="spire")


def mosque(sc, x, z, ground, s=0.46, hh=0.62, minarets=2):
    sc.box(x - s, ground, z - s, x + s, ground + hh, z + s, mat="stone", name="hall")
    top = ground + hh
    r = s * 0.74
    cylinder(sc, (x, top, z), r, 0.09, mat="stone", name="drum")
    c = vec(x, top + 0.09, z)
    sc.part(dome(c, r, 72, 18), lines=False, intersect=False, mat="roof", flat=True, name="dome")
    sc.wire(circle_points(c, RIGHT, UP, r, n=128), k=0, keep=lambda p, cy=c.y: p.y >= cy - 1e-4, region=True)
    cone(sc, tuple(c + vec(0, r - 0.01, 0)), 0.02, 0.0, 0.1, mat="metal", name="finial")
    # Tall arched windows on the two faces the camera sees.
    for face in ("x", "z"):
        quads = []
        for t in (-0.22 * s / 0.46, 0.0, 0.22 * s / 0.46):
            w, y0, y1 = 0.06 * s / 0.46, ground + 0.14, ground + hh * 0.72
            if face == "x":
                quads.append([vec(x + s, y0, z - t + w), vec(x + s, y0, z - t - w), vec(x + s, y1, z - t - w), vec(x + s, y1, z - t + w)])
            else:
                quads.append([vec(x + t - w, y0, z + s), vec(x + t + w, y0, z + s), vec(x + t + w, y1, z + s), vec(x + t - w, y1, z + s)])
        panes(sc, quads, (1, 0, 0) if face == "x" else (0, 0, 1), ratio=0.6)
    if minarets >= 1:
        minaret(sc, x + s + 0.17, z - s + 0.04, ground)
    if minarets >= 2:
        minaret(sc, x - s + 0.04, z + s + 0.17, ground)


def galata(sc, x, z, ground):
    """A stone tower with a gallery and a conical cap, after Galata (artistic licence: across the water)."""
    r = 0.3
    cylinder(sc, (x, ground, z), r + 0.04, 0.12, mat="stone", name="tower-base")
    cylinder(sc, (x, ground + 0.12, z), r, 1.55, mat="stone", name="tower")
    yg = ground + 1.67
    cylinder(sc, (x, yg, z), r + 0.06, 0.05, mat="stone", name="gallery")
    cylinder(sc, (x, yg + 0.05, z), r - 0.02, 0.3, mat="stone", name="drum")
    cone(sc, (x, yg + 0.35, z), r + 0.02, 0.0, 0.62, mat="roof", name="cap")
    cone(sc, (x, yg + 0.95, z), 0.02, 0.0, 0.12, mat="metal", name="finial")
    # A ring of lit windows in the drum, and slits down the shaft (only the front half shows).
    quads = []
    for i in range(10):
        a = math.radians(-90 + i * 18)
        n = vec(math.cos(a), 0, math.sin(a))
        if n.dot(vec(1, 0, 1)) <= 0.15:
            continue
        t = vec(-math.sin(a), 0, math.cos(a))
        c = vec(x, yg + 0.2, z) + n * (r - 0.012)
        w, hgt = 0.035, 0.09
        quads.append([c - t * w - vec(0, hgt, 0), c + t * w - vec(0, hgt, 0), c + t * w + vec(0, hgt, 0), c - t * w + vec(0, hgt, 0)])
    panes(sc, quads, (0, 0, 0), always=True, push=0.0)
    for k in range(3):
        y = ground + 0.45 + k * 0.42
        for a in (math.radians(20), math.radians(70)):
            n = vec(math.cos(a), 0, math.sin(a))
            t = vec(-math.sin(a), 0, math.cos(a))
            c = vec(x, y, z) + n * (r + 0.004)
            sc.wire([c - t * 0.025 - vec(0, 0.07, 0), c - t * 0.025 + vec(0, 0.07, 0), c + t * 0.025 + vec(0, 0.07, 0), c + t * 0.025 - vec(0, 0.07, 0)], k=2, closed=True)


def palace(sc, x0, x1, z0, z1, ground):
    """A long waterfront palace after Beylerbeyi: two storeys, a central pavilion, sea kiosks."""
    h = 0.8
    sc.box(x0, ground, z0, x1, ground + 0.1, z1, mat="stone", name="palace-plinth")
    sc.box(x0 + 0.03, ground + 0.1, z0 + 0.03, x1 - 0.03, ground + h, z1 - 0.03, mat="stone", name="palace")
    xm = (x0 + x1) / 2
    sc.box(xm - 0.42, ground + 0.1, z1 - 0.03, xm + 0.42, ground + h + 0.12, z1 + 0.1, mat="stone", name="pavilion")
    tri = [vec(xm - 0.42, ground + h + 0.12, z1 + 0.1), vec(xm + 0.42, ground + h + 0.12, z1 + 0.1), vec(xm, ground + h + 0.32, z1 + 0.1)]
    sc.part(prism(tri, (0, 0, -0.4)), mat="roof", name="pavilion-roof")
    hip_roof(sc, x0 + 0.03, z0 + 0.03, x1 - 0.03, z1 - 0.03, ground + h, 0.14)
    # Two storeys of tall windows on the water front (+z) and the end (+x).
    for left, right in ((x0 + 0.05, xm - 0.46), (xm + 0.46, x1 - 0.05)):
        cols = max(2, round((right - left) / 0.2))
        panes(sc, grid((left, ground + 0.15, z1 - 0.03), (1, 0, 0), (0, 1, 0), right - left, h - 0.12, cols, 2, mu=0.04, mv=0.06, gu=0.09, gv=0.12), (0, 0, 1), ratio=0.5)
    panes(sc, grid((xm - 0.4, ground + 0.15, z1 + 0.1), (1, 0, 0), (0, 1, 0), 0.8, h - 0.05, 3, 2, mu=0.06, mv=0.06, gu=0.1, gv=0.12), (0, 0, 1), ratio=0.7)
    panes(sc, grid((x1 - 0.03, ground + 0.15, z1 - 0.03), (0, 0, -1), (0, 1, 0), z1 - z0 - 0.06, h - 0.12, 3, 2, mu=0.06, mv=0.06, gu=0.1, gv=0.12), (1, 0, 0), ratio=0.5)
    for kx in (x0 + 0.2, x1 - 0.2):
        kz = SHORE_ASIA - 0.26
        sc.box(kx - 0.21, ground, kz - 0.21, kx + 0.21, ground + 0.36, kz + 0.21, mat="stone", name="kiosk")
        hip_roof(sc, kx - 0.23, kz - 0.23, kx + 0.23, kz + 0.23, ground + 0.36, 0.2)
        panes(sc, grid((kx - 0.21, ground + 0.08, kz + 0.21), (1, 0, 0), (0, 1, 0), 0.42, 0.24, 2, 1, mu=0.06, mv=0.03, gu=0.08, gv=0.05), (0, 0, 1), ratio=0.8)


SHORE_ASIA = -SHORE - 0.02


def vapur(sc, x, z, heading=1):
    """A Bosphorus ferry heading along the strait (±x), lit windows along its cabins, and a short wake."""
    L, B, H = 0.78, 0.2, 0.1
    hull = [vec(x - L, 0, z), vec(x - L + 0.17, 0, z - B), vec(x + L - 0.17, 0, z - B), vec(x + L, 0, z), vec(x + L - 0.17, 0, z + B), vec(x - L + 0.17, 0, z + B)]
    sc.part(prism(hull, (0, H, 0)), mat="dark", name="hull")
    cx0, cx1, cz0, cz1 = x - L + 0.24, x + L - 0.24, z - B + 0.04, z + B - 0.04
    sc.box(cx0, H, cz0, cx1, H + 0.13, cz1, mat="light", name="cabin")
    panes(sc, grid((cx0, H, cz1), (1, 0, 0), (0, 1, 0), cx1 - cx0, 0.13, 8, 1, mu=0.04, mv=0.035, gu=0.05, gv=0.04), (0, 0, 1), ratio=0.85)
    ux0, ux1 = x - 0.24, x + 0.3
    sc.box(ux0, H + 0.13, cz0 + 0.04, ux1, H + 0.23, cz1 - 0.04, mat="light", name="upper-cabin")
    panes(sc, grid((ux0, H + 0.13, cz1 - 0.04), (1, 0, 0), (0, 1, 0), ux1 - ux0, 0.1, 4, 1, mu=0.04, mv=0.025, gu=0.04, gv=0.03), (0, 0, 1), ratio=0.85)
    cylinder(sc, (x + 0.03, H + 0.23, z), 0.045, 0.13, mat="dark", name="funnel")
    stern = x - heading * L
    for sgn in (-1, 1):
        sc.wire([vec(stern - heading * 0.05, 0, z + sgn * 0.06), vec(stern - heading * 1.1, 0, z + sgn * 0.42)], k=3)


def boat(sc, x, z, heading=1):
    L, B = 0.32, 0.09
    hull = [vec(x - L, 0, z), vec(x - L + 0.07, 0, z - B), vec(x + L - 0.1, 0, z - B), vec(x + L, 0, z), vec(x + L - 0.1, 0, z + B), vec(x - L + 0.07, 0, z + B)]
    sc.part(prism(hull, (0, 0.06, 0)), mat="light", name="boat")
    cxa = x - heading * 0.05
    sc.box(cxa - 0.09, 0.06, z - 0.05, cxa + 0.09, 0.14, z + 0.05, mat="wall", name="wheelhouse")
    stern = x - heading * L
    sc.wire([vec(stern, 0, z), vec(stern - heading * 0.6, 0, z + 0.1)], k=3)


def bridge(sc):
    yb = DECK_Y - 0.08
    # The fascias slope at about 55 degrees: at 45 the near one would face the camera exactly edge-on, and its
    # lines would come and go, leaving gaps between the deck's face and the water.
    section = [vec(-DECK_HALF, DECK_Y, FAR), vec(DECK_HALF, DECK_Y, FAR), vec(0.165, yb, FAR), vec(-0.165, yb, FAR)]
    sc.part(prism(section, (0, 0, -2 * FAR)), mat="metal", name="deck")
    for sgn in (1, -1):
        zc = sgn * TOWER_Z
        sc.box(-0.46, QUAY, zc - 0.24, 0.46, QUAY + 0.1, zc + 0.24, mat="stone", name="pier")
        for x in (-LEG_X, LEG_X):
            sc.part(tapered_box((x, QUAY + 0.1, zc), 0.115, 0.19, 0.085, 0.135, TOWER_TOP - QUAY - 0.1), mat="metal", name="leg")
            sc.box(x - 0.05, TOWER_TOP, zc - 0.085, x + 0.05, TOWER_TOP + 0.05, zc + 0.085, mat="metal", name="saddle")
            lamp = vec(x, TOWER_TOP + 0.09, zc)
            sc.part(frustum(lamp - vec(0, 0.035, 0), (0, 1, 0), 0.03, 0.03, 0.07, n=24), mat="lamp", light=timing(lamp), radial=vec(0, 1, 0), name="tower-lamp")
        for y0, y1 in ((TOWER_TOP - 0.15, TOWER_TOP - 0.03), (1.5, 1.6), (yb - 0.1, yb)):
            sc.box(-LEG_X, y0, zc - 0.055, LEG_X, y1, zc + 0.055, mat="metal", name="beam")
        za, zp = sgn * ANCHOR_Z, sgn * 6.15
        sc.box(-0.45, QUAY, za - 0.32, 0.45, yb, za + 0.32, mat="stone", name="anchorage")
        sc.box(-0.11, QUAY, zp - 0.08, 0.11, yb, zp + 0.08, mat="stone", name="deck-pier")
    cy = TOWER_TOP + 0.05
    sag_y = DECK_Y + 0.11
    for x in (-LEG_X, LEG_X):
        main = [vec(x, sag_y + (cy - sag_y) * (z / TOWER_Z) ** 2, z) for z in [TOWER_Z - 2 * TOWER_Z * i / 120 for i in range(121)]]
        sc.wire(main, k=0)
        for sgn in (1, -1):
            a, b = vec(x, cy, sgn * TOWER_Z), vec(x * 0.95, yb, sgn * ANCHOR_Z)
            sc.wire([a.lerp(b, t) - vec(0, 0.07 * 4 * t * (1 - t), 0) for t in [i / 24 for i in range(25)]], k=0)
        n = 26
        xd = DECK_HALF if x > 0 else -DECK_HALF
        zig = []
        for j in range(n + 1):
            z = TOWER_Z - 2 * TOWER_Z * j / n
            zig.append(vec(x, sag_y + (cy - sag_y) * (z / TOWER_Z) ** 2, z) if j % 2 == 0 else vec(xd, DECK_Y, z))
        sc.wire(zig, k=2)
    # Deck lamps on both edges, the length of the bridge and its approaches.
    z = 9.4
    while z > -9.5:
        for x in (-DECK_HALF + 0.03, DECK_HALF - 0.03):
            sc.wire([vec(x, DECK_Y, z), vec(x, DECK_Y + 0.13, z)], k=2)
            c = vec(x, DECK_Y + 0.15, z)
            sc.box(c.x - 0.022, c.y - 0.018, c.z - 0.022, c.x + 0.022, c.y + 0.018, c.z + 0.022, mat="lamp", light=timing(c, 1.2), intersect=False, draw=False, name="deck-lamp")
        z -= 0.62


WATER_LINES = (
    (3.6, -10.5, -7.6), (2.6, -12.0, -9.2), (1.5, -9.4, -7.9), (-0.5, -11.0, -8.6), (-1.8, -8.2, -5.9),
    (3.4, 0.9, 3.0), (2.0, 3.7, 6.2), (0.8, 5.2, 7.2), (-2.2, 8.8, 11.4), (-3.4, 7.8, 10.2), (-3.0, 0.6, 2.2), (1.2, -4.8, -3.4),
)


def water(sc):
    return sc.part(Mesh([vec(-FAR, 0, -FAR), vec(FAR, 0, -FAR), vec(FAR, 0, FAR), vec(-FAR, 0, FAR)], [(3, 2, 1, 0)]),
                   mat="water", intersect=False, lines=False, name="water")


def water_lines(sc):
    # The two label spots (see the anchors) are kept clear of them.
    for z, xa, xb in WATER_LINES:
        sc.wire([vec(xa, 0, z), vec(xb, 0, z)], k=3)


def land(sc):
    """Both banks, the bridge, and everything standing on them."""
    for sgn in (1, -1):
        z_quay, z_back = sgn * SHORE, sgn * FAR
        sc.box(-FAR, 0, min(z_quay, z_back), FAR, QUAY, max(z_quay, z_back), mat="ground", name="quay")
    sc.box(-FAR, QUAY, 9.6, FAR, QUAY + 0.34, FAR, mat="ground", name="terrace")
    sc.box(-FAR, QUAY, -FAR, FAR, QUAY + 0.3, -8.2, mat="ground", name="terrace")
    sc.box(-FAR, QUAY + 0.3, -FAR, FAR, QUAY + 0.62, -10.0, mat="ground", name="terrace")
    bridge(sc)
    g = QUAY

    # --- Europe (lower left).
    mosque(sc, 1.75, 5.55, g)
    for x, w, d, h, fl in ((-7.7, 0.78, 0.56, 0.78, 3), (-6.75, 0.7, 0.5, 0.62, 2), (-5.85, 0.78, 0.56, 0.8, 3), (-4.9, 0.66, 0.52, 0.58, 2),
                          (-3.98, 0.74, 0.56, 0.74, 3), (-3.02, 0.7, 0.5, 0.6, 2), (-2.12, 0.64, 0.52, 0.66, 2), (3.35, 0.7, 0.5, 0.6, 2)):
        house(sc, x, 5.2, w, d, h, g, floors=fl)
    for x, z, w, d, h, fl in ((-6.9, 6.75, 1.0, 0.8, 1.35, 5), (-5.7, 6.65, 0.9, 0.75, 1.65, 6), (-4.5, 6.8, 1.0, 0.8, 1.15, 4),
                              (-2.05, 6.75, 0.85, 0.7, 1.05, 4), (-4.9, 8.2, 0.95, 0.8, 1.25, 4), (-1.25, 8.3, 0.7, 0.7, 1.3, 4)):
        block(sc, x, z, w, d, h, g, fl)
    mosque(sc, -6.15, 8.25, g, s=0.36, hh=0.5, minarets=1)
    galata(sc, -2.95, 7.55, g)
    for x, z in ((-3.75, 7.9), (-2.25, 8.15), (-1.2, 10.05)):
        cypress(sc, x, z, g + (0.34 if z > 9.6 else 0.0), h=0.62)
    for x, z, r in ((-8.2, 5.3, 0.2), (-1.5, 5.3, 0.18), (-0.95, 6.3, 0.2), (0.95, 6.9, 0.17), (2.95, 5.95, 0.19), (-7.6, 6.2, 0.2)):
        tree(sc, x, z, g, r=r)
    for x in (-8.6, -6.2, -4.4, -2.6, 0.95, 2.75):
        lamp_post(sc, x, SHORE + 0.15, g, h=0.5)

    # --- Asia (upper right).
    palace(sc, -3.75, -0.78, -5.8, -5.12, g)
    for x, w, d, h, fl in ((1.2, 0.72, 0.56, 0.74, 3), (2.12, 0.66, 0.52, 0.6, 2), (3.02, 0.76, 0.56, 0.8, 3), (3.95, 0.68, 0.5, 0.62, 2),
                          (4.85, 0.74, 0.56, 0.74, 3), (5.78, 0.66, 0.52, 0.58, 2), (6.7, 0.74, 0.56, 0.7, 3), (7.62, 0.66, 0.5, 0.6, 2)):
        house(sc, x, -5.22, w, d, h, g, floors=fl)
    for x, z, w, d, h, fl in ((1.45, -6.6, 0.8, 0.7, 0.95, 3), (2.7, -6.55, 0.85, 0.7, 1.15, 4), (3.95, -6.65, 0.8, 0.7, 0.9, 3), (5.15, -6.6, 0.85, 0.7, 1.05, 3)):
        block(sc, x, z, w, d, h, g, fl)
    for x, z, w, h in ((0.95, -8.75, 0.62, 0.55), (1.85, -8.65, 0.6, 0.66), (2.75, -8.8, 0.64, 0.52), (3.65, -8.7, 0.58, 0.6), (4.5, -8.75, 0.6, 0.5),
                       (1.55, -10.55, 0.6, 0.6), (2.45, -10.45, 0.62, 0.5), (3.3, -10.6, 0.58, 0.56)):
        ground = g + (0.62 if z < -10 else 0.3)
        house(sc, x, z, w, 0.5, h, ground, floors=2, roof=0.2)
    for x, z, r in ((0.75, -5.25, 0.18), (8.45, -5.3, 0.2), (-1.25, -6.35, 0.2), (0.55, -6.6, 0.18), (6.3, -6.55, 0.2)):
        tree(sc, x, z, g, r=r)
    for x, z in ((0.45, -9.0), (5.3, -8.9), (4.1, -10.5), (0.8, -10.6)):
        cypress(sc, x, z, g + (0.62 if z < -10 else 0.3), h=0.6)
    for x in (-5.4, -4.25, 1.65, 3.5, 5.35, 7.2):
        lamp_post(sc, x, SHORE_ASIA - 0.15, g, h=0.5)



def vessels(sc):
    """The static scene's ferries and boats (the layered scene moves its own)."""
    vapur(sc, -6.9, 0.45, heading=-1)
    vapur(sc, 6.25, -1.2, heading=1)
    boat(sc, -4.2, 2.15, heading=1)
    boat(sc, 2.45, -2.5, heading=-1)


def frame():
    """The bridge in the middle with room above and below, 1600 x 720: (frame, scale)."""
    y_lo = proj(vec(0, QUAY, ANCHOR_Z + 0.9))[1] - 0.25
    y_hi = proj(vec(0, TOWER_TOP + 0.3, -TOWER_Z))[1] + 0.95
    h = y_hi - y_lo
    w = h * 1600 / 720
    return (-w / 2, w / 2, y_lo, y_hi), 1600 / w


ANCHORS = {"europe": vec(-5.7, 0, 3.35), "asia": vec(5.7, 0, -3.35), "bridge": vec(0, DECK_Y, 0)}


def bosphorus():
    sc = Scene()
    water(sc)
    land(sc)
    vessels(sc)
    water_lines(sc)
    fr, scale = frame()
    return {
        "parts": sc.parts,
        "wires": sc.wires,
        "frame": fr,
        "scale": scale,
        "order": lambda p: -p.z,
        "clip": True,
        "chunk": 0.06,
        "fills": True,
        "anchors": dict(ANCHORS),
    }


# ---------------------------------------------------------------------------
# The same scene in layers, for animating: water, then moving vessels, then
# land on top. Routes stay within |z| <= 3.2 so nothing on the far (Asian)
# shore is ever behind a vessel in the picture: there the land layer would
# wrongly cover it. Everything on the European side, and the bridge, is
# always in front of a vessel, so drawing land over the vessels is right.

# z on the strait, heading along x (+1: towards the lower right on screen), kind, seconds per pass
ROUTES = ((0.95, 1, "vapur", 64), (-1.55, -1, "vapur", 76), (2.55, -1, "boat", 52))
LANE_X = 0.11  # each carriageway's middle, either side of the deck's centre line (traffic keeps right)
SX = (1 / math.sqrt(2), 1 / math.sqrt(6))  # viewBox displacement per unit of world x is (SX[0], SX[1]) * scale


def _vessel(sc, kind, x, z, heading):
    return (vapur if kind == "vapur" else boat)(sc, x, z, heading=heading)


def _route(kind, z, heading, fr, scale, margin_px=28.0):
    """Start and end x for a pass: off the frame (plus a margin) at both ends."""
    probe = Scene()
    _vessel(probe, kind, 0.0, z, heading)
    pts = [proj(v) for p in probe.parts for v in p.mesh.verts] + [proj(v) for w in probe.wires for v in w.points]
    x0s, x1s = min(p[0] for p in pts), max(p[0] for p in pts)
    y0s, y1s = min(p[1] for p in pts), max(p[1] for p in pts)
    fx0, fx1, fy0, fy1 = fr
    m = margin_px / scale
    inside = []
    for i in range(-3000, 3001):
        x = i * 0.01
        dx, dy = x / math.sqrt(2), -x / math.sqrt(6)
        if x1s + dx >= fx0 - m and x0s + dx <= fx1 + m and y1s + dy >= fy0 - m and y0s + dy <= fy1 + m:
            inside.append(x)
    lo, hi = min(inside) - 0.02, max(inside) + 0.02
    return (lo, hi) if heading > 0 else (hi, lo)


def _lane(x, fr, scale, forward, margin_px=30.0):
    fx0, fx1, fy0, fy1 = fr
    m = margin_px / scale
    zs = []
    for i in range(-400, 401):
        z = i * 0.05
        sx, sy = proj(vec(x, DECK_Y + 0.004, z))
        if fx0 - m <= sx <= fx1 + m and fy0 - m <= sy <= fy1 + m:
            zs.append(z)
    z_hi, z_lo = max(zs), min(zs)
    n = max(2, int(math.ceil((z_hi - z_lo) / 1.0)))
    seq = [z_hi - (z_hi - z_lo) * i / n for i in range(n + 1)]
    if not forward:
        seq = seq[::-1]
    out = []
    for z in seq:
        sx, sy = proj(vec(x, DECK_Y + 0.004, z))
        out.append([round((sx - fx0) * scale, 1), round((fy1 - sy) * scale, 1)])
    return out


def layers():
    fr, scale = frame()
    common = {"frame": fr, "scale": scale, "clip": True, "chunk": 0.06}
    sl = Scene()
    land(sl)
    sw = Scene()
    water(sw)
    water_lines(sw)
    ferries = []
    for z, heading, kind, seconds in ROUTES:
        start, end = _route(kind, z, heading, fr, scale)
        sv = Scene()
        _vessel(sv, kind, start, z, heading)
        dx = end - start
        ferries.append({
            "spec": {"parts": sv.parts, "wires": sv.wires, "frame": fr, "scale": scale, "order": lambda p: p.y, "fills": True},
            "travel": [round(dx * SX[0] * scale, 1), round(dx * SX[1] * scale, 1)],
            "seconds": seconds,
            "x": (start, end),
            "z": z,
        })
    return {
        "bundle": "bosphorus",
        "water": {"parts": sw.parts, "wires": sw.wires, "order": lambda p: -p.z, "fills": False, **common},
        "water_tone": 1,
        "land": {"parts": sl.parts, "wires": sl.wires, "order": lambda p: -p.z, "fills": True, "anchors": dict(ANCHORS), **common},
        "ferries": ferries,
        "lanes": {"europeToAsia": _lane(LANE_X, fr, scale, True), "asiaToEurope": _lane(-LANE_X, fr, scale, False)},
    }
