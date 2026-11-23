// Rede 2D de Zachariasen: átomos formadores (coordenação 3) nos vértices de Voronoi e
// oxigênios nas arestas. Desordem = deslocamento dos geradores da rede triangular.
// Rede triangular → Voronoi = favo de mel (anéis de 6). Geradores perturbados → anéis de 4 a 9.
import { Delaunay } from '../../vendor/d3-delaunay.js';
import { hiDPI, palette, alpha, visibility, label } from '../lib/ui.js';
import { Clip } from '../lib/clip.js';
import { mulberry32, gauss } from '../lib/md-engine.js';

const RING_COL = { 4: '--cryst', 5: '--scl', 6: null, 7: '--glass', 8: '--cryst', 9: '--cryst' };

export function init(root) {
  const canvas = root.querySelector('#net-canvas');
  const grCanvas = root.querySelector('#net-gr');
  const slider = root.querySelector('#net-dis');
  const out = root.querySelector('#net-dis-v');
  const ringsBox = root.querySelector('#net-rings');
  const oBox = root.querySelector('#net-o');
  const legend = root.querySelector('#net-legend');

  const rand = mulberry32(11);
  const a = 1; // espaçamento dos geradores
  const cols = 22, rows = 22;
  const gens = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = (i + (j % 2) * 0.5) * a, y = j * a * Math.sqrt(3) / 2;
    const ang = rand() * Math.PI * 2, mag = 0.55 + 0.45 * rand();
    gens.push({ x, y, dx: Math.cos(ang) * mag, dy: Math.sin(ang) * mag, ph: rand() * 6.28, w: 0.7 + rand() });
  }
  const cx = ((cols - 1) * a) / 2 + 0.25, cy = ((rows - 1) * a * Math.sqrt(3) / 2) / 2;
  const pts = new Float64Array(gens.length * 2);

  let dis = 0, thermal = 0.03, time = 0;
  let net = null;

  function build() {
    const amp = 0.46 * dis;
    gens.forEach((g, k) => {
      const tx = thermal * Math.sin(g.ph + time * 3 * g.w), ty = thermal * Math.cos(g.ph * 1.7 + time * 2.6 * g.w);
      pts[2 * k] = g.x + g.dx * amp + tx;
      pts[2 * k + 1] = g.y + g.dy * amp + ty;
    });
    const del = new Delaunay(pts);
    const vor = del.voronoi([-5, -5, cols + 5, rows + 5]);
    const cc = vor.circumcenters;
    const edges = [];
    const he = del.halfedges;
    for (let e = 0; e < he.length; e++) {
      const o = he[e];
      if (o < e) continue;
      edges.push([Math.floor(e / 3), Math.floor(o / 3)]);
    }
    const rings = [];
    for (let i = 0; i < gens.length; i++) {
      const gx = pts[2 * i], gy = pts[2 * i + 1];
      if (Math.abs(gx - cx) > 9 || Math.abs(gy - cy) > 7.5) continue;
      const poly = vor.cellPolygon(i);
      if (poly) rings.push(poly);
    }
    net = { cc, edges, rings, ntri: cc.length / 2 };
  }

  // função de distribuição radial sobre vértices (átomos formadores) numa janela central
  function gr() {
    const { cc, ntri } = net;
    const P = [];
    for (let t = 0; t < ntri; t++) {
      const x = cc[2 * t], y = cc[2 * t + 1];
      if (Math.abs(x - cx) < 6.5 && Math.abs(y - cy) < 5.5) P.push([x, y]);
    }
    const bond = a / Math.sqrt(3);
    const rmax = 5 * bond, nb = 90, dr = rmax / nb;
    const h = new Float64Array(nb);
    const core = P.filter(([x, y]) => Math.abs(x - cx) < 3.2 && Math.abs(y - cy) < 2.6);
    for (const [x, y] of core) for (const [u, v] of P) {
      const r = Math.hypot(u - x, v - y);
      if (r > 1e-6 && r < rmax) h[Math.floor(r / dr)]++;
    }
    const rho = P.length / (13 * 11);
    for (let k = 0; k < nb; k++) {
      const r = (k + 0.5) * dr;
      h[k] /= Math.max(1, core.length) * rho * 2 * Math.PI * r * dr;
    }
    // suavização leve
    const s = new Float64Array(nb);
    for (let k = 0; k < nb; k++) s[k] = (h[Math.max(0, k - 1)] + 2 * h[k] + h[Math.min(nb - 1, k + 1)]) / 4;
    return { s, dr, bond };
  }

  const view = hiDPI(canvas, () => draw());
  const grView = hiDPI(grCanvas, () => drawGr());

  function draw() {
    if (!net) return;
    const { ctx, w, h } = view;
    const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const scale = Math.min(w / 15, h / 11.2);
    const X = (x) => w / 2 + (x - cx) * scale, Y = (y) => h / 2 + (y - cy) * scale;
    // anéis
    if (ringsBox.checked) {
      for (const poly of net.rings) {
        const n = poly.length - 1;
        const v = RING_COL[Math.min(9, Math.max(4, n))];
        if (!v) continue;
        ctx.beginPath();
        poly.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
        ctx.closePath();
        ctx.fillStyle = alpha(pal[v === '--scl' ? 'scl' : v === '--glass' ? 'glass' : 'cryst'], n >= 8 ? 0.34 : 0.24);
        ctx.fill();
      }
    }
    // ligações
    const { cc, edges } = net;
    ctx.strokeStyle = alpha(pal.ink, 0.55); ctx.lineWidth = Math.max(1, scale * 0.06);
    ctx.beginPath();
    for (const [t1, t2] of edges) {
      ctx.moveTo(X(cc[2 * t1]), Y(cc[2 * t1 + 1])); ctx.lineTo(X(cc[2 * t2]), Y(cc[2 * t2 + 1]));
    }
    ctx.stroke();
    // oxigênios (no meio das ligações)
    if (oBox.checked) {
      ctx.fillStyle = pal.liq;
      for (const [t1, t2] of edges) {
        const x = (cc[2 * t1] + cc[2 * t2]) / 2, y = (cc[2 * t1 + 1] + cc[2 * t2 + 1]) / 2;
        const px = X(x), py = Y(y);
        if (px < -10 || py < -10 || px > w + 10 || py > h + 10) continue;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1.6, scale * 0.085), 0, 6.283); ctx.fill();
      }
    }
    // formadores
    ctx.fillStyle = pal.ink;
    for (let t = 0; t < net.ntri; t++) {
      const px = X(cc[2 * t]), py = Y(cc[2 * t + 1]);
      if (px < -10 || py < -10 || px > w + 10 || py > h + 10) continue;
      ctx.beginPath(); ctx.arc(px, py, Math.max(2, scale * 0.11), 0, 6.283); ctx.fill();
    }
  }

  function drawGr() {
    if (!net) return;
    const { ctx, w, h } = grView;
    const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const { s, dr, bond } = gr();
    const l = 34, r = w - 10, t = 24, b = h - 26;
    const ymax = 6;
    const X = (rr) => l + (rr / (5 * bond)) * (r - l), Y = (v) => b - (Math.min(v, ymax) / ymax) * (b - t);
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(l, Y(1)); ctx.lineTo(r, Y(1)); ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = pal.ink2; ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l, b); ctx.lineTo(r, b); ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < s.length; k++) { const x = X((k + 0.5) * dr), y = Y(s[k]); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = dis < 0.15 ? pal.cryst : pal.glass; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.font = '12px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let k = 1; k <= 4; k++) ctx.fillText(`${k}`, X(k * bond), b + 6);
    label(ctx, 'r / ligação', r, t - 4, { color: pal.ink2, align: 'right', base: 'middle', size: 11, weight: 500 });
    label(ctx, 'g(r)', l + 6, t - 4, { color: pal.ink, base: 'top' });
    label(ctx, '1', l - 8, Y(1), { color: pal.ink2, align: 'right', weight: 500, size: 11 });
    // pico do 1º vizinho
    let kmax = 0; for (let k = 0; k < s.length && (k + 0.5) * dr < 1.4 * bond; k++) if (s[k] > s[kmax]) kmax = k;
    label(ctx, '← 1º vizinho', X((kmax + 0.5) * dr) + 6, Y(s[kmax]) + 4, { color: pal.ink2, weight: 500, size: 11 });
  }

  // legenda dos anéis
  legend.innerHTML = [['scl', '5 membros'], [null, '6 membros (cristal)'], ['glass', '7 membros'], ['cryst', '4, 8 ou mais']]
    .map(([c, t]) => `<span><i class="round" style="background:${c ? `color-mix(in srgb, var(--${c}) 45%, transparent)` : 'var(--bg-2)'}; outline:1px solid var(--rule)"></i>${t}</span>`).join('');

  function refresh() { build(); draw(); drawGr(); }
  slider.addEventListener('input', () => { clip.pause(); dis = slider.value / 100; thermal = 0.03; out.textContent = `${slider.value} %`; refresh(); });
  ringsBox.addEventListener('change', draw);
  oBox.addEventListener('change', draw);

  // clipe: cristal → fusão → têmpera → vidro
  const clip = new Clip(root.querySelector('#net-clip'), {
    duration: 14, label: 'animação da rede',
    chapters: [
      { t: 0, text: 'Cristal: todos os anéis têm 6 membros e a g(r) tem picos finos até longe.' },
      { t: 2.5, text: 'Aquecendo: as ligações se rompem e se refazem, surgem anéis de 5 e 7.' },
      { t: 6.5, text: 'Líquido: desordem máxima e átomos em movimento.' },
      { t: 9, text: 'Têmpera: o movimento para, mas a desordem fica congelada.' },
      { t: 11.5, text: 'Vidro: o 1º pico da g(r) se mantém (ordem local); os distantes somem.' },
    ],
    render: (t, dt) => {
      time += dt;
      const ramp = (x, a0, a1) => Math.min(1, Math.max(0, (x - a0) / (a1 - a0)));
      dis = 1 * ramp(t, 2, 6.5);
      thermal = 0.03 + 0.13 * ramp(t, 2, 6.5) * (1 - ramp(t, 8.5, 10.5));
      slider.value = Math.round(dis * 100); out.textContent = `${slider.value} %`;
      refresh();
    },
  });
  refresh();
}
