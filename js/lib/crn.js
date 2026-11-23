// Rede aleatória contínua 2D de triângulos AO₃ (projeção plana à la Zachariasen).
// A–O = 1; O–A–O = 120° mantido por molas rígidas; o ângulo A–O–A fica livre.
import { Delaunay } from '../../vendor/d3-delaunay.js';
import { mulberry32 } from './md-engine.js';

export const D_AA = 2 * Math.sin((75 * Math.PI) / 180); // ~1,93 (ponte de 150°)

function spring(p, q, L, k) {
  const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1e-9;
  const f = ((d - L) / d) * 0.5 * k;
  p[0] += dx * f; p[1] += dy * f; q[0] -= dx * f; q[1] -= dy * f;
}

// gera a rede num retângulo [0,W]×[0,H] com margem
export function buildCRN({ W = 16, H = 10, seed = 4, margin = 2.2, iters = 320 } = {}) {
  const rand = mulberry32(seed);
  const a = D_AA * Math.sqrt(3);
  const gens = [];
  const nx = Math.ceil((W + 2 * margin) / a) + 2, ny = Math.ceil((H + 2 * margin) / (a * 0.866)) + 2;
  for (let j = -1; j < ny; j++) for (let i = -1; i < nx; i++) {
    const x = -margin + (i + (j & 1 ? 0.5 : 0)) * a, y = -margin + j * a * 0.866;
    const ang = rand() * 6.283, m = (0.3 + 0.2 * rand()) * a;
    gens.push(x + Math.cos(ang) * m, y + Math.sin(ang) * m);
  }
  const del = new Delaunay(Float64Array.from(gens));
  const cc = del.voronoi([-50, -50, W + 50, H + 50]).circumcenters;
  const nT = cc.length / 2;
  const inside = (x, y, mg) => x > -mg && y > -mg && x < W + mg && y < H + mg;
  const A = [], map = new Map();
  for (let t = 0; t < nT; t++) {
    const x = cc[2 * t], y = cc[2 * t + 1];
    if (inside(x, y, margin)) map.set(t, A.push([x, y]) - 1);
  }
  const edges = [];
  const he = del.halfedges;
  for (let e = 0; e < he.length; e++) {
    const o = he[e]; if (o < e) continue;
    const t1 = Math.floor(e / 3), t2 = Math.floor(o / 3);
    if (map.has(t1) && map.has(t2)) edges.push([map.get(t1), map.get(t2)]);
  }
  // anéis (células de Voronoi completas)
  const inc = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const g = del.triangles[3 * t + k];
    (inc.get(g) || inc.set(g, []).get(g)).push(t);
  }
  const rings = [];
  for (const [g, ts] of inc) {
    if (!ts.every((t) => map.has(t))) continue;
    rings.push({ g: [gens[2 * g], gens[2 * g + 1]], atoms: ts.map((t) => map.get(t)) });
  }
  // oxigênios
  const O = [], bonds = [], tri = A.map(() => []);
  for (const [p, q] of edges) {
    const mx = (A[p][0] + A[q][0]) / 2, my = (A[p][1] + A[q][1]) / 2;
    const dx = A[q][0] - A[p][0], dy = A[q][1] - A[p][1], d = Math.hypot(dx, dy) || 1;
    const h = Math.sqrt(Math.max(0, 1 - (d / 2) ** 2)) * (rand() < 0.5 ? 1 : -1);
    const o = O.push([mx - (dy / d) * h, my + (dx / d) * h]) - 1;
    bonds.push([p, o], [q, o]); tri[p].push(o); tri[q].push(o);
  }
  // relaxação: triângulos rígidos
  const nA = A.length, pts = [...A, ...O];
  const oo = [];
  tri.forEach((os) => { for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) oo.push([os[i], os[j]]); });
  for (let it = 0; it < iters; it++) {
    for (const [a2, o] of bonds) spring(pts[a2], pts[nA + o], 1, 0.5);
    for (const [o1, o2] of oo) spring(pts[nA + o1], pts[nA + o2], Math.sqrt(3), 0.5);
    if (it % 5 === 0) {
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const min = i < nA && j < nA ? D_AA * 0.85 : i >= nA && j >= nA ? 1.35 : 0.9;
        const dx = pts[j][0] - pts[i][0];
        if (dx > min || dx < -min) continue;
        const dy = pts[j][1] - pts[i][1], d = Math.hypot(dx, dy);
        if (d < min && d > 1e-6) { const f = ((min - d) / d) * 0.25; pts[i][0] -= dx * f; pts[i][1] -= dy * f; pts[j][0] += dx * f; pts[j][1] += dy * f; }
      }
    }
  }
  // pontes = oxigênios ligados a dois A
  const oA = O.map(() => []);
  bonds.forEach(([a2, o]) => oA[o].push(a2));
  const bridges = [];
  O.forEach((p, o) => { if (oA[o].length === 2) bridges.push({ o, a: oA[o][0], b: oA[o][1] }); });
  rings.forEach((r) => {
    const c = r.atoms.reduce((s, k) => [s[0] + A[k][0], s[1] + A[k][1]], [0, 0]);
    r.c = [c[0] / r.atoms.length, c[1] / r.atoms.length];
  });
  return { A, O, bonds, tri, oA, bridges, rings, W, H };
}
