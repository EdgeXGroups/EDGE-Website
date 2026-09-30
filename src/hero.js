import {
  WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial,
  TextureLoader, Vector2, Color, LinearFilter, SRGBColorSpace,
} from 'three'

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uIntro, uScroll, uVel, uLogoAspect, uDpr;
  uniform vec2 uRes, uMouse;
  uniform sampler2D uLogo;
  uniform vec3 uAccent;

  // Ashima 3D simplex noise
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm(vec3 p){ float f=0., a=.5; for(int i=0;i<4;i++){ f+=a*snoise(p); p*=2.02; a*=.5; } return f; }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

  float logoAt(vec2 uv){
    if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.;
    return texture2D(uLogo, uv).a;
  }

  void main(){
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    vec2 p = (uv - .5) * vec2(aspect, 1.);
    vec2 m = (uMouse - .5) * vec2(aspect, 1.);
    float t = uTime * .06;

    // ── topographic field ──
    vec2 q = vec2(fbm(vec3(p*1.3, t)), fbm(vec3(p*1.3 + 5.2, t)));
    float md = length(p - m);
    float lift = exp(-md*md*9.) * (.35 + uVel*1.2);
    float h = fbm(vec3(p*1.1 + q*.9, t*.7)) + lift;

    float bands = h * 14.;
    float w = fwidth(bands) * 1.1;
    float line = smoothstep(.5 - w, .5, abs(fract(bands) - .5));
    float b5 = bands / 5.;
    float major = smoothstep(.5 - fwidth(b5) * 1.6, .5, abs(fract(b5) - .5));

    vec3 ink = vec3(.035);
    vec3 col = ink + vec3(.03) * (h + .5);
    float near = exp(-md*md*11.);
    col += line * mix(vec3(.10), uAccent*.95, near);
    col += major * .05;

    // ── liquid wordmark ──
    bool portrait = aspect < 1.;
    float lw = portrait ? .94 * aspect : min(.68 * aspect, 1.7);
    vec2 lsize = vec2(lw, lw / uLogoAspect);
    vec2 center = vec2(0., portrait ? .06 : .02);
    vec2 lp = p - center;

    float wave = snoise(vec3(lp*3., uTime*.35));
    float ripple = exp(-length(lp - (m-center))*6.) * (.02 + uVel*.08);
    float distort = .006 + wave*.008 + ripple + uScroll*.12 + (1.-uIntro)*.08;
    vec2 dir = normalize(lp - (m-center) + 1e-4);
    vec2 off = dir * distort + vec2(wave*.006, 0.);

    vec2 luv = (lp / lsize) + .5;
    float split = .004 + uVel*.02 + uScroll*.05;
    float r = logoAt(luv + off/lsize + vec2(split, 0.));
    float g = logoAt(luv + off/lsize);
    float b = logoAt(luv + off/lsize - vec2(split, 0.));

    // noisy dissolve on intro
    float dn = snoise(vec3(lp*6., 1.)) * .5 + .5;
    float reveal = smoothstep(dn - .08, dn, uIntro * 1.1);
    float fade = 1. - smoothstep(.1, .9, uScroll);
    vec3 logo = vec3(r, g, b);
    vec3 fringe = vec3(r - g, 0., b - g);
    vec3 logoCol = vec3(g) * vec3(.94, .93, .9) + max(fringe.x, 0.) * uAccent + max(fringe.z, 0.) * vec3(.3,.6,1.);
    float la = max(max(r, g), b) * reveal * fade;
    col = mix(col, logoCol, la);

    // dissolve edge glow
    float edge = smoothstep(dn - .1, dn - .02, uIntro*1.1) - reveal;
    col += uAccent * edge * g * 2.;

    // vignette + grain
    col *= 1. - dot(p*.55, p*.55);
    col += (hash(uv*uRes + fract(uTime)*100.) - .5) * .06;
    col *= smoothstep(0., .6, uIntro + .4);

    gl_FragColor = vec4(col, 1.);
  }
`

export function createHero(canvas, { accent = '#FF4A1C', logo = '/brand/edge-wordmark.png' } = {}) {
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  } catch (e) {
    return null
  }
  const isTouch = matchMedia('(pointer: coarse)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.6)
  renderer.setPixelRatio(dpr)

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const uniforms = {
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uScroll: { value: 0 },
    uVel: { value: 0 },
    uDpr: { value: dpr },
    uRes: { value: new Vector2(1, 1) },
    uMouse: { value: new Vector2(0.5, 0.35) },
    uLogo: { value: null },
    uLogoAspect: { value: 1800 / 728 },
    uAccent: { value: new Color(accent) },
  }
  const mat = new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms })
  scene.add(new Mesh(new PlaneGeometry(2, 2), mat))

  const ready = new Promise((resolve) => {
    new TextureLoader().load(logo, (tex) => {
      tex.minFilter = LinearFilter
      tex.colorSpace = SRGBColorSpace
      uniforms.uLogo.value = tex
      uniforms.uLogoAspect.value = tex.image.width / tex.image.height
      resolve()
    }, undefined, resolve)
  })

  const target = new Vector2(0.5, 0.35)
  const last = new Vector2(0.5, 0.35)
  let vel = 0
  let idle = 0

  function setPointer(x, y) {
    const r = canvas.getBoundingClientRect()
    target.set((x - r.left) / r.width, 1 - (y - r.top) / r.height)
    idle = 0
  }
  window.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY), { passive: true })
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY) }, { passive: true })

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    uniforms.uRes.value.set(w * dpr, h * dpr)
  }
  resize()
  window.addEventListener('resize', resize)

  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting }).observe(canvas)

  let prev = performance.now()
  function frame(now) {
    requestAnimationFrame(frame)
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    if (!visible || document.hidden) return
    idle += dt
    // when nobody touches it, the "cursor" drifts on its own so phones feel alive
    if (idle > 2.5) {
      const t = now / 1000
      target.set(0.5 + Math.sin(t * 0.4) * 0.3, 0.45 + Math.cos(t * 0.53) * 0.22)
    }
    const m = uniforms.uMouse.value
    m.lerp(target, 1 - Math.pow(0.001, dt))
    const speed = m.distanceTo(last) / Math.max(dt, 1e-3)
    last.copy(m)
    vel += (Math.min(speed * 0.5, 1) - vel) * (1 - Math.pow(0.02, dt))
    uniforms.uVel.value = idle > 2.5 ? vel * 0.3 : vel
    uniforms.uTime.value += dt
    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame)

  return { uniforms, ready }
}
