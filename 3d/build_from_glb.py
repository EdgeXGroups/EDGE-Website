"""
Turns a downloaded tee model into the site's showroom tee.

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python 3d/build_from_glb.py -- [--preview DIR]

Source: design/fish_t-shirt.glb — "fish t-shirt" by Gleb Gubkin
(https://sketchfab.com/3d-models/fish-t-shirt-b2bf0e93920f42618fb0255e137a61c9),
licensed CC BY 4.0. Modified: merged, decimated, rescaled, re-UV'd, made plain white.
The site credits the author in the footer, as the licence requires.

Output: public/models/tee.glb + tee.json, same conventions as build_tee.py:
Z up in Blender (Y up in glTF), front faces -Y, hem at z = 0, and a 2:1 UV
atlas — left half = front print area, right half = back, 1 m square each.
"""
import bpy, bmesh, math, sys, json, os
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'design', 'fish_t-shirt.glb')
OUT = os.path.join(ROOT, 'public', 'models')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = argv[argv.index('--preview') + 1] if '--preview' in argv else None
ROT_Z = float(argv[argv.index('--rotz') + 1]) if '--rotz' in argv else 0.0   # turn so the front faces -Y
TARGET_H = 0.76          # real-world length of an oversized tee, metres
TARGET_TRIS = 120000
PRINT_SIZE, PRINT_CZ = 0.8, 0.38   # print square: tight around the tee = more texture pixels on the chest

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=SRC)

# ── one mesh, transforms applied, chunk seams welded ──
meshes = [o for o in scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
tee = bpy.context.active_object
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(scene.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o)
tee.name = 'Tee'

bm = bmesh.new(); bm.from_mesh(tee.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
bm.to_mesh(tee.data); bm.free()

def apply(mod):
    bpy.context.view_layer.objects.active = tee
    bpy.ops.object.modifier_apply(modifier=mod.name)

tris = sum(len(p.vertices) - 2 for p in tee.data.polygons)
m = tee.modifiers.new('dec', 'DECIMATE'); m.ratio = min(1.0, TARGET_TRIS / tris); m.use_collapse_triangulate = True
apply(m)

# ── orient, scale to a real tee, hem on the floor, centred ──
me = tee.data
if ROT_Z:
    me.transform(Matrix.Rotation(math.radians(ROT_Z), 4, 'Z'))
xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
h = max(zs) - min(zs)
k = TARGET_H / h
me.transform(Matrix.Translation((-(max(xs) + min(xs)) / 2, -(max(ys) + min(ys)) / 2, -min(zs))))
me.transform(Matrix.Scale(k, 4))
me.update()

xs = [v.co.x for v in me.vertices]; zs = [v.co.z for v in me.vertices]
height, width = max(zs), max(xs) - min(xs)
# body width: measured across a slice at 35 % height, below the sleeves
band = [v.co.x for v in me.vertices if 0.3 * height < v.co.z < 0.4 * height]
body_w = max(band) - min(band)

# ── UVs: planar front / back into the 2:1 atlas ──
for l in list(me.uv_layers):
    me.uv_layers.remove(l)
uv = me.uv_layers.new(name='UVMap')
half_body = body_w / 2 + 0.004
for poly in me.polygons:
    ny = poly.normal.y
    # sleeves (anything outside the torso's width) never take print
    sleeve = abs(poly.center.x) > half_body or poly.center.z > height - 0.045  # sleeves + collar band
    for li in poly.loop_indices:
        co = me.vertices[me.loops[li].vertex_index].co
        u = co.x / PRINT_SIZE + 0.5
        v = (co.z - PRINT_CZ) / PRINT_SIZE + 0.5
        if sleeve:
            uv.data[li].uv = (0.002, 0.002)               # plain fabric
        elif ny < -0.1:
            uv.data[li].uv = (u * 0.5, v)                 # front
        elif ny > 0.1:
            uv.data[li].uv = (0.5 + (1 - u) * 0.5, v)     # back, mirrored to read right from behind
        else:
            uv.data[li].uv = (0.002, 0.002)               # sides: plain fabric, no smeared print

# ── plain white fabric ──
me.materials.clear()
mat = bpy.data.materials.new('Fabric'); mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1)
bsdf.inputs['Roughness'].default_value = 0.95
me.materials.append(mat)
for img in list(bpy.data.images):
    bpy.data.images.remove(img)
bpy.ops.object.shade_smooth()

info = {
    'source': 'fish t-shirt by Gleb Gubkin — CC BY 4.0 — https://sketchfab.com/3d-models/fish-t-shirt-b2bf0e93920f42618fb0255e137a61c9',
    'tris': sum(len(p.vertices) - 2 for p in me.polygons),
    'height': height, 'width': width, 'bodyWidth': body_w, 'hemZ': 0.0,
    'printSize': PRINT_SIZE, 'printCenterZ': PRINT_CZ,
}
print('TEE', json.dumps(info))
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); tee.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'tee.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_texcoords=True, export_normals=True,
                          export_materials='EXPORT', export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=7, export_draco_position_quantization=14,
                          export_draco_normal_quantization=10, export_draco_texcoord_quantization=12)
with open(os.path.join(OUT, 'tee.json'), 'w') as f:
    json.dump(info, f, indent=2)

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.05, 0.06, 1)
    for name, loc, energy in (('key', (1.2, -1.6, 2.0), 110), ('fill', (-1.6, -1.0, 1.0), 40), ('rim', (0, 1.8, 1.6), 90)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = 1.2
        lo = bpy.data.objects.new(name, ld); lo.location = loc; scene.collection.objects.link(lo)
        lo.rotation_euler = (Vector((0, 0, 0.4)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
    scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x = 640; scene.render.resolution_y = 720
    target = Vector((0, 0, height / 2))
    for label, ang in (('front', 0), ('three_quarter', 35), ('side', 90), ('back', 180)):
        a = math.radians(ang)
        cam.location = target + Vector((2.3 * math.sin(a), -2.3 * math.cos(a), 0.15))
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(PREVIEW, f'glb_{label}.png')
        bpy.ops.render.render(write_still=True)
