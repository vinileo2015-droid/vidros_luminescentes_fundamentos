// Esquema de Zachariasen (1932): A₂O₃ hipotético em 2D, cristal × vidro.
// Os triângulos AO₃ são idênticos nos dois (A–O fixo, O–A–O = 120°);
// o que muda é o ângulo da ponte A–O–A e, com ele, o tamanho dos anéis.
import { Delaunay } from '../../vendor/d3-delaunay.js';
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';
import { mulberry32 } from '../lib/md-engine.js';

const R_AO = 1;                         // comprimento A–O
const BRIDGE = 150;                     // ângulo A–O–A no cristal (graus)
const D_AA = 2 * Math.sin((BRIDGE / 2) * Math.PI / 180); // distância A–A no cristal
const WIN = 6.2;                        // raio da janela desenhada (em unidades de A–O)
const BUILD = WIN + 5;                  // a rede é maior que a janela, para a estatística de ângulos
const RING_VAR = { 4: 'cryst', 5: 'scl', 7: 'glass', 8: 'cryst', 9: 'cryst' };

// ---------- construção ----------
function placeO(A, B, side) {
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1;
  const h = Math.sqrt(Math.max(0, R_AO * R_AO - (d / 2) ** 2));
  return [mx - (dy / d) * h * side, my + (dx / d) * h * side];
}

function crystal() {
  // favo de mel: A nos vértices; O deslocado do meio da aresta sempre para o mesmo lado
  const s3 = Math.sqrt(3), d = D_AA;
  const A = [], idx = new Map(), edges = [];
  const n = 10;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (const b of [0, 1]) {
    const x = s3 * d * i + (s3 * d / 2) * j, y = 1.5 * d * j + (b ? d : 0);
    if (Math.hypot(x, y) > BUILD) continue;
    idx.set(`${i},${j},${b}`, A.push([x, y]) - 1);
  }
  for (const [k, a] of idx) {
    const [i, j, b] = k.split(',').map(Number);
    if (b !== 0) continue;
    for (const [di, dj] of [[0, 0], [0, -1], [1, -1]]) {
      const q = idx.get(`${i + di},${j + dj},1`);
      if (q !== undefined) edges.push([a, q]);
    }
  }
  // anéis: hexágonos em torno dos centros da rede triangular dual
  const rings = [];
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const cx = s3 * d * i + (s3 * d / 2) * j + s3 * d / 2, cy = 1.5 * d * j + d / 2;
    const ring = [];
    A.forEach((p, k) => { if (Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - d) < 1e-6) ring.push(k); });
    if (ring.length === 6) rings.push(sortAround(ring, A, [cx, cy]));
  }
  return finish(A, edges, rings, () => 1);
}

function glass(seed) {
  const rand = mulberry32(seed);
  const a = D_AA * Math.sqrt(3); // espaçamento dos geradores → aresta de Voronoi ≈ D_AA
  const gens = [];
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) {
    const x = (i + (j & 1 ? 0.5 : 0)) * a, y = j * a * Math.sqrt(3) / 2;
    const ang = rand() * Math.PI * 2, m = (0.3 + 0.2 * rand()) * a;
    gens.push(x + Math.cos(ang) * m, y + Math.sin(ang) * m);
  }
  const del = new Delaunay(Float64Array.from(gens));
  const cc = del.voronoi([-60, -60, 60, 60]).circumcenters;
  const nT = cc.length / 2;
  const A = [], map = new Map();
  for (let t = 0; t < nT; t++) {
    const x = cc[2 * t], y = cc[2 * t + 1];
    if (Math.hypot(x, y) < BUILD) map.set(t, A.push([x, y]) - 1);
  }
  const edges = [];
  const he = del.halfedges;
  for (let e = 0; e < he.length; e++) {
    const o = he[e]; if (o < e) continue;
    const t1 = Math.floor(e / 3), t2 = Math.floor(o / 3);
    if (map.has(t1) && map.has(t2)) edges.push([map.get(t1), map.get(t2)]);
  }
  // anéis = células de Voronoi cujos vértices estão todos dentro da janela
  const rings = [];
  const inc = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const g = del.triangles[3 * t + k];
    (inc.get(g) || inc.set(g, []).get(g)).push(t);
  }
  for (const [g, ts] of inc) {
    if (!ts.every((t) => map.has(t))) continue;
    const ring = ts.map((t) => map.get(t));
    rings.push(sortAround(ring, A, [gens[2 * g], gens[2 * g + 1]]));
  }
  return finish(A, edges, rings, () => (rand() < 0.5 ? 1 : -1), true);
}

