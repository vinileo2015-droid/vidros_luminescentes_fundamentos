// Espectros de emissão de lantanídeos em vidro: linhas f–f (Eu³⁺, Tb³⁺) × bandas 5d→4f (Eu²⁺, Ce³⁺) e o efeito da matriz.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { emissionRGB, lambdaRGB } from '../lib/color.js';
import { segmented } from '../lib/props-data.js';

const G = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2);
const ION = {
  eu3: { name: 'Eu³⁺', kind: 'f–f', spec: (l, L, d) => { const R = 0.6 + 5 * d + 2.5 * (L - 0.45); return 0.15 * G(l, 578, 1.8) + 1 * G(l, 591, 3.5) + R * G(l, 612, 4.5) + 0.12 * G(l, 652, 4) + 0.5 * (0.6 + d) * G(l, 700, 6); }, R: (L, d) => 0.6 + 5 * d + 2.5 * (L - 0.45) },
  tb3: { name: 'Tb³⁺', kind: 'f–f', spec: (l) => 0.35 * G(l, 489, 5) + 1 * G(l, 543, 5) + 0.18 * G(l, 585, 5) + 0.1 * G(l, 621, 5) },
  eu2: { name: 'Eu²⁺', kind: '5d→4f', spec: (l, L) => { const E = 3.05 - 1.6 * (L - 0.45), Ev = 1239.84 / l, s = 0.13 + 0.08 * (L - 0.45); return G(Ev, E, s); }, peak: (L) => 1239.84 / (3.05 - 1.6 * (L - 0.45)) },
  ce3: { name: 'Ce³⁺', kind: '5d→4f', spec: (l, L) => { const E = 3.9 - 2.2 * (L - 0.45), Ev = 1239.84 / l, s = 0.12 + 0.05 * (L - 0.45); return G(Ev, E, s) + 0.75 * G(Ev, E - 0.25, s); }, peak: (L) => 1239.84 / (3.9 - 2.2 * (L - 0.45)) },
};
export function init(root) {
  const cv = root.querySelector('#em-canvas'), sw = root.querySelector('#em-sw');
  const sL = root.querySelector('#em-L'), sD = root.querySelector('#em-d');
  let ion = 'eu3';
  segmented(root.querySelector('#em-ion'), Object.entries(ION).map(([k, v]) => [k, v.name]), (k) => { ion = k; draw(); }, 'eu3');
  const V = hiDPI(cv, () => draw()), VS = hiDPI(sw, () => drawSw());
  const hostName = (L) => (L < 0.5 ? 'fluoreto' : L < 0.58 ? 'fosfato / borato' : L < 0.68 ? 'silicato' : L < 0.78 ? 'aluminossilicato de Ca / germanato' : 'vidro de alta basicidade (Pb, Bi, Te)');
  function draw() {
    const { ctx, w, h } = V; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const L = +sL.value, d = +sD.value, I = ION[ion];
    const box = { l: 40, r: w - 12, t: 28, b: h - 40 };
    const L0 = 300, L1 = 750; let mx = 0; for (let l = L0; l <= L1; l++) mx = Math.max(mx, I.spec(l, L, d));
    const X = (l) => box.l + ((l - L0) / (L1 - L0)) * (box.r - box.l), Y = (v) => box.b - (v / mx) * 0.92 * (box.b - box.t);
    for (let l = 380; l < 750; l += 4) { ctx.fillStyle = lambdaRGB(l); ctx.fillRect(X(l), box.b + 2, X(l + 4) - X(l) + 0.5, 6); }
    ctx.fillStyle = alpha(pal.cryst, 0.07); ctx.fillRect(box.l, box.t, X(380) - box.l, box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: [300, 400, 500, 600, 700], yt: [], xl: 'λ (nm)', yl: 'intensidade de emissão' });
    ctx.beginPath(); for (let l = L0; l <= L1; l += 0.5) { const y = Y(I.spec(l, L, d)); l === L0 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); }
    ctx.lineTo(X(L1), box.b); ctx.lineTo(X(L0), box.b); ctx.closePath(); ctx.fillStyle = alpha(pal.liq, 0.18); ctx.fill();
    ctx.beginPath(); for (let l = L0; l <= L1; l += 0.5) { const y = Y(I.spec(l, L, d)); l === L0 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); } ctx.strokeStyle = pal.liq; ctx.lineWidth = 2.2; ctx.stroke();
    if (ion === 'eu3') { [[578, '⁵D₀→⁷F₀'], [591, '⁷F₁ (DM)'], [612, '⁷F₂ (DE)'], [700, '⁷F₄']].forEach(([l, t]) => label(ctx, t, X(l), Y(I.spec(l, L, d)) - 10, { color: pal.ink, align: 'center', size: 10, bg: alpha(pal.panel, 0.8) })); }
    if (ion === 'tb3') label(ctx, '⁵D₄→⁷F₅', X(543), Y(1) - 10, { color: pal.ink, align: 'center', size: 11 });
    root.querySelector('#em-L-v').textContent = `Λ ≈ ${fmt(L, 2)} (${hostName(L)})`;
    root.querySelector('#em-d-v').textContent = ion === 'eu3' ? fmt(d, 2) : 'só afeta o Eu³⁺';
    sD.disabled = ion !== 'eu3';
    const k = root.querySelector('#em-k'), v = root.querySelector('#em-v');
    if (ion === 'eu3') { k.textContent = 'R = I(⁷F₂)/I(⁷F₁)'; v.textContent = fmt(I.R(L, d), 1); }
    else if (I.peak) { k.textContent = 'pico da banda'; v.textContent = `${fmt(I.peak(L))} nm`; }
    else { k.textContent = 'pico principal'; v.textContent = '543 nm'; }
    root.querySelector('#em-kind').textContent = I.kind;
    VS.redraw();
  }
  function drawSw() {
    const { ctx, w, h } = VS; const L = +sL.value, d = +sD.value, I = ION[ion];
    const c = emissionRGB((l) => I.spec(l, L, d));
    ctx.fillStyle = '#0b0f10'; ctx.fillRect(0, 0, w, h);
    const r = Math.min(w, h) * 0.36, cx = w / 2, cy = h / 2;
    const vis = c.Y > 0.02 ? 1 : 0.15;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
    g.addColorStop(0, c.css); g.addColorStop(0.45, c.css.replace('rgb', 'rgba').replace(')', `,${0.6 * vis})`)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#d7dfdc'; ctx.font = '600 11px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'center';
    ctx.fillText(I.peak && I.peak(L) < 390 ? 'emissão quase toda no UV' : `x = ${fmt(c.x, 2)}, y = ${fmt(c.y, 2)}`, cx, h - 10);
  }
  [sL, sD].forEach((s) => s.addEventListener('input', draw));
}
