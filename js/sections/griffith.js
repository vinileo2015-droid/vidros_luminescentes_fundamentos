// Resistência de Griffith: σ_f = K_Ic / (Y √(πc)), limitada pela resistência teórica de Orowan √(γE/a₀).
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { segmented } from '../lib/props-data.js';

const G = { sl: { name: 'Sodo-cálcico', E: 70.3, g: 3.9 }, bs: { name: 'Borossilicato', E: 62.75, g: 4.7 }, si: { name: 'Sílica', E: 72, g: 4.35 }, al: { name: 'Aluminossilicato', E: 87.6, g: 4.65 } };
export function init(root) {
  const c1 = root.querySelector('#gr-plot'), c2 = root.querySelector('#gr-tip'), sc = root.querySelector('#gr-c'), wet = root.querySelector('#gr-wet');
  let gid = 'sl';
  segmented(root.querySelector('#gr-pick'), Object.entries(G).map(([k, v]) => [k, v.name]), (k) => { gid = k; all(); }, 'sl');
  const V1 = hiDPI(c1, () => d1()), V2 = hiDPI(c2, () => d2());
  const props = () => { const g = G[gid]; const gam = wet.checked ? g.g * 0.6 : g.g; const K = Math.sqrt(2 * gam * g.E * 1e9) / 1e6; const sm = Math.sqrt((gam * g.E * 1e9) / 0.2e-9) / 1e6; return { K, sm, gam }; };
  const sf = (c, K, sm) => Math.min(sm, K / (1.12 * Math.sqrt(Math.PI * c)));
  function d1() {
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 64, r: w - 24, t: 28, b: h - 34 };
    const X = (c) => box.l + ((Math.log10(c) + 9) / 6) * (box.r - box.l), Y = (s) => box.b - ((Math.log10(s) - 0) / 5) * (box.b - box.t);
    // faixas típicas
    [[1e-8, 3e-7, 'fibra recém-puxada'], [1e-6, 1e-4, 'vidro manuseado'], [2e-4, 1e-3, 'riscado ou lascado']].forEach(([a, b, t], i) => { ctx.fillStyle = alpha([pal.glass, pal.scl, pal.liq][i], 0.1); ctx.fillRect(X(a), box.t, X(b) - X(a), box.b - box.t); ctx.font = '600 11px "Schibsted Grotesk", system-ui'; if (ctx.measureText(t).width < X(b) - X(a) + 30) label(ctx, t, (X(a) + X(b)) / 2, box.t + 12 + (i === 2 ? 16 : 0), { color: [pal.glass, pal.scl, pal.liq][i], align: 'center', size: 11 }); });
    axes(ctx, box, { x: X, y: Y, pal, xt: [1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3], yt: [1, 10, 100, 1000, 10000, 100000], xfmt: (c) => (c < 1e-6 ? `${fmt(c * 1e9)} nm` : c < 1e-3 ? `${fmt(c * 1e6)} µm` : `${fmt(c * 1e3)} mm`), yfmt: (s) => (s >= 1000 ? `${fmt(s / 1000)} GPa` : `${fmt(s)} MPa`), xl: 'profundidade da trinca c', yl: 'resistência σf' });
    const { K, sm } = props();
    ctx.beginPath(); for (let e = -9; e <= -3; e += 0.02) { const c = 10 ** e, y = Y(sf(c, K, sm)); e === -9 ? ctx.moveTo(X(c), y) : ctx.lineTo(X(c), y); } ctx.strokeStyle = pal.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = pal.cryst; ctx.beginPath(); ctx.moveTo(box.l, Y(sm)); ctx.lineTo(box.r, Y(sm)); ctx.stroke(); ctx.restore();
    label(ctx, `resistência teórica ≈ ${fmt(sm / 1000, 0)} GPa`, box.r - 4, Y(sm) + 12, { color: pal.cryst, align: 'right', size: 11 });
    const c = 10 ** +sc.value, s = sf(c, K, sm);
    ctx.fillStyle = pal.liq; ctx.beginPath(); ctx.arc(X(c), Y(s), 6, 0, 6.283); ctx.fill();
    label(ctx, `${s >= 1000 ? fmt(s / 1000, 1) + ' GPa' : fmt(s) + ' MPa'}`, X(c) + 10, Y(s) - 10, { color: pal.liq, size: 13, bg: alpha(pal.panel, 0.85) });
  }
  function d2() {
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const c = 10 ** +sc.value, rho = 0.2e-9, kt = 1 + 2 * Math.sqrt(c / rho);
    // placa com trinca elíptica e linhas de força que se concentram na ponta
    const px = 20, py = 30, pw = w - 40, ph = h - 60;
    ctx.fillStyle = alpha(pal.glass, 0.12); ctx.fillRect(px, py, pw, ph); ctx.strokeStyle = pal.glass; ctx.strokeRect(px, py, pw, ph);
    const L = Math.min(pw * 0.55, (pw * 0.08) * (1 + (+sc.value + 9) * 0.9)); // comprimento desenhado (escala livre)
    const cy = py + ph / 2, tipX = px + L;
    for (let i = -7; i <= 7; i++) {
      if (i === 0) continue;
      const y0 = cy + (i * ph) / 16; ctx.beginPath();
      for (let x = px; x <= px + pw; x += 4) { const dx = (x - tipX) / (pw * 0.18); const pull = Math.exp(-dx * dx) * (x < tipX + 20 ? 1 : 0.6); const yy = y0 - Math.sign(i) * pull * Math.max(0, Math.abs(y0 - cy) - 2) * (1 - Math.min(1, Math.abs(i) / 8)) * 0.9; x === px ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.strokeStyle = alpha(pal.ink2, 0.5); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.fillStyle = pal.bg; ctx.beginPath(); ctx.ellipse(px, cy, L, Math.max(2, ph * 0.035), 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.stroke();
    const grd = ctx.createRadialGradient(tipX, cy, 0, tipX, cy, 34); grd.addColorStop(0, alpha(pal.liq, 0.75)); grd.addColorStop(1, alpha(pal.liq, 0)); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(tipX, cy, 34, 0, 6.283); ctx.fill();
    ['↑', '↓'].forEach((a, j) => { for (let k = 0; k < 6; k++) label(ctx, a, px + pw * (0.1 + 0.16 * k), j ? py + ph + 14 : py - 12, { color: pal.ink2, align: 'center', size: 14 }); });
    label(ctx, `na ponta: σ ≈ ${fmt(kt, 0)} × σ aplicada`, tipX + 30, cy - 26, { color: pal.liq, size: 12, bg: alpha(pal.panel, 0.85) });
    const { K, gam } = props();
    root.querySelector('#gr-c-v').textContent = c < 1e-6 ? `${fmt(c * 1e9)} nm` : c < 1e-3 ? `${fmt(c * 1e6, 1)} µm` : `${fmt(c * 1e3, 2)} mm`;
    root.querySelector('#gr-k').textContent = fmt(K, 2);
    root.querySelector('#gr-g').textContent = fmt(gam, 1);
    root.querySelector('#gr-kt').textContent = fmt(kt, 0);
  }
  function all() { V1.redraw(); V2.redraw(); }
  sc.addEventListener('input', all); wet.addEventListener('change', all);
}