function sortAround(ring, A, c) {
  return ring.sort((p, q) => Math.atan2(A[p][1] - c[1], A[p][0] - c[0]) - Math.atan2(A[q][1] - c[1], A[q][0] - c[0]));
}

// coloca os oxigênios e, no vidro, relaxa triângulos rígidos (A–O = 1, O–O = √3)
function finish(A, edges, rings, sideFn, relax = false) {
  const O = [], bonds = [], tri = A.map(() => []);
  for (const [p, q] of edges) {
    const o = O.push(placeO(A[p], A[q], sideFn())) - 1;
    bonds.push([p, o], [q, o]);
    tri[p].push(o); tri[q].push(o);
  }
  if (relax) {
    const oo = [];
    tri.forEach((os) => { for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) oo.push([os[i], os[j]]); });
    const pts = [...A, ...O];
    const nA = A.length;
    const nodeO = (o) => nA + o;
    for (let it = 0; it < 400; it++) {
      const k = 0.5;
      for (const [a, o] of bonds) spring(pts[a], pts[nodeO(o)], R_AO, k);
      for (const [o1, o2] of oo) spring(pts[nodeO(o1)], pts[nodeO(o2)], R_AO * Math.sqrt(3), k);
      if (it % 4 === 0) {
        // repulsão entre átomos não ligados
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
          const min = i < nA && j < nA ? D_AA * 0.85 : i >= nA && j >= nA ? 1.35 : 0.9;
          const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1], d = Math.hypot(dx, dy);
          if (d < min && d > 1e-6) { const f = ((min - d) / d) * 0.25; pts[i][0] -= dx * f; pts[i][1] -= dy * f; pts[j][0] += dx * f; pts[j][1] += dy * f; }
        }
      }
    }
  }
  // ângulos
  const angAOA = [], angOAO = [];
  const ang = (c, p, q) => {
    const a1 = Math.atan2(p[1] - c[1], p[0] - c[0]), a2 = Math.atan2(q[1] - c[1], q[0] - c[0]);
    let d = Math.abs(a1 - a2) * 180 / Math.PI; if (d > 180) d = 360 - d; return d;
  };
  const oA = O.map(() => []);
  bonds.forEach(([a, o]) => oA[o].push(a));
  const bridge = O.map((p, o) => (oA[o].length === 2 ? ang(p, A[oA[o][0]], A[oA[o][1]]) : null));
  tri.forEach((os, a) => {
    if (os.length !== 3 || Math.hypot(...A[a]) > BUILD - 1.5) return;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) angOAO.push(ang(A[a], O[os[i]], O[os[j]]));
  });
  // A–O–A só para pontes dentro da janela
  O.forEach((p, o) => { if (bridge[o] !== null && Math.hypot(...p) < BUILD - 1.5) angAOA.push(bridge[o]); });
  return { A, O, bonds, tri, rings, oA, bridge, angAOA, angOAO };
}

function spring(p, q, L, k) {
  const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1e-9;
  const f = ((d - L) / d) * 0.5 * k;
  p[0] += dx * f; p[1] += dy * f; q[0] -= dx * f; q[1] -= dy * f;
}

