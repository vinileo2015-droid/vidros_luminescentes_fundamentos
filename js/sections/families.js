// Visualizador 3D das quatro famílias de vidro (modelos esquemáticos gerados proceduralmente).
import * as THREE from '../../vendor/three.module.js';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { Delaunay } from '../../vendor/d3-delaunay.js';
import { mulberry32, gauss } from '../lib/md-engine.js';
import { reducedMotion, visibility, onTheme } from '../lib/ui.js';

const EL = {
  Si: { c: '#d8c69a', r: 0.42, n: 'Si' }, O: { c: '#e2483d', r: 0.55, n: 'O (ponte)' }, Onb: { c: '#ff9f8c', r: 0.55, n: 'O não ponteante' }, Na: { c: '#8b6fe6', r: 0.75, n: 'Na⁺' },
  Zr: { c: '#4fb6c9', r: 0.62, n: 'Zr' }, Cu: { c: '#d9844a', r: 0.5, n: 'Cu' }, Al: { c: '#b9c2cc', r: 0.56, n: 'Al' }, Ni: { c: '#7fae6a', r: 0.49, n: 'Ni' },
  F: { c: '#b6e05a', r: 0.5, n: 'F' }, Ba: { c: '#2f9e6b', r: 0.95, n: 'Ba²⁺' }, La: { c: '#e8b84a', r: 0.82, n: 'La³⁺' },
  As: { c: '#a678d8', r: 0.55, n: 'As' }, Se: { c: '#f0a030', r: 0.6, n: 'Se' },
};

const FAMS = [
  {
    id: 'oxide', tab: 'Óxidos', title: 'Vidro de óxido', formula: 'Ex.: Na₂O·3SiO₂ (silicato de sódio)', build: buildOxide, els: ['Si', 'O', 'Onb', 'Na'],
    text: 'Rede de tetraedros SiO₄ unidos pelos vértices. Cada Na₂O quebra uma ponte Si–O–Si e cria dois oxigênios não ponteantes, com os íons Na⁺ alojados nos vazios.',
    kv: [['Ligação', 'Iono-covalente'], ['Tg típica', '~550 °C (sodo-cálcico); ~1200 °C (sílica)'], ['Transparência', '~0,2–4 µm'], ['Fônon máx.', '~1000–1400 cm⁻¹'], ['Mecânica', 'Duro, frágil'], ['Usos', 'Janelas, embalagens, fibras ópticas, telas']],
  },
  {
    id: 'metal', tab: 'Metálicos', title: 'Vidro metálico', formula: 'Ex.: Zr–Cu–Ni–Al (família dos vidros metálicos massivos)', build: buildMetal, els: ['Zr', 'Cu', 'Ni', 'Al'],
    text: 'Empacotamento denso e aleatório de átomos de tamanhos diferentes, sem rede de ligações direcionais. A desordem de tamanhos frustra a cristalização.',
    kv: [['Ligação', 'Metálica'], ['Tg típica', '~300–700 K'], ['Transparência', 'Opaco'], ['Resistência', 'Escoamento ~2 GPa, deformação elástica ~2%'], ['Elétrica', 'Condutor; Fe/Co: magneticamente mole'], ['Usos', 'Núcleos de transformadores, molas, peças de precisão']],
  },
  {
    id: 'halide', tab: 'Haletos', title: 'Vidro de fluoreto (haleto)', formula: 'Ex.: ZBLAN, ZrF₄–BaF₂–LaF₃–AlF₃–NaF', build: buildHalide, els: ['Zr', 'F', 'Ba', 'La'],
    text: 'Poliedros ZrFₙ (n = 6 a 8) ligados por flúor em ponte, com cátions grandes (Ba²⁺, La³⁺) nos vazios. Ligação iônica e coordenação alta, fora das regras de Zachariasen.',
    kv: [['Ligação', 'Iônica'], ['Tg típica', '~260–300 °C'], ['Transparência', '~0,22–7 µm'], ['Fônon máx.', '~550–600 cm⁻¹'], ['Fraqueza', 'Sensível à umidade'], ['Usos', 'Lasers de fibra no IV médio, upconversion']],
  },
  {
    id: 'chalc', tab: 'Calcogenetos', title: 'Vidro calcogeneto', formula: 'Ex.: As₂Se₃', build: buildChalc, els: ['As', 'Se'],
    text: 'Camadas onduladas de pirâmides AsSe₃ (As com 3 vizinhos, Se com 2), empilhadas e unidas por forças fracas entre camadas. Átomos pesados e ligações fracas resultam em fônons de baixa energia.',
    kv: [['Ligação', 'Covalente, coordenação baixa'], ['Tg típica', '~150–400 °C (As₂Se₃ ≈ 180 °C)'], ['Transparência', '~1–15 µm (selenetos)'], ['Fônon máx.', '~250–450 cm⁻¹'], ['Óptica', 'n ≈ 2,2–3,5; alta não linearidade'], ['Usos', 'Lentes térmicas, fibras IV, memórias de mudança de fase']],
  },
];

