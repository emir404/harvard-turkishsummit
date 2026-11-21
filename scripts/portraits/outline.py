"""Photo -> pen-portrait outline drawing, in the site's line style. All local:
the photo never leaves the machine.

Usage, from the repo root (Blender 4.2+ for its bundled Python and numpy):

    blender -b --factory-startup --python scripts/portraits/outline.py -- <photo.jpg|png> <id> [options]

Writes src/components/team/portraits/<id>.ts: an IsoDrawingData of stroke
paths in a 400 x 500 viewBox (a 4:5 headshot crop, the face centred), with
k 0 for the silhouette and long contours, 1 for the features (eyes, brows,
nose, mouth), 2 for hair and fine detail, and `o` ordered so the silhouette
draws first, then the features, then the hair. It exports `portrait` (also the
default export) and `crop`, the part of the photo the drawing covers (fractions of the photo's width and
height), so the real photo can be shown on hover with the same framing.

Options:
    --face cx,cy,w   the face's centre and width as fractions of the photo, if detection picks
                     the wrong spot (eyes-nose level for cy; cheek to cheek for w)
    --detail N       0.5 (sparser) to 1.5 (denser); default 1
    --out DIR        write the .ts elsewhere
    --preview DIR    also write <id>.json (the drawing) and <id>-crop.json (the crop) there

Works best on a headshot against a plain backdrop; busy backgrounds are mostly
dropped by keeping only lines near the person.
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np

OUT_W, OUT_H = 400, 500
WORK = 2  # processing resolution, times the output


# ---------------------------------------------------------------------------
# Image helpers (numpy only)


def load(path):
    import bpy

    img = bpy.data.images.load(str(path), check_existing=False)
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    a = buf.reshape(h, w, 4)[::-1, :, :3].copy()  # Blender stores rows bottom-up
    bpy.data.images.remove(img)
    return a


def block_mean(a, f):
    h, w = (a.shape[0] // f) * f, (a.shape[1] // f) * f
    a = a[:h, :w]
    return a.reshape(h // f, f, w // f, f, *a.shape[2:]).mean(axis=(1, 3))


def sample(img, xs, ys):
    """Bilinear samples at float pixel coordinates (arrays of the same shape)."""
    h, w = img.shape[:2]
    xs = np.clip(xs, 0, w - 1.001)
    ys = np.clip(ys, 0, h - 1.001)
    x0, y0 = np.floor(xs).astype(int), np.floor(ys).astype(int)
    fx, fy = xs - x0, ys - y0
    if img.ndim == 3:
        fx, fy = fx[..., None], fy[..., None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy)
            + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def gauss(a, s):
    if s <= 0:
        return a
    r = max(1, int(3 * s + 0.5))
    x = np.arange(-r, r + 1)
    k = np.exp(-x * x / (2 * s * s))
    k /= k.sum()
    p = np.pad(a, ((0, 0), (r, r)), mode="edge")
    out = sum(k[i] * p[:, i:i + a.shape[1]] for i in range(2 * r + 1))
    p = np.pad(out, ((r, r), (0, 0)), mode="edge")
    return sum(k[i] * p[i:i + a.shape[0], :] for i in range(2 * r + 1))


def luminance(rgb):
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def shifted(b, dy, dx):
    """b shifted by (dy, dx), zero filled."""
    out = np.zeros_like(b)
    h, w = b.shape
    ys0, ys1 = max(0, dy), min(h, h + dy)
    xs0, xs1 = max(0, dx), min(w, w + dx)
    out[ys0:ys1, xs0:xs1] = b[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def dilate(b, r=1):
    out = b.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= shifted(b, dy, dx)
    return out


def erode(b, r=1):
    return ~dilate(~b, r)


def components(mask):
    """Labels of 4-connected components (small masks only)."""
    h, w = mask.shape
    lab = np.zeros((h, w), dtype=np.int32)
    n = 0
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1
                stack = [(y, x)]
                lab[y, x] = n
                while stack:
                    cy, cx = stack.pop()
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n
                            stack.append((ny, nx))
    return lab, n


# ---------------------------------------------------------------------------
# Where the face is


def find_face(rgb):
    """(cx, cy, w) of the face in pixels of rgb: eyes-nose level centre and cheek-to-cheek width."""
    h, w = rgb.shape[:2]
    f = max(1, w // 220)
    small = block_mean(rgb, f)
    sh, sw = small.shape[:2]
    R, G, B = small[..., 0], small[..., 1], small[..., 2]
    sat = (small.max(axis=2) - small.min(axis=2)).mean()
    if sat > 0.06:
        Y = 0.299 * R + 0.587 * G + 0.114 * B
        Cb = 0.5 - 0.168736 * R - 0.331264 * G + 0.5 * B
        Cr = 0.5 + 0.5 * R - 0.418688 * G - 0.081312 * B
        skin = (Cb > 77 / 255) & (Cb < 127 / 255) & (Cr > 135 / 255) & (Cr < 175 / 255) & (Y > 0.18)
        skin = dilate(erode(skin, 1), 1)
        lab, n = components(skin)
        best, best_score = None, 0.0
        for i in range(1, n + 1):
            ys, xs = np.nonzero(lab == i)
            if len(ys) < 0.004 * sh * sw:
                continue
            cx, top = xs.mean() / sw, ys.min() / sh
            score = len(ys) * max(0.05, 1 - 1.6 * abs(cx - 0.5)) * (1.0 if top < 0.55 else 0.25)
            if score > best_score:
                best, best_score = i, score
        if best is not None:
            ys, xs = np.nonzero(lab == best)
            top = ys.min()
            rows = [(y, xs[ys == y]) for y in range(top, ys.max() + 1)]
            widths = np.array([r[1].max() - r[1].min() + 1 if len(r[1]) else 0 for r in rows])
            # The face: from the top of the blob down to about 1.3 widths, its width the widest row up there.
            fw = widths[: max(3, int(len(widths) * 0.6))].max()
            fh = min(len(widths), int(fw * 1.3))
            band = (ys >= top) & (ys < top + fh)
            cx = xs[band].mean()
            cy = top + fh * 0.48
            return cx * f, cy * f, fw * f
    # Grey or no skin found: separate the person from a plain backdrop and read the head off its outline.
    person = person_mask(small)
    if person is not None and person.any():
        ys, xs = np.nonzero(person)
        widths = np.zeros(sh)
        for y in range(sh):
            r = xs[ys == y]
            widths[y] = r.max() - r.min() + 1 if len(r) else 0
        rows = np.nonzero(widths > 0.03 * sw)[0]
        if len(rows):
            top = rows[0]
            w_sm = np.convolve(widths, np.ones(5) / 5, mode="same")
            head_w = w_sm[top:top + max(3, int(0.16 * sh))].max()
            cx = xs[(ys >= top) & (ys < top + head_w)].mean()
            fw = head_w * 0.74
            cy = top + head_w * 0.68
            return cx * f, cy * f, fw * f
    return w * 0.5, h * 0.4, w * 0.3


def person_mask(rgb, plain_only=True):
    """The person against a plain backdrop: a smooth backdrop is fitted to the upper border (top band and
    the top half of the sides); pixels far from it are the person. None when the backdrop is not plain."""
    h, w = rgb.shape[:2]
    e = max(2, w // 24)
    yy, xx = np.mgrid[0:h, 0:w]
    border = np.zeros((h, w), dtype=bool)
    border[:e, :] = True
    border[: int(h * 0.55), :e] = True
    border[: int(h * 0.55), -e:] = True
    uu, vv = xx / w, yy / h
    # A smooth backdrop: curved across (vignettes), straight down (it is only sampled in the upper half,
    # and a curve would run away below it).
    terms = lambda m: [np.ones(m.sum()), uu[m], vv[m], uu[m] ** 2, uu[m] * vv[m]]
    X = np.stack(terms(border), axis=1)
    resid = []
    model = []
    for c in range(3):
        v = rgb[..., c][border]
        coef, *_ = np.linalg.lstsq(X, v, rcond=None)
        model.append(coef)
        resid.append(v - X @ coef)
    spread = max(np.median(np.abs(r)) for r in resid) * 1.4826
    if plain_only and spread > 0.045:
        return None
    d = np.zeros((h, w))
    for c in range(3):
        coef = model[c]
        bg = coef[0] + coef[1] * uu + coef[2] * vv + coef[3] * uu ** 2 + coef[4] * uu * vv
        d = np.maximum(d, np.abs(rgb[..., c] - bg))
    m = d > max(0.07, 5 * spread)
    m = dilate(erode(m, 1), 2)
    m = erode(m, 1)
    lab, n = components(m) if m.size <= 120000 else (None, 0)
    if lab is None:
        return m
    best, best_n = 0, 0
    for i in range(1, n + 1):
        sel = lab == i
        cnt = sel.sum()
        if cnt > best_n and sel[-1].any():  # the person reaches the bottom edge
            best, best_n = i, cnt
    return fill_holes(lab == best) if best else None


def fill_holes(m):
    """Backdrop pockets that do not reach the border are part of the person (bright skin, a gap in the hair)."""
    lab, n = components(~m)
    keep = np.zeros(n + 1, dtype=bool)
    edge_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    keep[edge_labels] = True
    keep[0] = False
    return m | ~keep[lab] & (lab > 0)


def color_mask(rgb, fcx, fcy, ffw, ffh):
    """The person against a busy backdrop: colour histograms of sure-person samples (the face and the chest
    below it) against sure-backdrop samples (the top corners and the upper sides), compared pixel by pixel."""
    h, w = rgb.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    q = np.clip((rgb * 15.999).astype(int), 0, 15)
    idx = q[..., 0] * 256 + q[..., 1] * 16 + q[..., 2]
    fg = (((xx - fcx) / (0.45 * ffw)) ** 2 + ((yy - fcy) / (0.5 * ffh)) ** 2 <= 1) | (
        (yy > fcy + 0.9 * ffh) & (np.abs(xx - fcx) < 0.45 * ffw))
    e = max(3, w // 12)
    bg = np.zeros((h, w), dtype=bool)
    bg[: int(h * 0.12), :e * 2] = True
    bg[: int(h * 0.12), -e * 2:] = True
    bg[: int(h * 0.5), :e] = True
    bg[: int(h * 0.5), -e:] = True
    bg &= ~fg
    hf = np.bincount(idx[fg], minlength=4096).astype(float) + 0.5
    hb = np.bincount(idx[bg], minlength=4096).astype(float) + 0.5
    hf /= hf.sum()
    hb /= hb.sum()
    ratio = np.log(hf[idx] / hb[idx])
    ratio = gauss(ratio, 2.0)
    m = ratio > 0.0
    m = dilate(erode(m, 2), 2)
    lab, n = components(m) if m.size <= 120000 else (None, 0)
    if lab is None or not n:
        return None
    best, best_n = 0, 0
    for i in range(1, n + 1):
        sel = lab == i
        cnt = sel.sum()
        if cnt > best_n and sel[-1].any():
            best, best_n = i, cnt
    return fill_holes(lab == best) if best else None


def crop_box(img_w, img_h, cx, cy, fw):
    """A 4:5 headshot window around the face: (x, y, w, h) in photo pixels."""
    ch = fw * 2.55  # the face is about 40% of the crop's width ... and the shoulders fit
    cw = ch * OUT_W / OUT_H
    if cw > img_w:
        cw, ch = img_w, img_w * OUT_H / OUT_W
    if ch > img_h:
        ch, cw = img_h, img_h * OUT_W / OUT_H
    x = min(max(cx - cw / 2, 0), img_w - cw)
    y = min(max(cy - ch * 0.42, 0), img_h - ch)
    return x, y, cw, ch


# ---------------------------------------------------------------------------
# Lines


def canny(L, sigma, hi_pct, lo_frac, zone):
    g = gauss(L, sigma)
    P = np.pad(g, 1, mode="edge")
    gx = (P[:-2, 2:] + 2 * P[1:-1, 2:] + P[2:, 2:]) - (P[:-2, :-2] + 2 * P[1:-1, :-2] + P[2:, :-2])
    gy = (P[2:, :-2] + 2 * P[2:, 1:-1] + P[2:, 2:]) - (P[:-2, :-2] + 2 * P[:-2, 1:-1] + P[:-2, 2:])
    mag = np.hypot(gx, gy)
    ang = (np.degrees(np.arctan2(gy, gx)) + 180) % 180
    q = ((ang + 22.5) // 45).astype(int) % 4  # 0: horizontal gradient, 1: 45, 2: vertical, 3: 135
    Pm = np.pad(mag, 1)
    nbr = {
        0: (Pm[1:-1, 2:], Pm[1:-1, :-2]),
        1: (Pm[2:, 2:], Pm[:-2, :-2]),
        2: (Pm[2:, 1:-1], Pm[:-2, 1:-1]),
        3: (Pm[2:, :-2], Pm[:-2, 2:]),
    }
    keep = np.zeros_like(mag, dtype=bool)
    for k, (a, b) in nbr.items():
        m = q == k
        keep |= m & (mag >= a) & (mag >= b)
    nms = np.where(keep, mag, 0.0)
    vals = nms[zone & (nms > 0)]
    if not len(vals):
        return np.zeros_like(keep)
    hi = np.percentile(vals, hi_pct)
    lo = hi * lo_frac
    strong, weak = nms >= hi, nms >= lo
    edges = strong & zone
    for _ in range(400):
        grown = dilate(edges, 1) & weak & zone
        if (grown == edges).all():
            break
        edges = grown
    return edges


def thin(b):
    """Zhang-Suen thinning to one-pixel lines."""
    b = b.astype(np.uint8).copy()
    while True:
        changed = False
        for step in (0, 1):
            P = np.pad(b, 1)
            p2, p3, p4, p5 = P[:-2, 1:-1], P[:-2, 2:], P[1:-1, 2:], P[2:, 2:]
            p6, p7, p8, p9 = P[2:, 1:-1], P[2:, :-2], P[1:-1, :-2], P[:-2, :-2]
            B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
            seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
            A = sum(((seq[i] == 0) & (seq[i + 1] == 1)).astype(np.uint8) for i in range(8))
            if step == 0:
                c1, c2 = p2 * p4 * p6, p4 * p6 * p8
            else:
                c1, c2 = p2 * p4 * p8, p2 * p6 * p8
            m = (b == 1) & (B >= 2) & (B <= 6) & (A == 1) & (c1 == 0) & (c2 == 0)
            if m.any():
                b[m] = 0
                changed = True
        if not changed:
            return b.astype(bool)


def trace(sk):
    """One-pixel lines -> polylines of (x, y)."""
    ys, xs = np.nonzero(sk)
    pix = set(zip(ys.tolist(), xs.tolist()))
    offs = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]

    def nbrs(p):
        out = [(p[0] + dy, p[1] + dx) for dy, dx in offs if (p[0] + dy, p[1] + dx) in pix]
        # Prefer 4-neighbours: drop a diagonal when a 4-neighbour already reaches it.
        four = [q for q in out if q[0] == p[0] or q[1] == p[1]]
        diag = [q for q in out if q not in four and not any(abs(q[0] - f[0]) + abs(q[1] - f[1]) == 1 for f in four)]
        return four + diag

    deg = {p: len(nbrs(p)) for p in pix}
    used = set()
    lines = []

    def walk(a, b):
        path = [a, b]
        used.add(frozenset((a, b)))
        prev, cur = a, b
        while deg[cur] == 2:
            nxt = [q for q in nbrs(cur) if q != prev and frozenset((cur, q)) not in used]
            if not nxt:
                break
            used.add(frozenset((cur, nxt[0])))
            path.append(nxt[0])
            prev, cur = cur, nxt[0]
        return path

    for p in pix:
        if deg[p] != 2:
            for q in nbrs(p):
                if frozenset((p, q)) not in used:
                    lines.append(walk(p, q))
    for p in pix:
        for q in nbrs(p):
            if frozenset((p, q)) not in used:
                lines.append(walk(p, q))
    return [[(x, y) for y, x in line] for line in lines if len(line) > 1]


def length(pl):
    return sum(math.dist(pl[i], pl[i + 1]) for i in range(len(pl) - 1))


def rdp(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        (ax, ay), (bx, by) = pts[i], pts[j]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        best, bi = 0.0, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            d = math.hypot(px - ax, py - ay) if L < 1e-9 else abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best:
                best, bi = d, k
        if best > tol:
            keep[bi] = True
            stack += [(i, bi), (bi, j)]
    return [p for p, k in zip(pts, keep) if k]


def chaikin(pts, n=2):
    for _ in range(n):
        if len(pts) < 3:
            return pts
        out = [pts[0]]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            out += [(0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by), (0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by)]
        out.append(pts[-1])
        pts = out
    return pts


def dedupe(items, taken, radius, share):
    """Keep strokes (longest first) unless most of one runs within `radius` px of a stroke already kept:
    the second edge of a highlight or a shadow, or a contour already drawn as the silhouette."""
    H, W = taken.shape
    kept = []
    for item in items:
        pl = item[-1]
        pts = densify(pl, 2.0)
        inside = sum(1 for x, y in pts if 0 <= int(y) < H and 0 <= int(x) < W and taken[int(y), int(x)])
        if pts and inside / len(pts) > share:
            continue
        kept.append(item)
        for x, y in densify(pl, 1.0):
            xi, yi = int(x), int(y)
            taken[max(0, yi - radius):yi + radius + 1, max(0, xi - radius):xi + radius + 1] = True
    return kept


def densify(pl, step):
    out = []
    for (ax, ay), (bx, by) in zip(pl, pl[1:]):
        n = max(1, int(math.dist((ax, ay), (bx, by)) / step))
        out += [(ax + (bx - ax) * i / n, ay + (by - ay) * i / n) for i in range(n)]
    out.append(pl[-1])
    return out


def join(lines, gap=3.5, max_turn=40.0):
    """Join lines whose ends meet (within `gap` px) heading the same way."""
    def heading(pl, at_end):
        a, b = (pl[-1], pl[max(0, len(pl) - 5)]) if at_end else (pl[0], pl[min(len(pl) - 1, 4)])
        return math.atan2(a[1] - b[1], a[0] - b[0])

    lines = [list(pl) for pl in lines]
    changed = True
    while changed:
        changed = False
        ends = []
        for i, pl in enumerate(lines):
            ends.append((i, True, pl[-1]))
            ends.append((i, False, pl[0]))
        grid = {}
        for e in ends:
            grid.setdefault((int(e[2][0] // gap), int(e[2][1] // gap)), []).append(e)
        done = set()
        for i, at_end, p in ends:
            if i in done:
                continue
            best = None
            gx, gy = int(p[0] // gap), int(p[1] // gap)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for j, j_end, q in grid.get((gx + dx, gy + dy), ()):
                        if j == i or j in done or math.dist(p, q) > gap:
                            continue
                        h1 = heading(lines[i], at_end)
                        h2 = heading(lines[j], j_end) + math.pi  # continuing means facing the other way
                        turn = abs((math.degrees(h1 - h2) + 180) % 360 - 180)
                        if turn <= max_turn and (best is None or turn < best[0]):
                            best = (turn, j, j_end)
            if best:
                _, j, j_end = best
                a = lines[i] if at_end else lines[i][::-1]
                b = lines[j] if not j_end else lines[j][::-1]
                lines[i] = a + b[1:]
                lines[j] = []
                done.update((i, j))
                changed = True
        lines = [pl for pl in lines if len(pl) > 1]
    return lines


# ---------------------------------------------------------------------------


def outline(photo, face=None, detail=1.0):
    rgb = load(photo)
    h, w = rgb.shape[:2]
    if face:
        cx, cy, fw = face[0] * w, face[1] * h, face[2] * w
    else:
        cx, cy, fw = find_face(rgb)
    x0, y0, cw, ch = crop_box(w, h, cx, cy, fw)
    W, H = OUT_W * WORK, OUT_H * WORK
    f = max(1, int((cw / W) // 1.5))
    src = block_mean(rgb, f) if f > 1 else rgb
    gx, gy = np.meshgrid(np.linspace(x0, x0 + cw, W) / f, np.linspace(y0, y0 + ch, H) / f)
    img = sample(src, gx, gy)
    L = luminance(img)
    # Lift the shadows a little so dark hair and clothes keep some structure.
    L = np.power(np.clip(L, 0, 1), 0.8)

    # The face in the crop, and zones for sorting lines.
    s = W / cw
    fcx, fcy, ffw = (cx - x0) * s, (cy - y0) * s, fw * s
    ffh = ffw * 1.3
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def ellipse(cx_, cy_, rx, ry):
        return ((xx - cx_) / rx) ** 2 + ((yy - cy_) / ry) ** 2 <= 1.0

    features = ellipse(fcx, fcy + 0.04 * ffh, 0.38 * ffw, 0.42 * ffh)
    face_zone = ellipse(fcx, fcy, 0.56 * ffw, 0.62 * ffh)
    head = ellipse(fcx, fcy - 0.2 * ffh, 0.96 * ffw, 0.82 * ffh)
    chin = fcy + 0.5 * ffh
    body = (yy > chin - 0.1 * ffh) & (np.abs(xx - fcx) < 0.5 * ffw + np.maximum(0, yy - chin) * 0.85)
    person = head | face_zone | body

    # A plain backdrop gives the exact outline of the person: the silhouette, and where lines may go.
    small_f = 4
    small_img = block_mean(img, small_f)
    mask_small = person_mask(small_img)
    colourful = float((small_img.max(axis=2) - small_img.min(axis=2)).mean()) > 0.06
    if mask_small is None and colourful:  # a colour model means nothing on a grey photo
        mask_small = color_mask(small_img, fcx / small_f, fcy / small_f, ffw / small_f, ffh / small_f)
    silhouette = []
    near_outline = np.zeros((H, W), dtype=bool)
    if mask_small is not None:
        mask = np.kron(mask_small, np.ones((small_f, small_f), dtype=bool))
        mask = np.pad(mask, ((0, H - mask.shape[0]), (0, W - mask.shape[1])), mode="edge")
        soft = gauss(mask.astype(float), 6.0) > 0.5
        edge = soft & ~erode(soft, 1)
        edge[[0, -1], :] = False
        edge[:, [0, -1]] = False
        # Only outline near the head and shoulders: a backdrop that darkens towards the bottom corners can read
        # as person there, and its edge would run across the background.
        edge &= dilate(person, 8)
        # ... and only where the photo has a real edge: the mask can also stop in smooth backdrop.
        gs = gauss(L, 3.0)
        gm = np.hypot(np.gradient(gs, axis=1), np.gradient(gs, axis=0))
        strong_edge = dilate(gm > 0.22 * np.percentile(gm[person], 92), 3)
        edge &= strong_edge
        silhouette = [pl for pl in join(trace(thin(edge)), gap=6, max_turn=60) if length(pl) > 80]
        person &= dilate(soft, 6)
        near_outline = dilate(edge, 7)

    # Features from finer edges, everything else from coarser ones: fewer, longer strokes.
    fine = canny(L, 1.9, 100 - 13 * detail, 0.5, features)
    coarse = canny(L, 3.8, 100 - 10 * detail, 0.45, person & ~features)
    coarse &= ~near_outline
    lines = join(join(trace(thin(fine)) + trace(thin(coarse))), gap=6.0, max_turn=50.0)

    min_len = {0: 110, 1: 16, 2: 44}
    picked = {0: [(length(pl) + 1e4, 0.0, pl) for pl in silhouette], 1: [], 2: []}
    for pl in lines:
        Lp = length(pl)
        mx = np.mean([q[0] for q in pl])
        my = np.mean([q[1] for q in pl])
        inside_features = features[int(min(H - 1, max(0, my))), int(min(W - 1, max(0, mx)))]
        k = 1 if inside_features else (0 if Lp >= min_len[0] else 2)
        if Lp < min_len[k]:
            continue
        picked[k].append((Lp, my, pl))
    caps = {0: 36, 1: int(110 * detail), 2: int(80 * detail)}
    out = []
    taken = np.zeros((H, W), dtype=bool)
    for k in (0, 1, 2):
        items = sorted(picked[k], key=lambda t: -t[0])
        items = dedupe(items, taken, radius=2 if k == 1 else 6, share=0.6 if k == 1 else 0.45)
        if k == 2:
            # Below the chin only a few strokes: the clothes stay quieter than the face and hair.
            low = [it for it in items if it[1] > chin + 0.15 * ffh][:14]
            items = [it for it in items if it[1] <= chin + 0.15 * ffh] + low
            items.sort(key=lambda t: -t[0])
        items = items[: caps[k]]
        if k == 1:
            items.sort(key=lambda t: t[1])  # top to bottom: brows, eyes, nose, mouth
        n = max(1, len(items))
        span = {0: (0.0, 0.32), 1: (0.36, 0.78), 2: (0.8, 1.0)}[k]
        for i, (Lp, my, pl) in enumerate(items):
            pts = chaikin(rdp(pl, 1.4 if k != 1 else 0.9), 3 if k != 1 else 2)
            pts = [(x / WORK, y / WORK) for x, y in pts]
            o = span[0] + (span[1] - span[0]) * i / n
            out.append({"d": path_d(pts), "k": k, "o": round(o, 3)})
    out.sort(key=lambda p: (p["o"], p["k"]))
    crop = {"x": round(float(x0 / w), 4), "y": round(float(y0 / h), 4), "width": round(float(cw / w), 4), "height": round(float(ch / h), 4)}
    return {"viewBox": f"0 0 {OUT_W} {OUT_H}", "paths": out}, crop


def fmt(v):
    s = f"{v:.1f}"
    if s.endswith(".0"):
        s = s[:-2]
    return "0" if s == "-0" else s


def path_d(pts):
    return f"M{fmt(pts[0][0])} {fmt(pts[0][1])}L" + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in pts[1:])


def write(ident, data, crop, out_dir):
    lines = [
        f"// Generated by scripts/portraits/outline.py from the photo for \"{ident}\". Do not edit by hand.",
        'import type { IsoDrawingData } from "@/components/iso/types";',
        "",
        "export const portrait: IsoDrawingData = {",
        f'  viewBox: "{data["viewBox"]}",',
        "  paths: [",
    ]
    lines += [f'    {{ d: "{p["d"]}", k: {p["k"]}, o: {p["o"]} }},' for p in data["paths"]]
    lines += [
        "  ],",
        "};",
        "",
        "/** The part of the photo the drawing covers, as fractions of the photo's width and height: frame the photo the same way. */",
        f"export const crop = {{ x: {crop['x']}, y: {crop['y']}, width: {crop['width']}, height: {crop['height']} }};",
        "",
        "export default portrait;",
        "",
    ]
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{ident}.ts").write_text("\n".join(lines))


def main(argv):
    opts = {}
    pos = []
    i = 0
    while i < len(argv):
        if argv[i].startswith("--"):
            opts[argv[i][2:]] = argv[i + 1]
            i += 2
        else:
            pos.append(argv[i])
            i += 1
    if len(pos) != 2:
        print(__doc__)
        sys.exit(1)
    photo, ident = Path(pos[0]), pos[1]
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", ident):
        sys.exit("id: lowercase letters, digits and dashes, e.g. elif-lara-okyay")
    face = [float(v) for v in opts["face"].split(",")] if "face" in opts else None
    detail = float(opts.get("detail", 1.0))
    data, crop = outline(photo, face, detail)
    root = Path(__file__).resolve().parent.parent.parent
    out_dir = Path(opts["out"]) if "out" in opts else root / "src" / "components" / "team" / "portraits"
    write(ident, data, crop, out_dir)
    if "preview" in opts:
        pv = Path(opts["preview"])
        pv.mkdir(parents=True, exist_ok=True)
        (pv / f"{ident}.json").write_text(json.dumps(data))
        (pv / f"{ident}-crop.json").write_text(json.dumps(crop))
    counts = {k: sum(1 for p in data["paths"] if p["k"] == k) for k in (0, 1, 2)}
    print(f"{ident}: {len(data['paths'])} paths {counts}, crop {crop}")


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
