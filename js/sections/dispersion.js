// Dispersão: curvas de Sellmeier, diagrama de Abbe e um prisma.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { lambdaRGB } from '../lib/color.js';
import { segmented } from '../lib/props-data.js';

// Coeficientes de Sellmeier (λ em µm): sílica (Malitson 1965) e catálogo Schott
const G = [
  { id: 'fk', name: 'N-FK51A (fluorofosfato)', B: [0.971247817, 0.216901417, 0.904651666], C: [0.00472301995, 0.0153575612, 168.68133], kind: 'crown de flúor' },
  { id: 'si', name: 'Sílica vítrea', B: [0.6961663, 0.4079426, 0.8974794], C: [0.0684043 ** 2, 0.1162414 ** 2, 9.896161 ** 2], kind: 'sílica' },
  { id: 'bk', name: 'N-BK7 (borossilicato crown)', B: [1.03961212, 0.231792344, 1.01046945], C: [0.00600069867, 0.0200179144, 103.560653], kind: 'crown' },
  { id: 'sf', name: 'N-SF11 (flint denso de Ti/Ba)', B: [1.73759695, 0.313747346, 1.89878101], C: [0.013188707, 0.0623068142, 155.23629], kind: 'flint' },
];
const nOf = (g, lnm) => { const l2 = (lnm / 1000) ** 2; let s = 1; for (let i = 0; i < 3; i++) s += (g.B[i] * l2) / (l2 - g.C[i]); return Math.sqrt(s); };
G.forEach((g) => { g.nd = nOf(g, 587.56); g.nF = nOf(g, 486.13); g.nC = nOf(g, 656.27); g.vd = (g.nd - 1) / (g.nF - g.nC); });
// outros vidros de catálogo para povoar o diagrama (n_d, ν_d)
const CAT = [[1.4339, 94.9], [1.497, 81.6], [1.5168, 64.2], [1.5891, 61.3], [1.6204, 60.3], [1.6935, 53.3], [1.788, 47.4], [1.883, 40.8], [1.5481, 45.8], [1.5814, 40.8], [1.6200, 36.4], [1.6727, 32.2], [1.7174, 29.5], [1.7552, 27.6], [1.8467, 23.8], [1.9229, 18.9], [1.5225, 59.5], [1.6034, 38.0], [1.6516, 58.5], [1.7292, 54.7], [1.804, 46.6], [1.5638, 60.8]];