// ---------- desenho ----------
export function init(root) {
  const cvC = root.querySelector('#zach-cryst'), cvG = root.querySelector('#zach-glass');
  const hOAO = root.querySelector('#zach-h1'), hAOA = root.querySelector('#zach-h2');
  const outC = root.querySelector('#zach-cryst-v'), outG = root.querySelector('#zach-glass-v');
  const ringsBox = root.querySelector('#zach-rings');
  let seed = 3;
  const C = crystal();
  let G = glass(seed);
  const hover = { c: null, g: null };

  const vc = hiDPI(cvC, () => draw(vc, C, 'cryst', hover.c));
  const vg = hiDPI(cvG, () => draw(vg, G, 'glass', hover.g));
  const v1 = hiDPI(hOAO, () => hist(v1, 'OAO'));
  const v2 = hiDPI(hAOA, () => hist(v2, 'AOA'));

  function geom(v) {
    const s = Math.min(v.w, v.h) / (2 * WIN + 0.6);
    return { s, X: (x) => v.w / 2 + x * s, Y: (y) => v.h / 2 - y * s };
  }

  function draw(v, M, kind, hov) {
    const { ctx, w, h } = v; const pal = palette();
    const { s, X, Y } = geom(v);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, WIN * s + 0.5 * s, 0, 6.283); ctx.clip();
    // anéis
    if (ringsBox.checked) {
      for (const ring of M.rings) {
        const n = ring.length, key = RING_VAR[Math.min(9, Math.max(4, n))];
        if (!key) continue;
        ctx.beginPath(); ring.forEach((a, i) => (i ? ctx.lineTo(X(M.A[a][0]), Y(M.A[a][1])) : ctx.moveTo(X(M.A[a][0]), Y(M.A[a][1])))); ctx.closePath();
        ctx.fillStyle = alpha(pal[key], 0.2); ctx.fill();
      }
    }
    // triângulos AO₃
    const col = kind === 'cryst' ? pal.cryst : pal.glass;
    M.tri.forEach((os) => {
      if (os.length !== 3) return;
      ctx.beginPath(); os.forEach((o, i) => (i ? ctx.lineTo(X(M.O[o][0]), Y(M.O[o][1])) : ctx.moveTo(X(M.O[o][0]), Y(M.O[o][1])))); ctx.closePath();
      ctx.fillStyle = alpha(col, 0.16); ctx.fill();
      ctx.strokeStyle = alpha(col, 0.35); ctx.lineWidth = 1; ctx.stroke();
    });
    // ligações A–O
    ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(1.2, s * 0.07);
    ctx.beginPath();
    for (const [a, o] of M.bonds) { ctx.moveTo(X(M.A[a][0]), Y(M.A[a][1])); ctx.lineTo(X(M.O[o][0]), Y(M.O[o][1])); }
    ctx.stroke();
    // O: círculos abertos (como no desenho original); A: pontos cheios
    const rO = s * 0.3;
    for (const p of M.O) {
      ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), rO, 0, 6.283);
      ctx.fillStyle = pal.panel; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.fillStyle = pal.ink;
    for (const p of M.A) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), s * 0.13, 0, 6.283); ctx.fill(); }
    // ponte destacada
    if (hov !== null && M.bridge[hov] !== null) {
      const o = M.O[hov], [a1, a2] = M.oA[hov].map((a) => M.A[a]);
      ctx.strokeStyle = pal.liq; ctx.lineWidth = Math.max(2.5, s * 0.12);
      ctx.beginPath(); ctx.moveTo(X(a1[0]), Y(a1[1])); ctx.lineTo(X(o[0]), Y(o[1])); ctx.lineTo(X(a2[0]), Y(a2[1])); ctx.stroke();
      const t1 = Math.atan2(-(a1[1] - o[1]), a1[0] - o[0]), t2 = Math.atan2(-(a2[1] - o[1]), a2[0] - o[0]);
      let d = t2 - t1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      ctx.beginPath(); ctx.arc(X(o[0]), Y(o[1]), s * 0.55, t1, t1 + d, d < 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(o[0]), Y(o[1]), rO, 0, 6.283); ctx.fillStyle = pal.liq; ctx.fill();
    }
    ctx.restore();
    // borda da janela
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, WIN * s + 0.5 * s, 0, 6.283); ctx.stroke();
  }

  function hist(v, which) {
    const { ctx, w, h } = v; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const l = 12, r = w - 12, t = 30, b = h - 26;
    const lo = which === 'OAO' ? 100 : 90, hi = which === 'OAO' ? 140 : 180, bw = 2;
    const X = (a) => l + ((a - lo) / (hi - lo)) * (r - l);
    const nb = Math.round((hi - lo) / bw);
    const series = [[C, pal.cryst, 'cristal'], [G, pal.glass, 'vidro']];
    const hs = series.map(([M]) => {
      const arr = new Array(nb).fill(0), data = which === 'OAO' ? M.angOAO : M.angAOA;
      data.forEach((a) => { const k = Math.floor((a - lo) / bw); if (k >= 0 && k < nb) arr[k]++; });
      const n = data.length || 1;
      return arr.map((c) => c / n);
    });
    const ymax = Math.max(0.12, ...hs[1]) * 1.1;
    const Y = (f) => b - (Math.min(f, ymax) / ymax) * (b - t);
    hs.forEach((arr, k) => {
      ctx.fillStyle = alpha(series[k][1], k ? 0.55 : 0.85);
      arr.forEach((f, i) => { if (f > 0) { const x0 = X(lo + i * bw); ctx.fillRect(x0 + 0.5, Y(f), X(lo + (i + 1) * bw) - x0 - 1, b - Y(f)); } });
    });
    // marca o cristal mesmo quando ultrapassa a escala
    const ideal = which === 'OAO' ? 120 : BRIDGE;
    ctx.strokeStyle = pal.cryst; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(ideal), t); ctx.lineTo(X(ideal), b); ctx.stroke();
    ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, b); ctx.lineTo(r, b); ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let a = lo; a <= hi; a += 10) ctx.fillText(`${a}°`, X(a), b + 5);
    label(ctx, which === 'OAO' ? 'Ângulo O–A–O (dentro do triângulo)' : 'Ângulo A–O–A (ponte entre triângulos)', l, 10, { color: pal.ink, size: 12 });
    const sd = (arr) => { const m = arr.reduce((x, y) => x + y, 0) / arr.length; return Math.sqrt(arr.reduce((x, y) => x + (y - m) ** 2, 0) / arr.length); };
    const data = which === 'OAO' ? G.angOAO : G.angAOA;
    label(ctx, `vidro: desvio-padrão ${fmt(sd(data), 1)}°`, r, 10, { color: pal.glass, size: 11, align: 'right' });
  }

  function pick(v, M, e) {
    const rect = v.ctx.canvas.getBoundingClientRect();
    const { s, X, Y } = geom(v);
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    let best = null, bd = s * 0.6;
    M.O.forEach((p, o) => { if (M.bridge[o] === null) return; const d = Math.hypot(X(p[0]) - px, Y(p[1]) - py); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  function describe(M, o, out, kind) {
    if (o === null) { out.textContent = kind === 'cryst' ? `Todas as pontes A–O–A medem ${BRIDGE}°.` : 'Passe o mouse ou toque em um oxigênio.'; return; }
    out.textContent = `Esta ponte: A–O–A = ${fmt(M.bridge[o], 0)}°`;
  }
  for (const [cv, v, kind] of [[cvC, vc, 'c'], [cvG, vg, 'g']]) {
    const handler = (e) => {
      const M = kind === 'c' ? C : G;
      const o = pick(v, M, e);
      if (o === hover[kind]) return;
      hover[kind] = o;
      describe(M, o, kind === 'c' ? outC : outG, kind === 'c' ? 'cryst' : 'glass');
      draw(v, M, kind === 'c' ? 'cryst' : 'glass', o);
    };
    cv.addEventListener('pointermove', handler);
    cv.addEventListener('pointerdown', handler);
  }
  root.querySelector('#zach-new').addEventListener('click', () => {
    seed++; G = glass(seed); hover.g = null; describe(G, null, outG, 'glass');
    vg.redraw(); v1.redraw(); v2.redraw();
  });
  ringsBox.addEventListener('change', () => { vc.redraw(); vg.redraw(); });
  describe(C, null, outC, 'cryst'); describe(G, null, outG, 'glass');
}
