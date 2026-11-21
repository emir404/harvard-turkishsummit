"""Mesh primitives for the isometric drawings.

Plain polygon meshes (a vertex list and faces as index tuples) built with
mathutils, so they run in Blender's Python without touching bpy. Units are
arbitrary; y is up. Closed solids get outward-facing faces; the open surfaces
(bands, rings) are two-sided and only need a consistent winding.
"""
import math

from mathutils import Matrix, Vector


def vec(x, y, z):
    return Vector((float(x), float(y), float(z)))


Y = vec(0, 1, 0)


class Mesh:
    __slots__ = ("verts", "faces")

    def __init__(self, verts=None, faces=None):
        self.verts = [Vector(v) for v in (verts or [])]
        self.faces = [tuple(f) for f in (faces or [])]

    def transform(self, m):
        m4 = m.to_4x4() if len(m) == 3 else m
        self.verts = [m4 @ v for v in self.verts]
        return self

    def translate(self, t):
        t = Vector(t)
        self.verts = [v + t for v in self.verts]
        return self

    def merge(self, *others):
        for o in others:
            off = len(self.verts)
            self.verts += [v.copy() for v in o.verts]
            self.faces += [tuple(i + off for i in f) for f in o.faces]
        return self


def newell(points):
    """Unit normal of a planar polygon (counter-clockwise seen from the front)."""
    n = Vector((0.0, 0.0, 0.0))
    k = len(points)
    for i in range(k):
        a, b = points[i], points[(i + 1) % k]
        n.x += (a.y - b.y) * (a.z + b.z)
        n.y += (a.z - b.z) * (a.x + b.x)
        n.z += (a.x - b.x) * (a.y + b.y)
    return n.normalized() if n.length > 1e-12 else n


def centroid(points):
    s = Vector((0.0, 0.0, 0.0))
    for p in points:
        s += p
    return s / max(1, len(points))


def orient_outward(mesh, center=None):
    """Turn every face to point away from `center` (the vertex centroid by default). For convex pieces."""
    c = center if center is not None else centroid(mesh.verts)
    faces = []
    for f in mesh.faces:
        pts = [mesh.verts[i] for i in f]
        if newell(pts).dot(centroid(pts) - c) < 0:
            f = tuple(reversed(f))
        faces.append(f)
    mesh.faces = faces
    return mesh


def align_y(axis):
    """Rotation taking +y onto `axis`."""
    axis = Vector(axis).normalized()
    return Y.rotation_difference(axis).to_matrix()


# ---------------------------------------------------------------------------
# Solids


def box(x0, y0, z0, x1, y1, z1):
    v = [
        vec(x0, y0, z0), vec(x1, y0, z0), vec(x1, y0, z1), vec(x0, y0, z1),
        vec(x0, y1, z0), vec(x1, y1, z0), vec(x1, y1, z1), vec(x0, y1, z1),
    ]
    f = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2)]
    return Mesh(v, f)


def oriented_box(center, size, rot=None):
    """A box of `size` (x, y, z) centred on the origin, rotated by `rot` (3x3) and moved to `center`."""
    sx, sy, sz = (s / 2 for s in size)
    m = box(-sx, -sy, -sz, sx, sy, sz)
    if rot is not None:
        m.transform(rot)
    return m.translate(center)


def tapered_box(base_center, w0, d0, w1, d1, h):
    """A box whose x/z section shrinks from w0 x d0 at the base to w1 x d1 at the top."""
    cx, cy, cz = base_center
    v = [
        vec(cx - w0 / 2, cy, cz - d0 / 2), vec(cx + w0 / 2, cy, cz - d0 / 2),
        vec(cx + w0 / 2, cy, cz + d0 / 2), vec(cx - w0 / 2, cy, cz + d0 / 2),
        vec(cx - w1 / 2, cy + h, cz - d1 / 2), vec(cx + w1 / 2, cy + h, cz - d1 / 2),
        vec(cx + w1 / 2, cy + h, cz + d1 / 2), vec(cx - w1 / 2, cy + h, cz + d1 / 2),
    ]
    f = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2)]
    return orient_outward(Mesh(v, f))


def prism(polygon, direction):
    """Extrude a planar convex polygon (3D points) along `direction`."""
    d = Vector(direction)
    n = len(polygon)
    v = [Vector(p) for p in polygon] + [Vector(p) + d for p in polygon]
    f = [tuple(range(n)), tuple(range(n, 2 * n))]
    f += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    return orient_outward(Mesh(v, f))