// ---------- geradores ----------
function buildOxide(rand) {
  const a = 7.16, atoms = [], bonds = [];
  const basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
  const si = [];
  const n = 3;
  for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) for (let k = -n; k < n; k++) for (const b of basis) for (const o of [[0, 0, 0], [0.25, 0.25, 0.25]]) {
    const p = new THREE.Vector3((i + b[0] + o[0]) * a, (j + b[1] + o[1]) * a, (k + b[2] + o[2]) * a);
    if (p.length() < 9.5) si.push(p.add(new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).multiplyScalar(0.35)));
  }
  si.forEach((p) => atoms.push({ p, el: 'Si' }));
  const dnn = a * Math.sqrt(3) / 4;
  for (let i = 0; i < si.length; i++) for (let j = i + 1; j < si.length; j++) {
    const d = si[i].distanceTo(si[j]);
    if (d > dnn * 1.35) continue;
    const mid = si[i].clone().add(si[j]).multiplyScalar(0.5);
    const dir = si[j].clone().sub(si[i]).normalize();
    if (rand() < 0.14) {
      // quebra de ponte: dois O não ponteantes + 2 Na⁺
      const o1 = si[i].clone().addScaledVector(dir, 1.6), o2 = si[j].clone().addScaledVector(dir, -1.6);
      const io1 = atoms.push({ p: o1, el: 'Onb' }) - 1, io2 = atoms.push({ p: o2, el: 'Onb' }) - 1;
      bonds.push([i, io1], [j, io2]);
      const perp = new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).cross(dir).normalize();
      atoms.push({ p: mid.clone().addScaledVector(perp, 1.4), el: 'Na' }, { p: mid.clone().addScaledVector(perp, -1.4), el: 'Na' });
    } else {
      const perp = new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).cross(dir).normalize();
      const o = mid.addScaledVector(perp, 0.5);
      const io = atoms.push({ p: o, el: 'O' }) - 1;
      bonds.push([i, io], [j, io]);
    }
  }
  return { atoms, bonds, scale: 0.85 };
}

function buildMetal(rand) {
  const R = 9.5, kinds = [['Zr', 1.6, 0.5], ['Cu', 1.28, 0.3], ['Ni', 1.25, 0.1], ['Al', 1.43, 0.1]];
  const pick = () => { let u = rand(); for (const k of kinds) { if ((u -= k[2]) <= 0) return k; } return kinds[0]; };
  const atoms = [];
  let tries = 0;
  while (atoms.length < 520 && tries++ < 40000) {
    const [el, r] = pick();
    const p = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).multiplyScalar(R);
    if (p.length() > R) continue;
    atoms.push({ p, el, r: r * 0.92 });
  }
  // relaxação: remove sobreposições e comprime levemente
  for (let it = 0; it < 70; it++) {
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
      const A = atoms[i], B = atoms[j];
      const d = A.p.distanceTo(B.p), m = A.r + B.r;
      if (d < m && d > 1e-6) {
        const push = B.p.clone().sub(A.p).multiplyScalar(((m - d) / d) * 0.5);
        A.p.sub(push); B.p.add(push);
      }
    }
    for (const A of atoms) { A.p.multiplyScalar(0.995); if (A.p.length() > R) A.p.setLength(R); }
  }
  return { atoms, bonds: [], scale: 1.0, sizeFromR: true };
}

