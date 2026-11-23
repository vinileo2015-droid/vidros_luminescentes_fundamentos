// Hero: gota de vidro sodo-cálcico em 3D que esfria do forno até a temperatura ambiente.
// A forma da gota relaxa com taxa proporcional à fluidez (1/η): abaixo de Tg ela congela.
import * as THREE from '../../vendor/three.module.js';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { RoomEnvironment } from '../../vendor/RoomEnvironment.js';
import { reducedMotion, visibility, sup } from '../lib/ui.js';

import { logEtaSLS as logEta } from '../lib/visc.js';
const TG = 823;        // K (≈ 550 °C)
const TLIQ = 1273;     // K, liquidus aproximada (~1000 °C)

// cor de corpo negro aproximada (Tanner Helland), T em K
function blackbody(TK) {
  const t = TK / 100;
  let r, g, b;
  r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
  g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  const c = (v) => Math.max(0, Math.min(255, v)) / 255;
  return new THREE.Color(c(r), c(g), c(b));
}

export function init() {
  const canvas = document.getElementById('hero-canvas');
  const stage = document.getElementById('hero-stage');
  const slider = document.getElementById('hero-slider');
  const tempEl = document.getElementById('hero-temp');
  const stateEl = document.getElementById('hero-state');
  const hintEl = document.getElementById('hero-hint');
  const hero = document.querySelector('.hero');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.25, 6.2);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, -0.45, 0);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.autoRotate = !reducedMotion(); controls.autoRotateSpeed = 0.6;

  // gota
  const geo = new THREE.SphereGeometry(1, 160, 120);
  const base = geo.attributes.position.array.slice();
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6f6ef'), metalness: 0, roughness: 0.04,
    transmission: 1, thickness: 1.6, ior: 1.52,
    attenuationColor: new THREE.Color('#56b89a'), attenuationDistance: 3.5,
    clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1,
    emissive: new THREE.Color('#000000'),
  });
  const blob = new THREE.Mesh(geo, mat);
  scene.add(blob);

  // "átomos" ao fundo: dão algo para a gota refratar
  const N = 170;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: new THREE.Color('#ff7a3d'), emissiveIntensity: 1 }), N);
  const tmp = new THREE.Object3D();
  const seeds = [];
  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    const r = 2.2 + Math.random() * 1.6;
    seeds.push({ p: new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.75, r * Math.sin(ph) * Math.sin(th) - 0.6), ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.9 });
  }
  scene.add(dots);
  const dotColorHot = new THREE.Color('#ff8a4c');
  const dotColorCold = new THREE.Color('#5fd0c8');

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5); scene.add(key);
  const glow = new THREE.PointLight(0xff6a1a, 0, 8); glow.position.set(0, 0, 0); scene.add(glow);

  // estado físico
  let Tc = Number(slider.value); // °C
  let phase = 0;                  // fase da oscilação (avança ∝ fluidez)
  let sag = 0.18, squash = 0;     // deformação atual (relaxa ∝ fluidez)
  let visible = true;

  function fluidity(TK) { return Math.min(1, Math.pow(10, -(logEta(TK) - 1) / 3)); }

  function updateUI() {
    const TK = Tc + 273.15;
    const le = logEta(TK);
    tempEl.textContent = `${Math.round(Tc)} °C`;
    let st;
    if (TK > TLIQ) { st = 'Líquido'; stateEl.style.color = '#ffb08a'; }
    else if (TK > TG) { st = 'Líquido super-resfriado'; stateEl.style.color = '#f2c46b'; }
    else { st = 'Vidro'; stateEl.style.color = '#7fe0dc'; }
    stateEl.textContent = st;
    const leR = Math.round(le);
    hintEl.textContent = TK > TG
      ? `Viscosidade de equilíbrio ≈ 10${sup(leR)} Pa·s. ${TK > TLIQ ? 'Acima da liquidus (~1000 °C).' : 'Abaixo da liquidus, mas ainda sem cristais.'}`
      : `Abaixo de Tg (~550 °C): a forma ficou congelada. τ ≫ tempo de observação.`;
    hero.classList.toggle('cooled', TK < TG);
  }

  function shape(dt) {
    const TK = Tc + 273.15;
    const f = fluidity(TK);
    phase += dt * 2.2 * f;
    // alvo: líquido quente pende pela gravidade; a deformação relaxa só se houver fluidez
    const targetSag = 0.22 * Math.min(1, f * 1.5);
    const k = 1 - Math.exp(-dt * 3 * f);
    sag += (targetSag - sag) * k;
    squash += (0.06 * Math.sin(phase * 1.3) * f - squash) * k;
    const amp = 0.07 * f;
    const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i], y = base[i + 1], z = base[i + 2];
      const w = Math.sin(3.1 * x + phase * 1.7) * Math.cos(2.7 * z - phase * 1.3) + 0.6 * Math.sin(4.3 * y + phase * 2.3 + x * 2.0);
      let r = 1 + amp * w * 0.5 + 0.035 * Math.sin(5 * x + 3 * z + 1.3); // a última parcela: irregularidade "congelada"
      // pingo: alongamento para baixo
      const down = Math.max(0, -y);
      const yy = y * (1 + squash) - sag * down * down * 1.2;
      const xz = 1 - squash * 0.5 - sag * 0.25 * down;
      pos[i] = x * r * xz; pos[i + 1] = yy * r; pos[i + 2] = z * r * xz;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    // aparência: incandescência acima de ~550 °C (ponto de Draper ≈ 525 °C)
    const hot = Math.max(0, Math.min(1, (TK - 790) / 900));
    const col = blackbody(Math.max(1000, TK));
    mat.emissive.copy(col);
    mat.emissiveIntensity = Math.pow(hot, 1.2) * 1.6;
    mat.transmission = 1 - 0.35 * Math.pow(hot, 0.8);
    mat.attenuationColor.set('#56b89a').lerp(new THREE.Color('#ff7a3d'), hot);
    mat.color.set('#e6f6ef').lerp(new THREE.Color('#5a2008'), Math.min(1, hot * 1.3));
    mat.clearcoat = 1 - 0.6 * hot;
    glow.intensity = hot * 6;
    glow.color.copy(col);
    dots.material.emissive.copy(dotColorCold).lerp(dotColorHot, Math.min(1, hot * 1.4));
    dots.material.color.copy(dots.material.emissive);
    dots.material.emissiveIntensity = 0.4 + hot * 0.8;
    const jig = 0.12 * f;
    seeds.forEach((s, i) => {
      s.ph += dt * s.s * (0.3 + 2.5 * f);
      tmp.position.set(s.p.x + Math.sin(s.ph) * jig, s.p.y + Math.cos(s.ph * 1.3) * jig, s.p.z);
      tmp.updateMatrix(); dots.setMatrixAt(i, tmp.matrix);
    });
    dots.instanceMatrix.needsUpdate = true;
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < 0.9 ? 40 : 32;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (intro) {
      intro.t += dt;
      const u = Math.min(1, Math.max(0, (intro.t - 1.0) / 6));
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      Tc = 1400 + (25 - 1400) * e;
      slider.value = Tc;
      updateUI();
      if (u >= 1) intro = null;
    }
    shape(dt);
    controls.update();
    renderer.render(scene, camera);
    if (visible) requestAnimationFrame(frame);
  }

  let intro = reducedMotion() ? null : { t: 0 };
  if (!intro) {
    // sem animação: mostra a gota já resfriada, com a forma congelada do líquido
    Tc = 1400; for (let i = 0; i < 60; i++) shape(0.05);
    Tc = 25; slider.value = 25;
  }
  slider.addEventListener('input', () => { intro = null; Tc = Number(slider.value); updateUI(); });
  updateUI();

  visibility(stage, (v) => {
    const was = visible; visible = v;
    if (v && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }, '0px');
  requestAnimationFrame(frame);
}
