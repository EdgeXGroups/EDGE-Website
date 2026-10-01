"""
Builds a simple generated oversized tee (public/models/tee-simple.glb).
The site uses public/models/tee.glb from build_from_glb.py; this is the
fallback if you ever need a model with no licence attached.

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python 3d/build_tee.py -- [--preview DIR]

Axes (Blender): Z up, X across the chest, front of the tee faces -Y.
UVs: one 2:1 texture. Left half = front print area, right half = back
print area, both planar projections of the same physical square, so a
flat artwork PNG lands on the shirt exactly as drawn.
"""
import bpy, bmesh, math, sys, json, os
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = argv[argv.index('--preview') + 1] if '--preview' in argv else None

# ── measurements (metres) — an oversized, boxy fit ──
HALF_W = 0.29        # half chest width (58 cm flat)
HALF_D = 0.135       # half body depth
LENGTH = 0.76        # hem → shoulder line
SHOULDER_Z = 0.69    # where the dropped shoulder seam sits
NECK_RX, NECK_RY = 0.095, 0.085
SLEEVE_LEN = 0.27
SLEEVE_R0, SLEEVE_R1 = 0.125, 0.1     # at armhole / at cuff
SLEEVE_DROP = math.radians(34)        # angle below horizontal
PRINT_SIZE = 1.0     # physical size of the square print area (covers body + sleeves)
PRINT_CZ = 0.38      # vertical centre of the print area

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def superellipse(a, b, n=72, p=2.6):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        x = a * math.copysign(abs(c) ** (2 / p), c)
        y = b * math.copysign(abs(s) ** (2 / p), s)
        pts.append((x, y))
    return pts


