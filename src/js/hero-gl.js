// Full-screen warehouse photo: a liquid reveal on load, slowly drifting clouds,
// a gentle camera push-in and a ripple that follows the pointer. Three.js only.
import * as THREE from 'three';
import gsap from 'gsap';

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uImage;
  uniform float uReveal, uTime, uAspect, uImgAspect, uZoom, uHover;
  uniform vec2 uFocus, uMouse;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.05; a *= .5; } return v; }
  vec2 cover(vec2 uv){
    vec2 s = uAspect > uImgAspect ? vec2(1., uImgAspect / uAspect) : vec2(uAspect / uImgAspect, 1.);
    s /= uZoom;
    return uv * s + (1. - s) * uFocus;
  }
  void main(){
    vec2 uv = vUv;
    vec2 a = vec2(uAspect, 1.);
    vec2 d = (uv - uMouse) * a;
    float r = length(d);
    uv += normalize(d + 1e-4) / a * sin(r * 30. - uTime * 3.) * exp(-r * 8.) * .006 * uHover;

    vec2 p = cover(uv);
    // Only the sky above the roofline moves, so the building and signs stay sharp.
    float sky = smoothstep(.77, .93, p.y);
    p += vec2(fbm(p * 3. + vec2(uTime * .035, 0.)) - .5, fbm(p * 3. + 7. - uTime * .025) - .5) * .028 * sky;
    vec3 col = texture2D(uImage, p).rgb;

    float n = fbm(vUv * a * 2.6);
    float shown = smoothstep(n - .12, n + .12, uReveal * 1.4 - .2);
    float seam = shown * (1. - shown) * 4.;
    col = mix(vec3(.078, .047, .031), col, shown) + vec3(.89, .11, .07) * seam * .8;
    gl_FragColor = vec4(col, 1.);
  }
`;

export async function createHeroScene(canvas, url) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const texture = await new THREE.TextureLoader().loadAsync(url);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const uniforms = {
    uImage: { value: texture }, uReveal: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 },
    uImgAspect: { value: 1850 / 850 }, uZoom: { value: 1 }, uFocus: { value: new THREE.Vector2(0.62, 0.5) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uHover: { value: 0 },
  };
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  })));

  let baseZoom = 1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uAspect.value = w / h;
    // Phones: frame the sign and docks above the text. Larger screens: the whole building.
    const phone = w <= 860;
    baseZoom = phone ? 1.2 : 1;
    uniforms.uFocus.value.set(phone ? 0.83 : 0.62, phone ? 0 : 0.5);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const target = { x: 0.5, y: 0.5, hover: 0 };
  const hero = canvas.closest('[data-hero]');
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = 1 - (e.clientY - r.top) / r.height;
    target.hover = 1;
  });
  hero.addEventListener('pointerleave', () => { target.hover = 0; });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  gsap.ticker.add((time) => {
    if (!visible || document.hidden) return;
    uniforms.uTime.value = time;
    uniforms.uZoom.value = baseZoom + 0.04 * (0.5 - 0.5 * Math.cos(time * 0.13));
    uniforms.uMouse.value.x += (target.x - uniforms.uMouse.value.x) * 0.08;
    uniforms.uMouse.value.y += (target.y - uniforms.uMouse.value.y) * 0.08;
    uniforms.uHover.value += (target.hover - uniforms.uHover.value) * 0.05;
    renderer.render(scene, camera);
  });
  gsap.to(uniforms.uReveal, { value: 1, duration: 2, ease: 'power2.inOut' });
}
