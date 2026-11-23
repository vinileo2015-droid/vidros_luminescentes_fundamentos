// Têmpera térmica × química: perfil de tensão residual na espessura, flexão aplicada e uma trinca superficial.
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';
import { segmented } from '../lib/props-data.js';

const erfc = (x) => { const t = 1 / (1 + 0.3275911 * x); const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))); return y * Math.exp(-x * x); };
export function init(root) {
  const cv = root.querySelector('#tp-canvas');
  const sB = root.querySelector('#tp-b'), sC = root.querySelector('#tp-c'), sS = root.querySelector('#tp-s'), sL = root.querySelector('#tp-l');
  let mode = 'none';
  const lab = { none: 'Recozido', th: 'Têmpera térmica', ch: 'Troca iônica (química)' };
  segmented(root.querySelector('#tp-mode'), Object.entries(lab), (m) => { mode = m; if (m === 'th') { sS.value = 100; sL.value = 0; } if (m === 'ch') { sS.value = 700; sL.value = 40; } ui(); }, 'none');
  const t = 4; // mm
  const view = hiDPI(cv, () => draw());
  const KIC = 0.75;
  function resid(x) { // x: distância da superfície inferior (mm), 0..t
    const s = +sS.value;
    if (mode === 'th') { const u = (2 * x) / t - 1; return -s + 1.5 * s * (1 - u * u); }
    if (mode === 'ch') { const L = Math.max(0.005, +sL.value / 1000); const ft = (2 * s * L) / Math.sqrt(Math.PI) / (t - 0); return -s * (erfc(x / L) + erfc((t - x) / L)) + ft; }
    return 0;
  }
  function draw() {
    const { ctx, w, h } = view; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const sb = +sB.value, c = +sC.value / 1000; // mm
    const app = (x) => sb * (1 - (2 * x) / t); // tração máxima na face inferior (x = 0)
    const box = { l: 16, r: w - 16, t: 30, b: h - 40 };
    const smax = 900, X = (s) => box.l + ((s + smax) / (2 * smax)) * (box.r - box.l), Y = (x) => box.b - (x / t) * (box.b - box.t);
    ctx.fillStyle = alpha(pal.glass, 0.08); ctx.fillRect(box.l, box.t, box.r - box.l, box.b - box.t);
    ctx.fillStyle = alpha(pal.cryst, 0.06); ctx.fillRect(box.l, box.t, X(0) - box.l, box.b - box.t);
    ctx.fillStyle = alpha(pal.liq, 0.06); ctx.fillRect(X(0), box.t, box.r - X(0), box.b - box.t);
    label(ctx, '← compressão', X(-smax) + 6, box.t - 12, { color: pal.cryst, size: 11 }); label(ctx, 'tração →', box.r - 4, box.t - 12, { color: pal.liq, align: 'right', size: 11 });
    ctx.strokeStyle = pal.ink2; ctx.beginPath(); ctx.moveTo(X(0), box.t); ctx.lineTo(X(0), box.b); ctx.stroke();
    ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.fillStyle = pal.ink2; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [-800, -400, 0, 400, 800].forEach((s) => ctx.fillText(`${s}`, X(s), box.b + 6));
    label(ctx, 'tensão (MPa)', box.r, box.b + 24, { color: pal.ink, align: 'right', size: 11 });
    label(ctx, 'face superior', box.r - 6, box.t + 10, { color: pal.ink2, align: 'right', size: 11, weight: 500 });
    label(ctx, 'face inferior (trinca)', box.r - 6, box.b - 10, { color: pal.ink2, align: 'right', size: 11, weight: 500 });
    const curve = (f, col, lw, d) => { ctx.save(); ctx.setLineDash(d || []); ctx.beginPath(); for (let i = 0; i <= 400; i++) { const x = (t * i) / 400, s = Math.max(-smax, Math.min(smax, f(x))); i ? ctx.lineTo(X(s), Y(x)) : ctx.moveTo(X(s), Y(x)); } ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); };
    curve(resid, pal.glass, 2, [5, 4]); curve(app, pal.ink2, 1.5, [2, 3]); curve((x) => resid(x) + app(x), pal.ink, 3);
    // trinca na face inferior
    let avg = 0; const N = 40; for (let i = 0; i < N; i++) { const x = (c * (i + 0.5)) / N; avg += resid(x) + app(x); } avg /= N;
    const K = avg > 0 ? 1.12 * avg * Math.sqrt(Math.PI * c * 1e-3) : 0, fail = K > KIC;
    const yc = Y(c);
    ctx.strokeStyle = fail ? pal.liq : pal.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(-smax) + 4, box.b); ctx.lineTo(X(-smax) + 12, Math.min(box.b - 6, yc)); ctx.stroke();
    label(ctx, `trinca de ${fmt(c * 1000)} µm`, X(-smax) + 18, Math.min(box.b - 10, yc) - 2, { color: fail ? pal.liq : pal.ink, size: 11, bg: alpha(pal.panel, 0.8) });
    const out = root.querySelector('#tp-out');
    out.textContent = fail ? `Quebra: K ≈ ${fmt(K, 2)} MPa·m½ passa da tenacidade (${fmt(KIC, 2)}). A tração líquida média na trinca é de ${fmt(avg)} MPa.` : avg <= 0 ? `A trinca inteira está em compressão (${fmt(avg)} MPa em média): ela não pode crescer.` : `Resiste: K ≈ ${fmt(K, 2)} MPa·m½, abaixo da tenacidade (${fmt(KIC, 2)}).`;
    out.dataset.s = fail ? 'no' : 'yes';
    // tração central
    root.querySelector('#tp-ct').textContent = `${fmt(resid(t / 2))} MPa`;
    root.querySelector('#tp-sc').textContent = `${fmt(resid(0))} MPa`;
    // flexão máxima suportada para esta trinca (busca)
    let lo = 0, hi = 2000; for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; let a = 0; for (let i = 0; i < N; i++) { const x = (c * (i + 0.5)) / N; a += resid(x) + mid * (1 - (2 * x) / t); } a /= N; (a > 0 && 1.12 * a * Math.sqrt(Math.PI * c * 1e-3) > KIC) ? (hi = mid) : (lo = mid); }
    root.querySelector('#tp-max').textContent = `${fmt(lo)} MPa`;
  }
  function ui() {
    root.querySelector('#tp-b-v').textContent = `${fmt(+sB.value)} MPa`;
    root.querySelector('#tp-c-v').textContent = `${fmt(+sC.value)} µm`;
    root.querySelector('#tp-s-v').textContent = `${fmt(+sS.value)} MPa`;
    root.querySelector('#tp-l-v').textContent = `${fmt(+sL.value)} µm`;
    sS.disabled = mode === 'none'; sL.disabled = mode !== 'ch';
    view.redraw();
  }
  [sB, sC, sS, sL].forEach((s) => s.addEventListener('input', ui));
  ui();
}