def loft(rings, cap_start=True, cap_end=True, name='loft'):
    """rings: list of lists of 3D points (same count)."""
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(rings[0])
    for r in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((vs[r][i], vs[r][j], vs[r + 1][j], vs[r + 1][i]))
    if cap_start:
        bm.faces.new(list(reversed(vs[0])))
    if cap_end:
        bm.faces.new(vs[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


# ── torso: boxy section, shoulders rounding into the neck ──
torso_profile = [  # z, half width, half depth, boxiness
    (0.00, HALF_W, HALF_D, 2.8),
    (0.22, HALF_W, HALF_D + 0.005, 2.8),
    (0.45, HALF_W, HALF_D + 0.01, 2.7),
    (0.62, HALF_W, HALF_D + 0.005, 2.6),
    (0.68, HALF_W - 0.01, HALF_D - 0.005, 2.5),
    (0.72, HALF_W - 0.04, HALF_D - 0.02, 2.4),
    (0.74, HALF_W - 0.09, HALF_D - 0.035, 2.2),
    (0.755, HALF_W - 0.16, HALF_D - 0.05, 2.0),
    (0.76, 0.10, 0.07, 2.0),
]
rings = []
for z, a, b, p in torso_profile:
    rings.append([(x, y, z) for x, y in superellipse(a, b, p=p)])
torso = loft(rings, name='torso')

# ── sleeves: wide tubes leaving a dropped shoulder at an angle ──
sleeves = []
for side in (-1, 1):
    root = Vector((side * (HALF_W - 0.08), 0, SHOULDER_Z - 0.1))
    axis = Vector((side * math.cos(SLEEVE_DROP), 0, -math.sin(SLEEVE_DROP)))
    # local frame: axis, up-ish, depth (y)
    yv = Vector((0, 1, 0))
    up = axis.cross(yv).normalized() * side
    srings = []
    steps = 8
    for k in range(steps + 1):
        t = k / steps
        L = -0.06 + (SLEEVE_LEN + 0.06) * t
        r = SLEEVE_R0 + (SLEEVE_R1 - SLEEVE_R0) * max(0, t)
        centre = root + axis * L
        ring = []
        for x, y in superellipse(r, r * 0.72, p=2.3):
            ring.append(tuple(centre + up * x + yv * y))
        srings.append(ring)
    sleeves.append(loft(srings, name=f'sleeve{side}'))

# ── fuse into one surface ──
for o in sleeves:
    o.select_set(True)
torso.select_set(True)
bpy.context.view_layer.objects.active = torso
bpy.ops.object.join()
tee = bpy.context.active_object
tee.name = 'Tee'


def apply(mod):
    bpy.context.view_layer.objects.active = tee
    bpy.ops.object.modifier_apply(modifier=mod.name)


m = tee.modifiers.new('remesh', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = 0.0075; apply(m)
m = tee.modifiers.new('smooth', 'CORRECTIVE_SMOOTH'); m.factor = 1.0; m.iterations = 18; m.use_only_smooth = True; apply(m)
m = tee.modifiers.new('smooth2', 'SMOOTH'); m.factor = 0.6; m.iterations = 6; apply(m)

# ── open the neck, hem and cuffs ──
bm = bmesh.new(); bm.from_mesh(tee.data)
# hem and cuffs: clean planar cuts
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0.012), plane_no=(0, 0, 1), clear_inner=True)
for side in (-1, 1):
    axis = Vector((side * math.cos(SLEEVE_DROP), 0, -math.sin(SLEEVE_DROP)))
    root = Vector((side * (HALF_W - 0.08), 0, SHOULDER_Z - 0.1))
    def in_sleeve(c):
        d = c - root
        along = d.dot(axis)
        return along > SLEEVE_LEN * 0.6 and (d - axis * along).length < SLEEVE_R0 + 0.04 and abs(c.x) > HALF_W + 0.015
    near = [f for f in bm.faces if in_sleeve(f.calc_center_median())]
    geom = list({v for f in near for v in f.verts}) + list({e for f in near for e in f.edges}) + near
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=root + axis * (SLEEVE_LEN - 0.01), plane_no=axis, clear_outer=True)
# neck: remove the top inside an ellipse, then snap the edge onto the ellipse
bm.faces.ensure_lookup_table()
kill = []
for f in bm.faces:
    c = f.calc_center_median()
    nx, ny = c.x / NECK_RX, (c.y + 0.015) / NECK_RY
    if c.z > LENGTH - 0.08 and nx * nx + ny * ny < 1.0 and f.normal.z > 0.1:
        kill.append(f)
bmesh.ops.delete(bm, geom=kill, context='FACES')
for v in bm.verts:
    if v.is_boundary and v.co.z > LENGTH - 0.1:
        dx, dy = v.co.x / NECK_RX, (v.co.y + 0.015) / NECK_RY
        r = math.hypot(dx, dy) or 1
        v.co.x, v.co.y = v.co.x / r, (v.co.y + 0.015) / r - 0.015
# relax every opening edge a little
for _ in range(4):
    bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if v.is_boundary], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=False)

# collar band: extrude the neck opening up and slightly in
boundary = [e for e in bm.edges if e.is_boundary]
neck_edges = [e for e in boundary if all(v.co.z > LENGTH - 0.1 for v in e.verts)]
res = bmesh.ops.extrude_edge_only(bm, edges=neck_edges)
new_verts = [v for v in res['geom'] if isinstance(v, bmesh.types.BMVert)]
for v in new_verts:
    v.co.z += 0.016
    v.co.x *= 0.97
    v.co.y = (v.co.y + 0.015) * 0.97 - 0.015
collar_faces = {f for v in new_verts for f in v.link_faces}
bm.to_mesh(tee.data); bm.free()

# subtle drape: long vertical folds, a little more toward the hem
tex = bpy.data.textures.new('folds', 'CLOUDS'); tex.noise_scale = 0.55; tex.noise_depth = 2
grp = tee.vertex_groups.new(name='drape')
for v in tee.data.vertices:
    edge = 0.0 if v.co.z < 0.03 else 1.0  # keep the hem line clean
    grp.add([v.index], (max(0.0, 1.0 - v.co.z / 0.78) * 0.8 + 0.2) * edge, 'REPLACE')