function buildHalide(rand) {
  const s = 4.2, n = 2, atoms = [], bonds = [], zr = {};
  const key = (i, j, k) => `${i},${j},${k}`;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) {
    if (i * i + j * j + k * k > 6) continue;
    const p = new THREE.Vector3(i * s, j * s, k * s).add(new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).multiplyScalar(0.45));
    zr[key(i, j, k)] = atoms.push({ p, el: 'Zr' }) - 1;
  }
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const kk in zr) {
    const [i, j, k] = kk.split(',').map(Number), a = zr[kk];
    for (const [dx, dy, dz] of dirs) {
      const nb = zr[key(i + dx, j + dy, k + dz)];
      if (nb !== undefined && nb < a) continue;
      if (nb !== undefined && rand() < 0.8) {
        const mid = atoms[a].p.clone().add(atoms[nb].p).multiplyScalar(0.5).add(new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).multiplyScalar(0.25));
        const f = atoms.push({ p: mid, el: 'F' }) - 1;
        bonds.push([a, f], [nb, f]);
      } else {
        const p = atoms[a].p.clone().add(new THREE.Vector3(dx, dy, dz).multiplyScalar(2.0)).add(new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).multiplyScalar(0.3));
        const f = atoms.push({ p, el: 'F' }) - 1;
        bonds.push([a, f]);
      }
    }
    // flúor extra: coordenação 7
    const extra = new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).normalize().multiplyScalar(2.05);
    const f = atoms.push({ p: atoms[a].p.clone().add(extra), el: 'F' }) - 1;
    bonds.push([a, f]);
  }
  // cátions grandes nos centros dos cubos
  for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) for (let k = -n; k < n; k++) {
    const p = new THREE.Vector3((i + 0.5) * s, (j + 0.5) * s, (k + 0.5) * s);
    if (p.length() > 8 || rand() < 0.35) continue;
    atoms.push({ p: p.add(new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).multiplyScalar(0.4)), el: rand() < 0.2 ? 'La' : 'Ba' });
  }
  return { atoms, bonds, scale: 0.9 };
}

function buildChalc(rand) {
  const a = 6.06, atoms = [], bonds = [];
  for (let layer = -1; layer <= 1; layer++) {
    const pts = [];
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {
      pts.push((i + (j % 2 ? 0.5 : 0)) * a + gauss(rand) * 0.22 * a, j * a * 0.866 + gauss(rand) * 0.22 * a);
    }
    const del = new Delaunay(Float64Array.from(pts));
    const cc = del.voronoi([-40, -40, 40, 40]).circumcenters;
    const idx = new Map();
    const z0 = layer * 4.2;
    const ntri = cc.length / 2;
    const ok = (t) => Math.hypot(cc[2 * t], cc[2 * t + 1]) < 10.5;
    for (let t = 0; t < ntri; t++) {
      if (!ok(t)) continue;
      const pz = z0 + (t % 2 ? 0.45 : -0.45) + gauss(rand) * 0.15;
      idx.set(t, atoms.push({ p: new THREE.Vector3(cc[2 * t], pz, cc[2 * t + 1]), el: 'As' }) - 1);
    }
    const he = del.halfedges;
    for (let e = 0; e < he.length; e++) {
      const o = he[e]; if (o < e) continue;
      const t1 = Math.floor(e / 3), t2 = Math.floor(o / 3);
      if (!idx.has(t1) || !idx.has(t2)) continue;
      const A = atoms[idx.get(t1)].p, B = atoms[idx.get(t2)].p;
      const m = A.clone().add(B).multiplyScalar(0.5); m.y += (rand() < 0.5 ? 0.6 : -0.6);
      const se = atoms.push({ p: m, el: 'Se' }) - 1;
      bonds.push([idx.get(t1), se], [idx.get(t2), se]);
    }
  }
  return { atoms, bonds, scale: 0.85 };
}

