"""Which model makes each drawing, and the legacy strokes-only bridge.

The panel dioramas live in dioramas.py, the night Bosphorus in bosphorus.py
and the Treehouse in treehouse_iso.py. `bridge` below is the earlier
strokes-only key visual, kept while the page still uses it.
"""
import math

from geom import box, circle_points, dome, frustum, prism, tapered_box, uv_sphere, vec
from hlr import RIGHT, UP, Part, Wire, proj

# ---------------------------------------------------------------------------
# The bridge
#
# The deck runs along z: Europe at +z (lower left on screen), Asia at -z
# (upper right), so the bridge climbs diagonally across the frame. Water is at
# y = 0. Proportions follow the Bosphorus Bridge loosely (towers on the
# shores, inclined zig-zag hangers, side spans not suspended), with the deck
# and towers thickened enough to read at this size.

QUAY = 0.22  # land height above the water
SHORE = 4.6  # |z| of each quay edge
TOWER_Z = 5.0
DECK_Y = 0.72  # top of the deck
DECK_HALF = 0.22
LEG_X = 0.28
TOWER_TOP = 2.36
ANCHOR_Z = 7.3


def tree(parts, wires, x, z, ground, r=0.2, trunk=0.16):
    parts.append(Part(frustum(vec(x, ground, z), (0, 1, 0), 0.025, 0.025, trunk + r * 0.5, n=24), name="trunk"))
    c = vec(x, ground + trunk + r, z)
    parts.append(Part(uv_sphere(c, r, 48, 24), lines=False, intersect=False, name="canopy"))
    wires.append(Wire(circle_points(c, RIGHT, UP, r, n=96), k=0))


def cypress(parts, x, z, ground, h=0.62, r=0.085):
    parts.append(Part(frustum(vec(x, ground, z), (0, 1, 0), 0.02, 0.02, 0.1, n=20), name="trunk"))
    parts.append(Part(frustum(vec(x, ground + 0.08, z), (0, 1, 0), r, 0.0, h, n=40), name="cypress"))


def house(parts, wires, x, z, w, d, h, ground, roof=0.22, ridge="x", windows=True):
    """Walls and a gable roof, flush with the walls so no near-double lines appear."""
    x0, x1, z0, z1 = x - w / 2, x + w / 2, z - d / 2, z + d / 2
    top = ground + h
    parts.append(Part(box(x0, ground, z0, x1, top, z1), name="house"))
    if ridge == "x":
        tri = [vec(x0, top, z0), vec(x0, top, z1), vec(x0, top + roof, z)]
        parts.append(Part(prism(tri, (w, 0, 0)), name="roof"))
    else:
        tri = [vec(x0, top, z0), vec(x1, top, z0), vec(x, top + roof, z0)]
        parts.append(Part(prism(tri, (0, 0, d)), name="roof"))
    if not windows:
        return
    e = 0.004
    ww, wh = 0.07, 0.11
    wy = ground + h * 0.42
    # Windows on the two faces the camera sees (+x and +z).
    for s in (0.3, 0.7):
        zc = z0 + d * s
        wires.append(Wire([vec(x1 + e, wy, zc - ww / 2), vec(x1 + e, wy, zc + ww / 2), vec(x1 + e, wy + wh, zc + ww / 2), vec(x1 + e, wy + wh, zc - ww / 2)], k=2, closed=True))
        xc = x0 + w * s
        wires.append(Wire([vec(xc - ww / 2, wy, z1 + e), vec(xc + ww / 2, wy, z1 + e), vec(xc + ww / 2, wy + wh, z1 + e), vec(xc - ww / 2, wy + wh, z1 + e)], k=2, closed=True))


def minaret(parts, x, z, ground, h=1.32):
    parts.append(Part(box(x - 0.075, ground, z - 0.075, x + 0.075, ground + 0.26, z + 0.075), name="minaret-base"))
    parts.append(Part(frustum(vec(x, ground + 0.26, z), (0, 1, 0), 0.05, 0.045, h - 0.26, n=32), name="minaret"))
    yb = ground + h * 0.72
    parts.append(Part(frustum(vec(x, yb, z), (0, 1, 0), 0.085, 0.085, 0.05, n=40), name="balcony"))
    parts.append(Part(frustum(vec(x, ground + h, z), (0, 1, 0), 0.055, 0.0, 0.24, n=32), name="spire"))


