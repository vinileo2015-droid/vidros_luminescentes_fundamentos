// Módulo de Young: anomalia do boro (Imaoka et al., Varshneya Tab. 8.1) e comparação entre famílias.
import { hiDPI, palette, alpha, axes, label, fmt, color } from '../lib/ui.js';

// [Na2O, B2O3, SiO2, E (GPa)]
const D = [[10,10,80,81.5],[10,15,75,78.6],[10,20,70,76.4],[10,25,65,73.9],[10,30,60,63.1],[10,35,55,60.3],[10,40,50,54.1],[10,45,45,50.3],[10,50,40,47.1],[10,55,35,47.4],[10,60,30,46.3],[10,65,25,44.9],[10,70,20,38.6],[10,75,15,37.8],[10,80,10,36.5],[10,85,5,32.8],
[20,5,75,76.2],[20,10,70,78.0],[20,15,65,82.8],[20,20,60,83.8],[20,25,55,83.5],[20,30,50,84.2],[20,35,45,76.1],[20,40,40,75.5],[20,45,35,73.3],[20,50,30,70.0],[20,55,25,67.2],[20,60,20,61.1],[20,65,15,56.2],[20,70,10,50.9],[20,75,5,51.3],
[25,50,25,71.8],[25,55,20,73.2],[25,60,15,68.8],[25,65,10,65.1],[25,70,5,67.4],
[30,5,65,73.5],[30,10,60,75.1],[30,15,55,75.8],[30,20,50,77.2],[30,25,45,82.4],[30,30,40,84.5],[30,35,35,78.9],[30,40,30,73.5],[30,45,25,79.9],[30,50,20,75.1],[30,55,15,72.4],[30,60,10,70.9],[30,65,5,70.5]];
const SER = [[10, '--glass'], [20, '--scl'], [25, '--cond'], [30, '--liq']];
const REFS = [['As₂S₃ (calcogeneto)', 16], ['Vidro metálico Pd–Cu–Si', 90], ['ZBLAN (fluoreto)', 58], ['Chumbo (0010)', 61.4], ['Borossilicato (7740)', 62.8], ['Sodo-cálcico (0080)', 70.3], ['Sílica vítrea', 72], ['Aluminossilicato (1720)', 87.6], ['Oxinitreto Si–Al–Y–O–N', 160]].sort((a, b) => a[1] - b[1]);

export function init(root) {
  const c1 = root.querySelector('#el-b'), c2 = root.querySelector('#el-ref'), out = root.querySelector('#el-out');
  let hot = 21, geo = null;
  const V1 = hiDPI(c1, () => d1()), V2 = hiDPI(c2, () => d2());
  function d1() {
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 44, r: w - 12, t: 28, b: h - 34 };
    const X = (b) => box.l + (b / 90) * (box.r - box.l), Y = (E) => box.b - ((E - 30) / 60) * (box.b - box.t);
    geo = { X, Y };
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 15, 30, 45, 60, 75, 90], yt: [30, 45, 60, 75, 90], xl: 'B₂O₃ (% mol), substituindo SiO₂', yl: 'E (GPa)' });
    SER.forEach(([na, cv], si) => {
      const col = color(cv), pts = D.map((p, i) => [p, i]).filter(([p]) => p[0] === na);
      ctx.beginPath(); pts.forEach(([p], j) => (j ? ctx.lineTo(X(p[1]), Y(p[3])) : ctx.moveTo(X(p[1]), Y(p[3])))); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      pts.forEach(([p, i]) => { ctx.beginPath(); ctx.arc(X(p[1]), Y(p[3]), i === hot ? 6.5 : 3.5, 0, 6.283); ctx.fillStyle = col; ctx.fill(); if (i === hot) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke(); } });
      label(ctx, `${na} % Na₂O`, box.r - 4, box.t + 6 + si * 16, { color: col, align: 'right', size: 11 });
    });
  }
  function d2() {
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    ctx.font = '500 12px "Schibsted Grotesk", system-ui'; const lw = Math.max(...REFS.map((r) => ctx.measureText(r[0]).width));
    const box = { l: Math.min(w * 0.62, lw + 16), r: w - 40, t: 12, b: h - 8 };
    const rh = (box.b - box.t) / REFS.length, X = (E) => box.l + (E / 170) * (box.r - box.l);
    REFS.forEach(([n, E], i) => {
      const y = box.t + i * rh;
      ctx.fillStyle = n.includes('metálico') ? alpha(pal.cryst, 0.75) : n.includes('calco') || n.includes('fluoreto') ? alpha(color('--cond'), 0.7) : alpha(pal.glass, 0.75);
      ctx.fillRect(box.l, y + 3, X(E) - box.l, rh - 7);
      label(ctx, n, box.l - 8, y + rh / 2, { color: pal.ink, align: 'right', size: 12, weight: 500 });
      label(ctx, `${fmt(E)}`, X(E) + 6, y + rh / 2, { color: pal.ink2, size: 11 });
    });
  }
  function describe() {
    const [na, b, s, E] = D[hot]; const R = na / b, K = s / b;
    const Rmax = 0.5 + K / 16, N4 = Math.min(R, Rmax);
    out.innerHTML = `<b>${na} Na₂O · ${b} B₂O₃ · ${s} SiO₂</b> → E = ${fmt(E, 1)} GPa. R = Na₂O/B₂O₃ = ${fmt(R, 2)}; K = SiO₂/B₂O₃ = ${fmt(K, 2)}. ${R <= Rmax ? `Pelo modelo de Dell–Bray, praticamente todo o Na⁺ converte BO₃ em BO₄⁻ (N₄ ≈ ${fmt(N4, 2)}): a rede fica mais conectada.` : `R passou de R<sub>máx</sub> ≈ ${fmt(Rmax, 2)}: o álcali excedente começa a formar NBO, e a rede perde conexões.`}`;
  }
  c1.addEventListener('pointermove', (e) => {
    if (!geo) return; const r = c1.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let best = null, bd = 16; D.forEach((p, i) => { const d = Math.hypot(geo.X(p[1]) - px, geo.Y(p[3]) - py); if (d < bd) { bd = d; best = i; } });
    if (best !== null && best !== hot) { hot = best; describe(); d1(); }
  });
  describe();
}
