// "Spotlight" — a scroll-scrubbed light sequence: a lens flare blooms,
// contracts into a hexagonal aperture, throws a beam down onto a curved glass
// rim, and the newest design is revealed standing in the light.
//
// Choreography inspired by Filip Zrnzevic's "Aperture Light" pen
// (codepen.io/filipz), itself a recreation of a sequence from an Apple film.
// This is an independent, much lighter implementation: analytic shapes and a
// single progress uniform instead of keyframe data fitted to the video.
import {
  WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial, Vector2, Color,
} from 'three'

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uT, uTime;
  uniform vec2 uRes, uMouse;
  uniform vec3 uAccent;
  uniform float uApY, uRimY;

  float g(float x) { return exp(-x * x); }
  float ease(float a, float b, float t) { t = clamp((t - a) / (b - a), 0., 1.); return t * t * t * (t * (t * 6. - 15.) + 10.); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash1(float n) { return fract(sin(n * 91.345) * 47453.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  // rounded hexagon, flat top/bottom
  float sdHex(vec2 p, float r) {
    const vec3 k = vec3(-.8660254, .5, .5773503);
    p = abs(p.yx);
    p -= 2. * min(dot(k.xy, p), 0.) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = (vUv - .5) * vec2(aspect, 1.);
    float T = uT;
    vec2 A = vec2(0., uApY);
    float L = uApY - uRimY;
    vec3 c = vec3(0.);

    // ── 1. flare: blooms, then contracts into the aperture ──
    float bloom = ease(.02, .11, T);
    float shrink = ease(.16, .34, T);
    float s = mix(.5, .025, shrink);
    vec2 d = p - A;
    float r = length(d);
    float flareOn = bloom * (1. - ease(.33, .46, T) * .92);
    vec3 fl = vec3(1., .96, .92) * exp(-r * r / (s * s * .012)) * 2.2
      + vec3(.55, .65, 1.) * exp(-r / (s * .28 + .004)) * .55;
    float streak = exp(-abs(d.y) / (.0025 + .004 * s)) * exp(-abs(d.x) / (s * 1.7 + .04));
    fl += vec3(.55, .68, 1.) * streak * .9 * (1. - shrink * .75);
    float wr = .012 + .03 * s;
    fl += vec3(g((r - s * .84) / wr), g((r - s * .9) / wr), g((r - s * .97) / wr)) * .28 * (1. - shrink);
    // lens ghosts slide along the axis from the source through the pointer
    vec2 axis = uMouse - A;
    float ghostsOn = ease(.06, .14, T) * (1. - ease(.3, .42, T));
    fl += vec3(.06, .11, .05) * smoothstep(.07, .064, length(p - (A + axis * 1.35))) * ghostsOn;
    fl += vec3(.03, .07, .14) * smoothstep(.045, .04, length(p - (A + axis * 1.8))) * ghostsOn;
    fl += vec3(.12, .03, .05) * g((length(p - (A + axis * .55)) - .16) / .03) * ghostsOn * .6;
    c += fl * flareOn;

    // ── 2. aperture ──
    float apOn = ease(.28, .38, T);
    float ar = .026;
    float sd = sdHex(d * vec2(1., 1.35), ar);
    float core = 1. - smoothstep(-fwidth(sd), fwidth(sd), sd);
    float halo = exp(-r / .025) * .7 + exp(-r / .09) * .18;

    // ── 3. beam ──
    float beamOn = ease(.34, .4, T);
    float front = uApY - L * ease(.34, .54, T);
    float depth = uApY - p.y;
    float u = clamp(depth / L, 0., 1.);
    float bw = min(.21, .46 * aspect);
    float w = mix(ar * .75, bw, pow(u, .85));
    float lateral = exp(-pow(abs(p.x) / w, 3.2));
    float coreLine = exp(-pow(abs(p.x) / (w * .3), 2.)) * exp(-depth * 3.5);
    float air = 1. + .22 * (noise(vec2(p.x / w * 5., uTime * .12)) - .5)
                   + .1 * (noise(vec2(p.x * 60., depth * 9. - uTime * .35)) - .5);
    float rimCurveHere = uRimY - (2.4 - sqrt(max(.0001, 2.4 * 2.4 - p.x * p.x)));
    float inBeam = smoothstep(front - .015, front + .04, p.y)
                 * smoothstep(uApY + .004, uApY - .02, p.y)
                 * smoothstep(rimCurveHere - .05, rimCurveHere + .005, p.y);
    vec3 beam = vec3(.7, .8, 1.) * (lateral * mix(.85, .3, u) + coreLine * .9) * air;
    c += beam * inBeam * beamOn;

    // dust drifting in the beam
    float dustOn = ease(.46, .56, T);
    if (dustOn > 0. && depth > 0. && depth < L) {
      float px = 1. / uRes.y;
      for (int i = 0; i < 26; i++) {
        float fi = float(i);
        float dd = fract(hash1(fi) + uTime * (.006 + .01 * hash1(fi + 3.)));
        float mdepth = dd * L;
        float mw = mix(ar * .75, bw, pow(dd, .85));
        vec2 m = vec2((hash1(fi + 7.) - .5) * 1.6 * mw + sin(uTime * .4 + fi) * .006, uApY - mdepth);
        float rad = .0018 + .0022 * hash1(fi + 11.);
        float tw = .5 + .5 * sin(uTime * (1. + hash1(fi + 5.) * 2.) + fi);
        vec2 dm = p - m;
        float f2 = rad * rad + px * px;
        c += vec3(.85, .9, 1.) * exp(-dot(dm, dm) / f2) * tw * .9 * dustOn * exp(-pow(abs(m.x) / mw, 3.));
      }
    }

    // aperture sits on top of the beam root
    c = mix(c + vec3(.8, .88, 1.) * halo * apOn, vec3(5.), core * apOn);

    // ── 4. glass rim ──
    float rimOn = ease(.5, .58, T);
    float R = 2.4;
    float x = p.x;
    float curve = uRimY - (R - sqrt(max(.0001, R * R - x * x)));
    float edge = p.y - curve;
    float rw = min(.62, .95 * aspect);
    float fall = exp(-pow(x / rw, 2.));
    float hot = 1. + 2.4 * exp(-pow(x / (bw * .8), 2.));
    vec3 rim = vec3(.95, .97, 1.) * g(edge / .0022) * 1.1
      + vec3(.35, .55, 1.) * g((edge + .006) / .003) * .45
      + mix(vec3(1., .55, .35), uAccent, .5) * g((edge + .013) / .004) * .3
      + vec3(.25, .35, .6) * g((edge + .024) / .006) * .18;
    float flash = 1. + 1.4 * g((T - .585) / .018);
    c += rim * fall * hot * rimOn * flash;
    // glass body catching the beam below the rim
    float body = step(edge, 0.) * exp(edge * 7.) * exp(-pow(x / (bw * 1.3), 2.));
    c += vec3(.05, .065, .1) * body * rimOn;
    // warm spill on the glass in the design's colour
    c += uAccent * .05 * exp(edge * 12.) * step(edge, 0.) * exp(-pow(x / bw, 2.)) * rimOn;

    // soft ambient spill once lit
    c += vec3(.012, .016, .026) * exp(-length(p - vec2(0., uRimY)) * 2.2) * beamOn;

    c = 1. - exp(-c * 1.15);
    c += (hash(gl_FragCoord.xy + fract(uTime) * 91.) - .5) / 120.;
    gl_FragColor = vec4(c, 1.);
  }
`

export function createSpotlight(canvas, { accent = '#ffffff', apertureY = 0.34, rimY = -0.3 } = {}) {
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  const isTouch = matchMedia('(pointer: coarse)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 1.75)
  renderer.setPixelRatio(dpr)
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const uniforms = {
    uT: { value: 0 },
    uTime: { value: 0 },
    uRes: { value: new Vector2(1, 1) },
    uMouse: { value: new Vector2(0.25, -0.1) },
    uAccent: { value: new Color(accent) },
    uApY: { value: apertureY },
    uRimY: { value: rimY },
  }
  scene.add(new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms })))

  const target = new Vector2(0.25, -0.1)
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    const a = r.width / r.height
    target.set(((e.clientX - r.left) / r.width - 0.5) * a, 0.5 - (e.clientY - r.top) / r.height)
  }, { passive: true })

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    uniforms.uRes.value.set(w * dpr, h * dpr)
  }
  resize()
  addEventListener('resize', resize)

  let visible = false
  new IntersectionObserver(([e]) => { visible = e.isIntersecting }).observe(canvas)
  let prev = performance.now()
  function frame(now) {
    requestAnimationFrame(frame)
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    if (!visible || document.hidden) return
    uniforms.uTime.value += dt
    uniforms.uMouse.value.lerp(target, 1 - Math.pow(0.02, dt))
    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame)
  return { uniforms, resize }
}
