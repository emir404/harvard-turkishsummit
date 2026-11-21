"""Faces for the fills: the regions the visible lines divide the picture into.

The visible edges (drawn lines, plus undrawn "splitters" where the tone of a
surface changes) are noded into a planar graph; its faces are traced with a
half-edge walk; each face is labelled by casting one ray through a point
inside it; neighbouring faces with the same label are merged. The result is
an exact partition of the visible surfaces, aligned with the lines drawn over
it, so fills can neither poke through lines nor depend on a drawing order.

Coordinates are viewBox units (y down). Rings come out with outer boundaries
and holes wound opposite ways, so the default nonzero fill rule cuts holes.
"""
import math
from collections import defaultdict


def _cross(ax, ay, bx, by):
    return ax * by - ay * bx


def node_segments(segs, tol=0.2, cell=24.0):
    """Split segments where they cross or touch (within `tol`) and snap endpoints. Returns (nodes, edges)."""
    n = len(segs)
    splits = [[0.0, 1.0] for _ in range(n)]
    grid = defaultdict(list)
    for i, (x0, y0, x1, y1) in enumerate(segs):
        gx0, gx1 = int(math.floor((min(x0, x1) - tol) / cell)), int(math.floor((max(x0, x1) + tol) / cell))
        gy0, gy1 = int(math.floor((min(y0, y1) - tol) / cell)), int(math.floor((max(y0, y1) + tol) / cell))
        for gx in range(gx0, gx1 + 1):
            for gy in range(gy0, gy1 + 1):
                grid[(gx, gy)].append(i)

    def touch(i, px, py):
        """Split segment i where point p lies on it (within tol)."""
        x0, y0, x1, y1 = segs[i]
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy
        if L2 < 1e-12:
            return
        t = ((px - x0) * dx + (py - y0) * dy) / L2
        if t <= 0 or t >= 1:
            return
        qx, qy = x0 + dx * t, y0 + dy * t
        if (qx - px) ** 2 + (qy - py) ** 2 <= tol * tol:
            splits[i].append(t)

    seen = set()
    for members in grid.values():
        m = len(members)
        for a in range(m):
            i = members[a]
            xi0, yi0, xi1, yi1 = segs[i]
            rx, ry = xi1 - xi0, yi1 - yi0
            for b in range(a + 1, m):
                j = members[b]
                key = (i, j) if i < j else (j, i)
                if key in seen:
                    continue
                seen.add(key)
                xj0, yj0, xj1, yj1 = segs[j]
                sx, sy = xj1 - xj0, yj1 - yj0
                den = _cross(rx, ry, sx, sy)
                if abs(den) > 1e-12:
                    qpx, qpy = xj0 - xi0, yj0 - yi0
                    t = _cross(qpx, qpy, sx, sy) / den
                    u = _cross(qpx, qpy, rx, ry) / den
                    if 0 < t < 1 and 0 < u < 1:
                        splits[i].append(t)
                        splits[j].append(u)
                # Endpoints lying on the other segment: T-junctions and overlaps.
                touch(i, xj0, yj0)
                touch(i, xj1, yj1)
                touch(j, xi0, yi0)
                touch(j, xi1, yi1)

    # Snap the pieces' endpoints into nodes.
    nodes = []
    ngrid = defaultdict(list)

    def node(x, y):
        gx, gy = int(math.floor(x / tol)), int(math.floor(y / tol))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for k in ngrid.get((gx + dx, gy + dy), ()):
                    nx, ny = nodes[k]
                    if (nx - x) ** 2 + (ny - y) ** 2 <= tol * tol:
                        return k
        nodes.append((x, y))
        ngrid[(gx, gy)].append(len(nodes) - 1)
        return len(nodes) - 1

    edges = set()
    for i, (x0, y0, x1, y1) in enumerate(segs):
        ts = sorted(set(splits[i]))
        prev = None
        for t in ts:
            k = node(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
            if prev is not None and prev != k:
                edges.add((prev, k) if prev < k else (k, prev))
            prev = k
    return nodes, sorted(edges)


def _area(ring, nodes):
    """Signed area in maths orientation (y up): positive = counter-clockwise."""
    s = 0.0
    for a, b in zip(ring, ring[1:] + ring[:1]):
        (x0, y0), (x1, y1) = nodes[a], nodes[b]
        s += x0 * (-y1) - x1 * (-y0)
    return s / 2


def _inside(px, py, ring, nodes):
    c = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        (x0, y0), (x1, y1) = nodes[a], nodes[b]
        if (y0 > py) != (y1 > py):
            if px < x0 + (py - y0) * (x1 - x0) / (y1 - y0):
                c = not c
    return c


def trace_faces(nodes, edges):
    """Faces of the planar graph: list of [outer ring, *holes] (rings are node index lists), plus the
    half-edge -> face map (None for the unbounded face)."""
    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    pos = {}
    for v, nb in adj.items():
        x, y = nodes[v]
        nb.sort(key=lambda w: math.atan2(-(nodes[w][1] - y), nodes[w][0] - x))
        pos[v] = {w: i for i, w in enumerate(nb)}
    cycle_of = {}
    cycles = []
    for a, b in edges:
        for u, v in ((a, b), (b, a)):
            if (u, v) in cycle_of:
                continue
            cid = len(cycles)
            cyc = []
            cu, cv = u, v
            while (cu, cv) not in cycle_of:
                cycle_of[(cu, cv)] = cid
                cyc.append(cu)
                nb = adj[cv]
                w = nb[(pos[cv][cu] - 1) % len(nb)]  # the next edge clockwise: keeps the face on the left
                cu, cv = cv, w
            cycles.append(cyc)

    # Connected components, so a hole is only looked for inside other components' faces.
    parent = list(range(len(nodes)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    areas = [_area(c, nodes) for c in cycles]
    bbox = []
    for c in cycles:
        xs = [nodes[k][0] for k in c]
        ys = [nodes[k][1] for k in c]
        bbox.append((min(xs), min(ys), max(xs), max(ys)))
    outer = [i for i, a in enumerate(areas) if a > 1e-9]
    face_of_cycle = {}
    faces = []
    for i in outer:
        face_of_cycle[i] = len(faces)
        faces.append([cycles[i]])
    for i, a in enumerate(areas):
        if a > 1e-9:
            continue
        # A component's outer boundary: a hole in the smallest face of another component around it.
        comp = find(cycles[i][0])
        px, py = nodes[cycles[i][0]]
        best, best_area = None, None
        for j in outer:
            if find(cycles[j][0]) == comp or areas[j] <= -a:
                continue
            x0, y0, x1, y1 = bbox[j]
            if not (x0 <= px <= x1 and y0 <= py <= y1):
                continue
            if _inside(px, py, cycles[j], nodes) and (best is None or areas[j] < best_area):
                best, best_area = j, areas[j]
        if best is None:
            face_of_cycle[i] = None
        else:
            f = face_of_cycle[best]
            face_of_cycle[i] = f
            if a < -1e-9:
                faces[f].append(cycles[i])
    half_face = {he: face_of_cycle[c] for he, c in cycle_of.items()}
    return faces, half_face


def interior_point(rings, nodes):
    """A point well inside a face: the middle of the widest span on a few horizontal scanlines."""
    ys = [nodes[k][1] for k in rings[0]]
    y0, y1 = min(ys), max(ys)
    best = None
    for f in (0.5, 0.35, 0.65, 0.2, 0.8, 0.43, 0.57, 0.1, 0.9):
        y = y0 + (y1 - y0) * f
        xs = []
        for ring in rings:
            for a, b in zip(ring, ring[1:] + ring[:1]):
                (ax, ay), (bx, by) = nodes[a], nodes[b]
                if (ay <= y < by) or (by <= y < ay):
                    xs.append(ax + (y - ay) * (bx - ax) / (by - ay))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            w = xs[k + 1] - xs[k]
            if best is None or w > best[0]:
                best = (w, ((xs[k] + xs[k + 1]) / 2, y))
    if best is None:
        return nodes[rings[0][0]]
    return best[1]


def _rdp(points, tol):
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i, j = stack.pop()
        ax, ay = points[i]
        bx, by = points[j]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        best, bi = 0.0, -1
        for k in range(i + 1, j):
            px, py = points[k]
            d = math.hypot(px - ax, py - ay) if L < 1e-12 else abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best:
                best, bi = d, k
        if best > tol and bi > 0:
            keep[bi] = True
            stack.append((i, bi))
            stack.append((bi, j))
    return [p for p, k in zip(points, keep) if k]


def build(segs, label_at, tol=0.2, simplify=0.08, min_area=0.25):
    """Partition the picture by `segs` and label each piece with label_at(x, y) -> (label, depth) or None.

    Returns [(label, depth, rings)] where rings are lists of (x, y), outer first."""
    nodes, edges = node_segments(segs, tol)
    faces, half_face = trace_faces(nodes, edges)
    labels = []
    for rings in faces:
        hit = label_at(*interior_point(rings, nodes))
        labels.append(hit[0] if hit else None)
    # Keep only the edges with different labels on either side, and trace again: merged faces.
    keep = []
    for a, b in edges:
        fa, fb = half_face.get((a, b)), half_face.get((b, a))
        la = labels[fa] if fa is not None else None
        lb = labels[fb] if fb is not None else None
        if la != lb:
            keep.append((a, b))
    faces, _ = trace_faces(nodes, keep)

    # Simplify each boundary chain once, so neighbouring faces keep sharing it exactly.
    deg = defaultdict(int)
    for a, b in keep:
        deg[a] += 1
        deg[b] += 1
    chain_cache = {}

    def simplified_ring(ring):
        n = len(ring)
        joints = [i for i, k in enumerate(ring) if deg[k] != 2]
        if not joints:
            joints = [min(range(n), key=lambda i: ring[i])]
        out = []
        for idx, s in enumerate(joints):
            e = joints[(idx + 1) % len(joints)]
            run = [ring[(s + k) % n] for k in range(((e - s) % n or n) + 1)]
            key = (run[0], run[-1], run[1] if len(run) > 2 else None)
            rkey = (run[-1], run[0], run[-2] if len(run) > 2 else None)
            if key in chain_cache:
                pts = chain_cache[key]
            elif rkey in chain_cache:
                pts = chain_cache[rkey][::-1]
            else:
                pts = _rdp([nodes[k] for k in run], simplify)
                chain_cache[key] = pts
            out += pts[:-1]
        return out

    result = []
    for rings in faces:
        if abs(_area(rings[0], nodes)) < min_area:
            continue
        hit = label_at(*interior_point(rings, nodes))
        if not hit or hit[0] is None:
            continue
        label, depth = hit
        result.append((label, depth, [simplified_ring(r) for r in rings]))
    return result


def ring_d(rings, fmt):
    parts = []
    for ring in rings:
        if len(ring) < 3:
            continue
        head = f"M{fmt(ring[0][0])} {fmt(ring[0][1])}"
        rest = " ".join(f"{fmt(x)} {fmt(y)}" for x, y in ring[1:])
        parts.append(f"{head}L{rest}Z")
    return "".join(parts)