m = tee.modifiers.new('drape', 'DISPLACE'); m.texture = tex; m.strength = 0.007; m.mid_level = 0.5; m.vertex_group = 'drape'
m.texture_coords = 'LOCAL'
tee.scale = (1, 1, 1)
# stretch the noise vertically so folds run down the body
empty = bpy.data.objects.new('foldspace', None); scene.collection.objects.link(empty)
empty.scale = (1.0, 1.0, 5.0)
m.texture_coords = 'OBJECT'; m.texture_coords_object = empty
apply(m)

m = tee.modifiers.new('dec', 'DECIMATE'); m.ratio = 0.16; apply(m)

# ── UVs: planar front / back projection into a 2:1 atlas ──
me = tee.data
uv = me.uv_layers.new(name='UVMap')
for poly in me.polygons:
    front = poly.normal.y < 0
    for li in poly.loop_indices:
        co = me.vertices[me.loops[li].vertex_index].co
        u = (co.x / PRINT_SIZE) + 0.5
        v = (co.z - PRINT_CZ) / PRINT_SIZE + 0.5
        if front:
            uv.data[li].uv = (u * 0.5, v)
        else:
            uv.data[li].uv = (0.5 + (1 - u) * 0.5, v)  # mirrored: reads right way round from behind


# fabric thickness + smooth shading
m = tee.modifiers.new('thick', 'SOLIDIFY'); m.thickness = 0.004; m.offset = -1; m.use_rim = True
bpy.ops.object.select_all(action='DESELECT'); tee.select_set(True); bpy.context.view_layer.objects.active = tee
apply(m)
bpy.ops.object.shade_smooth()

# material placeholder (the site swaps in each design's texture)
mat = bpy.data.materials.new('Fabric')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (0.92, 0.91, 0.88, 1)
bsdf.inputs['Roughness'].default_value = 0.92
tee.data.materials.append(mat)

# centre on the hem so it stands on the rim in the site
bbox = [tee.matrix_world @ Vector(c) for c in tee.bound_box]
minz = min(c.z for c in bbox)
tee.location.z -= minz

os.makedirs(OUT, exist_ok=True)
info = {
    'tris': sum(len(p.vertices) - 2 for p in tee.data.polygons),
    'height': max(c.z for c in bbox) - minz,
    'width': max(c.x for c in bbox) - min(c.x for c in bbox),
    'printSize': PRINT_SIZE, 'printCenterZ': PRINT_CZ - minz,
}
print('TEE', json.dumps(info))

bpy.ops.object.select_all(action='DESELECT'); tee.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'tee-simple.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_texcoords=True, export_normals=True,
                          export_materials='EXPORT')
with open(os.path.join(OUT, 'tee-simple.json'), 'w') as f:
    json.dump(info, f, indent=2)

# ── preview renders ──
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    world = bpy.data.worlds.new('w'); scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.05, 0.06, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    for name, loc, energy in (('key', (1.2, -1.6, 2.0), 110), ('fill', (-1.6, -1.0, 1.0), 40), ('rim', (0, 1.8, 1.6), 90)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = 1.2
        lo = bpy.data.objects.new(name, ld); lo.location = loc; scene.collection.objects.link(lo)
        lo.rotation_euler = (Vector((0, 0, 0.4)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 50
    cam = bpy.data.objects.new('cam', cam_d); scene.collection.objects.link(cam); scene.camera = cam
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 640; scene.render.resolution_y = 720
    target = Vector((0, 0, 0.4))
    for label, ang in (('front', 0), ('three_quarter', 35), ('side', 90), ('back', 180)):
        a = math.radians(ang)
        cam.location = target + Vector((2.3 * math.sin(a), -2.3 * math.cos(a), 0.15))
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(PREVIEW, f'tee_{label}.png')
        bpy.ops.render.render(write_still=True)
    print('PREVIEWS', PREVIEW)