def frustum(base, axis, r0, r1, h, n=48, caps=True, phase=0.0):
    """Cylinder, truncated cone or cone (r1 = 0) standing on `base` along `axis`."""
    rot = align_y(axis)
    verts = []
    for i in range(n):
        a = phase + 2 * math.pi * i / n
        verts.append(vec(r0 * math.cos(a), 0, r0 * math.sin(a)))
    faces = []
    if r1 > 1e-9:
        for i in range(n):
            a = phase + 2 * math.pi * i / n
            verts.append(vec(r1 * math.cos(a), h, r1 * math.sin(a)))
        faces += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        if caps:
            faces.append(tuple(range(n)))
            faces.append(tuple(range(n, 2 * n)))
    else:
        verts.append(vec(0, h, 0))
        faces += [(i, (i + 1) % n, n) for i in range(n)]
        if caps:
            faces.append(tuple(range(n)))
    m = Mesh(verts, faces)
    orient_outward(m, vec(0, h * 0.5 if r1 > 1e-9 else h * 0.25, 0))
    m.transform(rot)
    return m.translate(base)


def uv_sphere(center, r, nu=64, nv=32):
    """For occlusion only: inscribed in the true sphere, so lines placed on the true surface sit outside it."""
    verts = [vec(0, r, 0)]
    for j in range(1, nv):
        t = math.pi * j / nv
        for i in range(nu):
            a = 2 * math.pi * i / nu
            verts.append(vec(r * math.sin(t) * math.cos(a), r * math.cos(t), r * math.sin(t) * math.sin(a)))
    verts.append(vec(0, -r, 0))
    faces = []
    south = len(verts) - 1
    for i in range(nu):
        faces.append((0, 1 + (i + 1) % nu, 1 + i))
    for j in range(nv - 2):
        r0, r1 = 1 + j * nu, 1 + (j + 1) * nu
        for i in range(nu):
            faces.append((r0 + i, r0 + (i + 1) % nu, r1 + (i + 1) % nu, r1 + i))
    last = 1 + (nv - 2) * nu
    for i in range(nu):
        faces.append((last + i, last + (i + 1) % nu, south))
    m = orient_outward(Mesh(verts, faces), vec(0, 0, 0))
    return m.translate(center)


def dome(center, r, nu=64, nv=16):
    """Upper hemisphere with a flat base, for occlusion."""
    verts = [vec(0, r, 0)]
    for j in range(1, nv + 1):
        t = (math.pi / 2) * j / nv
        for i in range(nu):
            a = 2 * math.pi * i / nu
            verts.append(vec(r * math.sin(t) * math.cos(a), r * math.cos(t), r * math.sin(t) * math.sin(a)))
    faces = []
    for i in range(nu):
        faces.append((0, 1 + (i + 1) % nu, 1 + i))
    for j in range(nv - 1):
        r0, r1 = 1 + j * nu, 1 + (j + 1) * nu
        for i in range(nu):
            faces.append((r0 + i, r0 + (i + 1) % nu, r1 + (i + 1) % nu, r1 + i))
    base = 1 + (nv - 1) * nu
    faces.append(tuple(base + i for i in range(nu)))
    m = orient_outward(Mesh(verts, faces), vec(0, r * 0.3, 0))
    return m.translate(center)


# ---------------------------------------------------------------------------
# Open surfaces (two-sided)


def helix_band(radius, y0, y1, turns, phase, width, n=160, center=(0, 0, 0)):
    """A strip lying on a vertical cylinder, winding up it: the strand of a double helix."""
    c = Vector(center)
    verts = []
    for i in range(n + 1):
        t = i / n
        a = phase + 2 * math.pi * turns * t
        y = y0 + (y1 - y0) * t
        x, z = radius * math.cos(a), radius * math.sin(a)
        verts.append(c + vec(x, y - width / 2, z))
        verts.append(c + vec(x, y + width / 2, z))
    faces = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(n)]
    return Mesh(verts, faces)


def ring_sector(center, u, v, r_in, r_out, a0, a1, n=96):
    """A flat ring (annulus) sector in the plane spanned by unit vectors u and v, from angle a0 to a1."""
    c, u, v = Vector(center), Vector(u).normalized(), Vector(v).normalized()
    verts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        d = u * math.cos(a) + v * math.sin(a)
        verts.append(c + d * r_in)
        verts.append(c + d * r_out)
    faces = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(n)]
    return Mesh(verts, faces)


# ---------------------------------------------------------------------------
# Curves (for wires)


def circle_points(center, u, v, r, n=128, a0=0.0, a1=2 * math.pi):
    c, u, v = Vector(center), Vector(u).normalized(), Vector(v).normalized()
    return [c + (u * math.cos(a0 + (a1 - a0) * i / n) + v * math.sin(a0 + (a1 - a0) * i / n)) * r for i in range(n + 1)]


def rot_axis(axis, angle):
    return Matrix.Rotation(angle, 3, Vector(axis).normalized())
