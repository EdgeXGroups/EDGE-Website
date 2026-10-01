// The 3D garments standing on the glass rim, drawn on top of the light.
//
// Tees use public/models/tee.glb (built by 3d/build_tee.py). Its UVs are a
// 2:1 atlas: left half = front print area, right half = back, both 1 m
// across. Until flat Figma prints exist, each design's front/back mockup
// image is laid onto that atlas over its fabric colour.
// Anything without a model (the zip jacket) is a two-sided photo card.
import {
  Scene, PerspectiveCamera, Group, Mesh, PlaneGeometry, MeshStandardMaterial, CanvasTexture, TextureLoader,
  SpotLight, AmbientLight, DirectionalLight, SRGBColorSpace, DoubleSide, FrontSide, Color, MathUtils,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const TEE_H = 0.764              // model height (m) — see public/models/tee.json
const TEE_W = 0.95               // model width incl. sleeves
const ATLAS = { w: 2048, h: 1024, pxPerM: 1024, top: 106, cxFront: 512, cxBack: 1536 }
const MOCKUP = { w: 1200, h: 1500, top: 219, bottom: 1279 } // tee silhouette inside the mockup images

const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

// Lay the mockup images onto the UV atlas: same scale front and back, print undistorted.
// Prefer real flat prints (made on the templates in 3d/templates): each one
// fills its half of the atlas exactly. Otherwise fall back to the mockups.
async function teeTexture(d, maxAniso) {
  const c = document.createElement('canvas')
  c.width = ATLAS.w; c.height = ATLAS.h
  const g = c.getContext('2d')
  g.fillStyle = d.garment || '#ddd'
  g.fillRect(0, 0, c.width, c.height)
  if (d.prints) {
    const [front, back] = await Promise.all([d.prints.front, d.prints.back].map((src) => (src ? loadImage(src) : null)))
    if (front) g.drawImage(front, 0, 0, ATLAS.h, ATLAS.h)
    if (back) g.drawImage(back, ATLAS.h, 0, ATLAS.h, ATLAS.h)
  } else {
    const [front, back] = await Promise.all(d.images.slice(0, 2).map(loadImage))
    const k = (TEE_H * ATLAS.pxPerM) / (MOCKUP.bottom - MOCKUP.top)
    const draw = (img, cx) => g.drawImage(img, cx - (MOCKUP.w * k) / 2, ATLAS.top - MOCKUP.top * k, MOCKUP.w * k, MOCKUP.h * k)
    draw(front, ATLAS.cxFront)
    if (back) draw(back, ATLAS.cxBack)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.flipY = false // glTF UVs run top-down, like the canvas
  t.anisotropy = maxAniso
  return t
}

export async function createShowroom3D(spot, designs) {
  const { renderer } = spot
  const scene = new Scene()
  const camera = new PerspectiveCamera(24, 1, 0.1, 50)
  const maxAniso = renderer.capabilities.getMaxAnisotropy()

  // light: a hard spot from the aperture, faint fill so the side pieces read as shapes
  const ambient = new AmbientLight(0xbfcaff, 0.08)
  const key = new SpotLight(0xe6ecff, 0, 0, MathUtils.degToRad(7), 0.65, 0)
  const rim = new DirectionalLight(0x9fb4ff, 0.0)
  const fill = new DirectionalLight(0xffffff, 0.0)
  scene.add(ambient, key, key.target, rim, fill)

  const gltf = await new GLTFLoader().loadAsync('/models/tee.glb')
  let teeGeo = null
  gltf.scene.traverse((o) => { if (o.isMesh && !teeGeo) teeGeo = o.geometry })
  teeGeo.computeBoundingBox()

  const pieces = await Promise.all(designs.map(async (d) => {
    const group = new Group()
    const inner = new Group() // turn + bob live here
    group.add(inner)
    let mats = []
    if (d.model === 'tee' && d.images?.length) {
      const mat = new MeshStandardMaterial({ map: await teeTexture(d, maxAniso), roughness: 0.92, metalness: 0, side: DoubleSide })
      const mesh = new Mesh(teeGeo, mat)
      inner.add(mesh)
      mats = [mat]
    } else {
      // two back-to-back photo cards
      const loader = new TextureLoader()
      const [ft, bt] = await Promise.all(d.images.slice(0, 2).map((src) => loader.loadAsync(src)))
      const geo = new PlaneGeometry(TEE_H * 0.8 * 1.06, TEE_H * 1.06)
      geo.translate(0, TEE_H * 0.53, 0)
      for (const [tex, rot] of [[ft, 0], [bt || ft, Math.PI]]) {
        tex.colorSpace = SRGBColorSpace
        const m = new MeshStandardMaterial({ map: tex, alphaTest: 0.4, roughness: 0.9, side: FrontSide })
        const card = new Mesh(geo, m)
        card.rotation.y = rot
        inner.add(card)
        mats.push(m)
      }
    }
    scene.add(group)
    return { d, group, inner, mats, bob: Math.random() * 6 }
  }))

  // screen ↔ world: world units at the z = 0 plane
  let unit = 1, H = 1, W = 1
  function layout(rimFraction) {
    W = spot.canvas.clientWidth; H = spot.canvas.clientHeight
    camera.aspect = W / H
    const dist = 6
    camera.position.set(0, 0, dist)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    unit = H / (2 * dist * Math.tan(MathUtils.degToRad(camera.fov / 2)))  // px per world unit
    const rimY = -(rimFraction * H - H / 2) / unit
    key.position.set(0, rimY + 6, 1.2)
    key.target.position.set(0, rimY, 0)
    rim.position.set(0, 2, -3)
    fill.position.set(2, 1, 4)
    return rimY
  }
  let rimY = 0
  let time = 0
  let last = null

  function update(slots, { lit, center, sides }, pieceHeightPx) {
      key.intensity = 3.2 * lit
      rim.intensity = 0.7 * lit
      fill.intensity = 0.4 * lit
      ambient.intensity = 0.06 + 0.08 * Math.max(center, sides)
      // fit the centre piece inside the same 4:5 box the photos used
      const s = Math.min((pieceHeightPx * 0.86) / TEE_H, (pieceHeightPx * 0.8 * 0.94) / TEE_W) / unit
      key.target.position.set(0, rimY + TEE_H * s * 0.55, 0)
      slots.forEach((sl, i) => {
        const p = pieces[i]
        const k = sl.side
        const vis = center * (1 - k) + sides * k
        p.group.visible = vis > 0.01
        p.group.position.set(sl.x / unit, rimY + ((1 - center) * -70 * (1 - k)) / unit, -k * 0.6)
        p.group.scale.setScalar(s * sl.s)
        p.inner.position.y = Math.sin(time * 1.2 + p.bob) * 0.012
        // the turn: a real rotation now, plus a slow idle sway
        const turn = (sl.turn ?? 0) * Math.PI
        p.inner.rotation.y = turn + Math.sin(time * 0.5 + p.bob) * 0.12 * (1 - k)
        p.mats.forEach((m) => {
          const fading = vis < 0.999
          if (m.transparent !== fading) { m.transparent = fading; m.needsUpdate = true }
          m.opacity = vis
          m.color.setScalar(1 - 0.62 * k) // side pieces sit in the shadow
        })
      })
  }

  return {
    scene, camera,
    setRim(f) { rimY = layout(f) },
    // the showroom hands over the latest slot state; drawn every frame
    sync(slots, state, pieceHeightPx) { last = [slots, state, pieceHeightPx] },
    tick(dt) { time += dt; if (last) update(...last) },
  }
}