export function init(root) {
  const c1 = root.querySelector('#dp-n'), c2 = root.querySelector('#dp-abbe'), c3 = root.querySelector('#dp-prism');
  let sel = 2;
  segmented(root.querySelector('#dp-pick'), G.map((g, i) => [i, g.name.split(' (')[0]]), (i) => { sel = +i; all(); }, 2);
  const V1 = hiDPI(c1, () => d1()), V2 = hiDPI(c2, () => d2()), V3 = hiDPI(c3, () => d3());
  const cols = () => { const p = palette(); return [p.glass, p.cryst, p.scl, p.liq]; };
  function d1() {
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 52, r: w - 12, t: 26, b: h - 32 };
    const X = (l) => box.l + ((l - 300) / 1700) * (box.r - box.l), Y = (n) => box.b - ((n - 1.4) / 0.48) * (box.b - box.t);
    for (let l = 380; l < 780; l += 4) { ctx.fillStyle = alpha(lambdaRGB(l), 0.18); ctx.fillRect(X(l), box.t, X(l + 4) - X(l) + 0.5, box.b - box.t); }
    axes(ctx, box, { x: X, y: Y, pal, xt: [400, 800, 1200, 1600, 2000], yt: [1.4, 1.5, 1.6, 1.7, 1.8], yfmt: (v) => fmt(v, 1), xl: 'λ (nm)', yl: 'índice de refração n' });
    G.forEach((g, i) => {
      ctx.beginPath(); for (let l = 300; l <= 2000; l += 5) { const y = Y(nOf(g, l)); l === 300 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); }
      ctx.strokeStyle = i === sel ? cols()[i] : alpha(cols()[i], 0.45); ctx.lineWidth = i === sel ? 3 : 1.5; ctx.stroke();
    });
    const labs = G.map((g, i) => ({ i, y: Y(nOf(g, 1990)) - 9 })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < labs.length; k++) if (labs[k].y - labs[k - 1].y < 13) labs[k].y = labs[k - 1].y + 13;
    labs.forEach(({ i, y }) => label(ctx, G[i].name.split(' (')[0], X(1990), y, { color: cols()[i], align: 'right', size: 11, bg: alpha(pal.bg, 0.8) }));
  }
  function d2() {
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 46, r: w - 12, t: 26, b: h - 32 };
    const X = (v) => box.l + ((100 - v) / 85) * (box.r - box.l), Y = (n) => box.b - ((n - 1.40) / 0.55) * (box.b - box.t);
    ctx.fillStyle = alpha(pal.glass, 0.06); ctx.fillRect(box.l, box.t, X(50) - box.l, box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: [90, 70, 50, 30], yt: [1.4, 1.5, 1.6, 1.7, 1.8, 1.9], yfmt: (v) => fmt(v, 1), xl: 'número de Abbe νd ←', yl: 'nd' });
    label(ctx, 'crowns (νd > 50)', X(98), box.b - 10, { color: pal.glass, size: 11 });
    label(ctx, 'flints (νd < 50)', X(48), box.t + 22, { color: pal.liq, size: 11 });
    CAT.forEach(([n, v]) => { ctx.beginPath(); ctx.arc(X(v), Y(n), 3, 0, 6.283); ctx.fillStyle = alpha(pal.ink2, 0.45); ctx.fill(); });
    G.forEach((g, i) => { ctx.beginPath(); ctx.arc(X(g.vd), Y(g.nd), i === sel ? 7 : 5, 0, 6.283); ctx.fillStyle = cols()[i]; ctx.fill(); ctx.strokeStyle = pal.panel; ctx.lineWidth = 2; ctx.stroke(); });
    const g = G[sel]; label(ctx, `${g.name.split(' (')[0]}`, X(g.vd) + (g.vd < 40 ? -10 : 10), Y(g.nd) - 12, { color: cols()[sel], align: g.vd < 40 ? 'right' : 'left', size: 12, bg: alpha(pal.panel, 0.85) });
    label(ctx, 'mais disperso →', box.r, box.t + 4, { color: pal.ink2, align: 'right', size: 11, weight: 500 });
  }
  function d3() {
    const { ctx, w, h } = V3; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const g = G[sel], cx = w * 0.42, cy = h * 0.62, s = Math.min(w * 0.36, h * 0.8);
    const A = [cx - s / 2, cy + s * 0.29], B = [cx + s / 2, cy + s * 0.29], C = [cx, cy - s * 0.58];
    ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...C); ctx.closePath(); ctx.fillStyle = alpha(pal.glass, 0.14); ctx.fill(); ctx.strokeStyle = pal.glass; ctx.lineWidth = 1.5; ctx.stroke();
    // raio de entrada na condição de desvio mínimo do comprimento d
    const ang = (60 * Math.PI) / 180, nd = g.nd;
    const thIn = Math.asin(nd * Math.sin(ang / 2));
    const P = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2], Q = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
    const inDir = -(thIn - ang / 2); // ângulo do raio de entrada com a horizontal (radianos)
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P[0] - Math.cos(inDir) * w, P[1] - Math.sin(inDir) * w); ctx.lineTo(...P); ctx.stroke();
    ctx.strokeStyle = alpha(pal.ink, 0.5); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(...P); ctx.lineTo(...Q); ctx.stroke();
    const amp = 4; // exagero do leque
    const dmin = 2 * thIn - ang;
    for (let l = 400; l <= 700; l += 10) {
      const n = nOf(g, l);
      const th2 = Math.asin(Math.min(1, n * Math.sin(ang - Math.asin(Math.sin(thIn) / n))));
      const dev = thIn + th2 - ang;
      const dir = inDir + dmin + (dev - dmin) * amp; // desvio total, exagerado
      ctx.strokeStyle = lambdaRGB(l); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(...Q); ctx.lineTo(Q[0] + Math.cos(dir) * w, Q[1] + Math.sin(dir) * w); ctx.stroke();
    }
    const dev = (l) => { const n = nOf(g, l); return thIn + Math.asin(Math.min(1, n * Math.sin(ang - Math.asin(Math.sin(thIn) / n)))) - ang; };
    const spread = ((dev(400) - dev(700)) * 180) / Math.PI;
    label(ctx, `leque 400–700 nm: ${fmt(spread, 2)}° (desenhado ×${amp})`, 12, 16, { color: pal.ink, size: 12 });
    root.querySelector('#dp-nd').textContent = fmt(g.nd, 4);
    root.querySelector('#dp-vd').textContent = fmt(g.vd, 1);
    root.querySelector('#dp-dn').textContent = fmt((g.nF - g.nC) * 1000, 2);
    root.querySelector('#dp-kind').textContent = g.kind;
  }
  function all() { V1.redraw(); V2.redraw(); V3.redraw(); }
}