def mosque(parts, wires, x, z, ground):
    """After the Ortakoy Mosque at the European foot of the bridge."""
    s = 0.46
    hh = 0.62
    parts.append(Part(box(x - s, ground, z - s, x + s, ground + hh, z + s), name="hall"))
    top = ground + hh
    parts.append(Part(frustum(vec(x, top, z), (0, 1, 0), 0.34, 0.34, 0.09, n=72), name="drum"))
    c = vec(x, top + 0.09, z)
    parts.append(Part(dome(c, 0.34, 72, 18), lines=False, intersect=False, name="dome"))
    wires.append(Wire(circle_points(c, RIGHT, UP, 0.34, n=128), k=0, keep=lambda p, cy=c.y: p.y >= cy - 1e-4))
    parts.append(Part(frustum(c + vec(0, 0.33, 0), (0, 1, 0), 0.02, 0.0, 0.1, n=16), name="finial"))
    # Arched windows on the faces the camera sees.
    e = 0.004
    for t in (-0.22, 0.0, 0.22):
        for face in ("x", "z"):
            pts = []
            w, y0, y1 = 0.055, ground + 0.16, ground + 0.44
            for i in range(13):
                a = math.pi * i / 12
                pts.append((t + w * math.cos(a), y1 + w * math.sin(a)))
            loop = [(t + w, y0)] + pts + [(t - w, y0)]
            if face == "x":
                wires.append(Wire([vec(x + s + e, yy, z - u) for u, yy in loop], k=2, closed=True))
            else:
                wires.append(Wire([vec(x + u, yy, z + s + e) for u, yy in loop], k=2, closed=True))
    minaret(parts, x + s + 0.17, z - s + 0.04, ground)
    minaret(parts, x - s + 0.04, z + s + 0.17, ground)


def ferry(parts, wires, x, z):
    """A Bosphorus ferry heading along the strait (x), with its wake."""
    L, B, H = 0.72, 0.17, 0.09
    hull = [vec(x - L, 0, z), vec(x - L + 0.16, 0, z - B), vec(x + L - 0.16, 0, z - B), vec(x + L, 0, z), vec(x + L - 0.16, 0, z + B), vec(x - L + 0.16, 0, z + B)]
    parts.append(Part(prism(hull, (0, H, 0)), name="hull"))
    parts.append(Part(box(x - L + 0.24, H, z - B + 0.035, x + L - 0.24, H + 0.11, z + B - 0.035), name="cabin"))
    parts.append(Part(box(x - 0.2, H + 0.11, z - B + 0.06, x + 0.26, H + 0.19, z + B - 0.06), name="bridge-deck"))
    parts.append(Part(frustum(vec(x + 0.03, H + 0.19, z), (0, 1, 0), 0.04, 0.04, 0.1, n=24), name="funnel"))
    # Wake trailing behind the stern (-x).
    stern = x - L
    wires.append(Wire([vec(stern - 0.05, 0, z - 0.05), vec(stern - 1.2, 0, z - 0.42)], k=3))
    wires.append(Wire([vec(stern - 0.05, 0, z + 0.05), vec(stern - 1.2, 0, z + 0.42)], k=3))