// ---------- cena ----------
export function init(root) {
  const host = root.querySelector('#fam-3d');
  const tabs = root.querySelector('#fam-tabs');
  const card = root.querySelector('#fam-card');
  const key = root.querySelector('#fam-key');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Modelo 3D da estrutura do vidro selecionado');
  renderer.domElement.setAttribute('role', 'img');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  camera.position.set(15, 8.5, 18);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 12; controls.maxDistance = 60;
  controls.autoRotate = !reducedMotion(); controls.autoRotateSpeed = 1.0;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(10, 20, 14); scene.add(dl);

  let group = null;
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const cyl = new THREE.CylinderGeometry(0.12, 0.12, 1, 8, 1);
  const bondMat = new THREE.MeshStandardMaterial({ color: 0x9aa7a3, roughness: 0.6 });
  const cache = {};

  function show(i) {
    const f = FAMS[i];
    [...tabs.children].forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.setAttribute('aria-pressed', String(i === j)); });
    if (group) { scene.remove(group); }
    if (!cache[f.id]) {
      const data = f.build(mulberry32(17 + i));
      const g = new THREE.Group();
      const byEl = {};
      data.atoms.forEach((a, k) => (byEl[a.el] ||= []).push(k));
      for (const el in byEl) {
        const list = byEl[el];
        const mesh = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: EL[el].c, roughness: 0.35, metalness: f.id === 'metal' ? 0.55 : 0.05 }), list.length);
        const m = new THREE.Matrix4();
        list.forEach((k, n) => {
          const a = data.atoms[k];
          const r = data.sizeFromR ? a.r * 0.97 : EL[el].r * data.scale;
          m.makeScale(r, r, r).setPosition(a.p); mesh.setMatrixAt(n, m);
        });
        g.add(mesh);
      }
      if (data.bonds.length) {
        const bm = new THREE.InstancedMesh(cyl, bondMat, data.bonds.length);
        const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4();
        data.bonds.forEach(([a, b], n) => {
          const A = data.atoms[a].p, B = data.atoms[b].p, d = B.clone().sub(A), len = d.length();
          q.setFromUnitVectors(up, d.normalize());
          m.compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1));
          bm.setMatrixAt(n, m);
        });
        g.add(bm);
      }
      g.userData.radius = Math.max(...data.atoms.map((a) => a.p.length())) + 1;
      cache[f.id] = g;
    }
    group = cache[f.id];
    scene.add(group);
    // enquadra o aglomerado inteiro
    const dist = group.userData.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.92;
    camera.position.setLength(dist);
    controls.minDistance = dist * 0.45; controls.maxDistance = dist * 2;
    key.innerHTML = f.els.map((e) => `<span><i style="background:${EL[e].c}"></i>${EL[e].n}</span>`).join('');
    card.innerHTML = `<h5>${f.title}</h5><div class="formula">${f.formula}</div><p>${f.text}</p>
      <div class="kv">${f.kv.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>`;
    if (!running) renderer.render(scene, camera);
  }

  tabs.setAttribute('role', 'tablist');
  tabs.innerHTML = FAMS.map((f, i) => `<button type="button" role="tab" data-i="${i}">${f.tab}</button>`).join('');
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(Number(b.dataset.i)); });

  function resize() {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab';
    camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();
  let running = false, visible = false;
  function loop() {
    if (!visible) { running = false; return; }
    controls.update(); renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  visibility(host, (v) => { visible = v; if (v && !running) { running = true; requestAnimationFrame(loop); } }, '0px');
  onTheme(() => renderer.render(scene, camera));
  show(0);
}
