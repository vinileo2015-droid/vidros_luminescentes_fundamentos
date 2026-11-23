// Clipe: vidro fotocrômico de haleto de prata. UV cria aglomerados de Ag⁰ (escurece); no escuro, eles se desfazem.
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';
import { Clip } from '../lib/clip.js';

const DUR = 16, ON = 1.5, OFF = 7.5;
const Tof = (t) => { // transmitância visível (fração)
  const T0 = 0.9, Tmin = 0.22;
  if (t < ON) return T0;
  const dark = (tt) => Tmin + (T0 - Tmin) * Math.exp(-tt / 1.1);
  if (t < OFF) return dark(t - ON);
  const Toff = dark(OFF - ON); return T0 - (T0 - Toff) * Math.exp(-(t - OFF) / 2.8);
};
export function init(root) {
  const cv = root.querySelector('#pc-canvas');
  let tNow = 0;
  const view = hiDPI(cv, () => draw(tNow));
  // aglomerados determinísticos
  const sites = Array.from({ length: 26 }, (_, i) => ({ a: (i * 2.399) % 6.283, r: 0.25 + ((i * 0.618) % 0.65) }));
  function draw(t) {
    tNow = t;
    const { ctx, w, h } = view; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const uv = t >= ON && t < OFF, T = Tof(t), dark = (0.9 - T) / 0.68;
    const narrow = w < 600;
    // 1) lente
    const lr = Math.min(w * (narrow ? 0.1 : 0.09), h * 0.28), lx = narrow ? lr + 46 : Math.max(lr + 70, w * 0.15), ly = h * 0.42;
    ctx.fillStyle = `rgba(60,62,66,${0.08 + 0.75 * dark})`; ctx.beginPath(); ctx.ellipse(lx, ly, lr, lr * 0.82, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, `T visível ≈ ${fmt(T * 100, 0)} %`, lx, ly + lr + 18, { color: pal.ink, align: 'center', size: 12 });
    if (uv) { for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let j = 0; j < 30; j++) { const x = lx - lr - 50 + j * 2.2, y = ly - lr * 0.6 + k * lr * 0.6 + Math.sin(j * 0.9 - t * 14) * 4; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.strokeStyle = pal.cryst; ctx.lineWidth = 1.6; ctx.stroke(); } label(ctx, 'UV', lx - lr - 40, ly - lr - 6, { color: pal.cryst, size: 12 }); }
    // 2) cristalito de AgCl ampliado
    const cx = narrow ? w * 0.7 : w * 0.43, cy = h * 0.42, cr = Math.min(narrow ? w * 0.17 : w * 0.13, h * 0.34);
    ctx.fillStyle = alpha(pal.glass, 0.12); ctx.fillRect(cx - cr * 1.5, cy - cr * 1.25, cr * 3, cr * 2.5);
    ctx.fillStyle = alpha(pal.scl, 0.25); ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; ctx.lineTo(cx + cr * Math.cos(a), cy + cr * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = pal.scl; ctx.stroke();
    label(ctx, 'AgCl (~10 nm)', cx, cy - cr - 10, { color: pal.scl, align: 'center', size: 11 });
    label(ctx, 'vidro (borossilicato)', cx - cr * 1.45, cy + cr * 1.18, { color: pal.glass, size: 10, weight: 500 });
    const n = Math.round(sites.length * dark);
    sites.forEach((s, i) => { if (i >= n) return; const x = cx + Math.cos(s.a) * s.r * cr * 0.8, y = cy + Math.sin(s.a) * s.r * cr * 0.8; ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, 6.283); ctx.fill(); });
    if (n > 2) label(ctx, 'Ag⁰ₙ', cx + cr * 0.3, cy + cr * 0.15, { color: pal.ink, size: 12, bg: alpha(pal.panel, 0.7) });
    // Cu⁺/Cu²⁺
    const cuOx = uv ? Math.min(1, (t - ON) / 1.2) : Math.max(0, dark);
    ctx.fillStyle = cuOx > 0.5 ? pal.glass : pal.cryst; ctx.beginPath(); ctx.arc(cx - cr * 0.55, cy - cr * 0.45, 6, 0, 6.283); ctx.fill();
    label(ctx, cuOx > 0.5 ? 'Cu²⁺' : 'Cu⁺', cx - cr * 0.55 + 10, cy - cr * 0.45, { color: pal.ink, size: 11 });
    // 3) curva T(t)
    if (!narrow) {
      const bx = w * 0.64, bw = w * 0.33, by = h * 0.12, bh = h * 0.62;
      ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.stroke();
      ctx.fillStyle = alpha(pal.cryst, 0.1); ctx.fillRect(bx + (ON / DUR) * bw, by, ((OFF - ON) / DUR) * bw, bh);
      label(ctx, 'UV ligado', bx + ((ON + OFF) / 2 / DUR) * bw, by + 10, { color: pal.cryst, align: 'center', size: 11 });
      ctx.beginPath(); for (let tt = 0; tt <= t; tt += 0.05) { const x = bx + (tt / DUR) * bw, y = by + bh - Tof(tt) * bh; tt ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.strokeStyle = pal.ink; ctx.lineWidth = 2.5; ctx.stroke();
      label(ctx, 'transmitância', bx, by - 10, { color: pal.ink, size: 11 }); label(ctx, 'tempo', bx + bw, by + bh + 12, { color: pal.ink2, align: 'right', size: 11 });
    }
  }
  new Clip(root.querySelector('#pc-clip'), {
    duration: DUR, label: 'fotocromismo', loop: true,
    chapters: [
      { t: 0, text: 'No escuro: cristalitos de AgCl de ~10 nm, menores que o comprimento de onda, não espalham. O vidro é claro.' },
      { t: ON, text: 'UV entra: Cl⁻ + hν → Cl⁰ + e⁻. O elétron reduz Ag⁺ a Ag⁰, e o buraco é capturado pelo Cu⁺, que vira Cu²⁺.' },
      { t: ON + 2.5, text: 'Os átomos de prata se juntam em aglomerados que absorvem em todo o visível: a lente escurece.' },
      { t: OFF, text: 'UV desligado: o Cu²⁺ devolve o buraco e a prata volta a Ag⁺. O clareamento é mais lento e acelera com a temperatura.' },
    ],
    render: (t) => draw(t),
  });
}