def bridge():
    parts, wires = [], []
    far = 18.0

    # --- Banks: a quay and, further back, a terrace up the hill.
    for sgn in (1, -1):
        z_quay, z_back = sgn * SHORE, sgn * far
        parts.append(Part(box(-far, 0, min(z_quay, z_back), far, QUAY, max(z_quay, z_back)), name="quay"))
        z_terr = sgn * 9.6
        parts.append(Part(box(-far, QUAY, min(z_terr, z_back), far, QUAY + 0.34, max(z_terr, z_back)), name="terrace"))

    # --- Deck: a slim box girder with sloped fascias, running off both ends.
    yb = DECK_Y - 0.08
    section = [vec(-DECK_HALF, DECK_Y, far), vec(DECK_HALF, DECK_Y, far), vec(0.14, yb, far), vec(-0.14, yb, far)]
    parts.append(Part(prism(section, (0, 0, -2 * far)), name="deck"))

    # --- Towers.
    for sgn in (1, -1):
        zc = sgn * TOWER_Z
        parts.append(Part(box(-0.46, QUAY, zc - 0.24, 0.46, QUAY + 0.1, zc + 0.24), name="pier"))
        for x in (-LEG_X, LEG_X):
            parts.append(Part(tapered_box((x, QUAY + 0.1, zc), 0.115, 0.19, 0.085, 0.135, TOWER_TOP - QUAY - 0.1), name="leg"))
            parts.append(Part(box(x - 0.05, TOWER_TOP, zc - 0.085, x + 0.05, TOWER_TOP + 0.05, zc + 0.085), name="saddle"))
        for y0, y1 in ((TOWER_TOP - 0.15, TOWER_TOP - 0.03), (1.5, 1.6), (yb - 0.1, yb)):
            parts.append(Part(box(-LEG_X, y0, zc - 0.055, LEG_X, y1, zc + 0.055), name="beam"))

    # --- Anchorages, and a pier under each side span (the side spans are not suspended).
    for sgn in (1, -1):
        za, zp = sgn * ANCHOR_Z, sgn * 6.15
        parts.append(Part(box(-0.45, QUAY, za - 0.32, 0.45, yb, za + 0.32), name="anchorage"))
        parts.append(Part(box(-0.11, QUAY, zp - 0.08, 0.11, yb, zp + 0.08), name="deck-pier"))

    # --- Main cables (catenaries in the planes of the tower legs) and backstays.
    cy = TOWER_TOP + 0.05
    sag_y = DECK_Y + 0.11
    for x in (-LEG_X, LEG_X):
        main = [vec(x, sag_y + (cy - sag_y) * (z / TOWER_Z) ** 2, z) for z in [TOWER_Z - 2 * TOWER_Z * i / 96 for i in range(97)]]
        wires.append(Wire(main, k=0))
        for sgn in (1, -1):
            a, b = vec(x, cy, sgn * TOWER_Z), vec(x * 0.95, yb, sgn * ANCHOR_Z)
            stay = [a.lerp(b, t) - vec(0, 0.07 * 4 * t * (1 - t), 0) for t in [i / 24 for i in range(25)]]
            wires.append(Wire(stay, k=0))
        # Inclined hangers: one zig-zag between cable and deck edge.
        n = 26
        zig = []
        xd = DECK_HALF if x > 0 else -DECK_HALF
        for j in range(n + 1):
            z = TOWER_Z - 2 * TOWER_Z * j / n
            if j % 2 == 0:
                zig.append(vec(x, sag_y + (cy - sag_y) * (z / TOWER_Z) ** 2, z))
            else:
                zig.append(vec(xd, DECK_Y, z))
        wires.append(Wire(zig, k=2))

    # --- Europe: the mosque at the foot of the bridge, houses, trees.
    g = QUAY
    mosque(parts, wires, 1.75, 5.55, g)
    house(parts, wires, -1.35, 5.35, 0.62, 0.42, 0.42, g, ridge="x")
    house(parts, wires, -2.45, 5.3, 0.5, 0.4, 0.5, g, ridge="z")
    house(parts, wires, -3.6, 5.4, 0.7, 0.44, 0.38, g, ridge="x")
    house(parts, wires, -1.9, 6.6, 0.5, 0.46, 0.36, g, ridge="z")
    tree(parts, wires, -0.85, 6.2, g, r=0.19)
    tree(parts, wires, -4.6, 5.25, g, r=0.21)
    tree(parts, wires, 0.95, 6.85, g, r=0.17)
    # Up the hill, inside the corner of the frame the terrace shows in.
    for x, z in ((-2.05, 9.95), (-1.55, 10.05)):
        cypress(parts, x, z, QUAY + 0.34, h=0.5)

    # --- Asia: waterside houses (yali), trees, a cypress or two up the hill.
    house(parts, wires, 1.45, -5.4, 0.66, 0.44, 0.44, g, ridge="x")
    house(parts, wires, 2.6, -5.35, 0.52, 0.42, 0.52, g, ridge="z")
    house(parts, wires, 3.75, -5.45, 0.72, 0.46, 0.4, g, ridge="x")
    house(parts, wires, -2.15, -5.45, 0.8, 0.5, 0.44, g, ridge="x")
    house(parts, wires, 2.0, -6.6, 0.5, 0.44, 0.38, g, ridge="z")
    tree(parts, wires, 0.9, -6.4, g, r=0.18)
    tree(parts, wires, 4.85, -5.3, g, r=0.2)
    tree(parts, wires, -3.25, -5.0, g, r=0.16)
    for x, z in ((2.35, -9.85), (2.85, -9.95)):
        cypress(parts, x, z, QUAY + 0.34, h=0.5)

    # --- The water: a ferry and a few faint swell lines along the strait.
    ferry(parts, wires, 5.4, -0.6)
    # The two label spots (see the anchors below) are kept clear of them.
    for z, xa, xb in ((3.3, -10.5, -8.0), (2.1, -12.0, -8.2), (0.7, -8.0, -5.6), (-1.0, -9.5, -6.8), (1.6, 3.2, 6.0), (-3.6, 7.6, 10.4), (-2.4, 0.5, 2.2), (3.6, 1.2, 2.8)):
        wires.append(Wire([vec(xa, 0, z), vec(xb, 0, z)], k=3))

    # Frame: projected bounds that hold the towers and anchorages, widened to ~2.5:1.
    y_lo = proj(vec(0, QUAY, ANCHOR_Z + 0.9))[1]
    y_hi = proj(vec(0, TOWER_TOP + 0.3, -TOWER_Z))[1]
    h = y_hi - y_lo
    w = h * 2.5
    frame = (-w / 2, w / 2, y_lo, y_hi)
    return {
        "parts": parts,
        "wires": wires,
        "frame": frame,
        "scale": 1200 / w,
        "order": lambda p: -p.z,
        "clip": True,
        "chunk": 0.05,
        # Label spots on the water just off each quay, with clear space round them.
        "anchors": {"europe": vec(-5.2, 0, 3.3), "asia": vec(5.2, 0, -3.3)},
    }


import bosphorus  # noqa: E402
import dioramas  # noqa: E402
import treehouse_iso  # noqa: E402

DRAWINGS = {
    "bridge": bridge,
    "keynote": dioramas.keynote,
    "biotech": dioramas.biotech,
    "energy": dioramas.energy,
    "economy": dioramas.economy,
    "geopolitics": dioramas.geopolitics,
    "gala": dioramas.gala,
    "bosphorus": bosphorus.bosphorus,
    "bosphorus-layers": bosphorus.layers,
    "treehouse": treehouse_iso.treehouse,
}

# Still drawable by name, but the site no longer uses them (the Bosphorus is
# shown from its layers), so `all` leaves them out.
RETIRED = {"bridge", "bosphorus"}
