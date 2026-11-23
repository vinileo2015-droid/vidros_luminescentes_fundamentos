// Janelas de transmissão (escala log em λ) e energia máxima de fônon por tipo de vidro.
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';

const WIN = [
  ['Sílica vítrea', 0.16, 4.0, 'Óxido'], ['Sodo-cálcico', 0.31, 4.5, 'Óxido'], ['Telurito', 0.4, 6, 'Óxido'],
  ['ZBLAN', 0.22, 7, 'Haleto'], ['Sulfeto (As₂S₃)', 0.6, 10, 'Calcogeneto'], ['Seleneto (As₂Se₃)', 0.9, 15, 'Calcogeneto'],
  ['Telureto', 2, 20, 'Calcogeneto'], ['Vidro metálico', null, null, 'Metálico'],
];
const PH = [
  ['Borato', 1400], ['Fosfato', 1200], ['Silicato', 1100], ['Germanato', 900], ['Telurito', 750],
  ['Fluoreto (ZBLAN)', 580], ['Sulfeto', 400], ['Seleneto', 280],
];
const GAP = 3500; // cm⁻¹, gap ilustrativo entre dois níveis de um íon

export function init(root) {
  const cw = root.querySelector('#opt-win'), cp = root.querySelector('#opt-ph');
  const vw = hiDPI(cw, () => drawWin());
  const vp = hiDPI(cp, () => drawPh());

  function drawWin() {
    const { ctx, w, h } = vw; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const labW = Math.min(130, w * 0.36);
    const l = labW + 8, r = w - 10, t = 26, b = h - 26;
    const lo = Math.log10(0.1), hi = Math.log10(25);
    const X = (v) => l + ((Math.log10(v) - lo) / (hi - lo)) * (r - l);
    // visível
    const g = ctx.createLinearGradient(X(0.38), 0, X(0.75), 0);
    ['#7b3fbf', '#3b6fe0', '#2fb35a', '#e8d23a', '#e8862a', '#d6332e'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.globalAlpha = 0.22; ctx.fillStyle = g; ctx.fillRect(X(0.38), t - 6, X(0.75) - X(0.38), b - t + 6); ctx.globalAlpha = 1;
    ctx.fillStyle = alpha(pal.ink2, 0.08);
    ctx.fillRect(X(3), t - 6, X(5) - X(3), b - t + 6); ctx.fillRect(X(8), t - 6, X(12) - X(8), b - t + 6);
    label(ctx, 'visível', (X(0.38) + X(0.75)) / 2, t - 14, { color: pal.ink2, size: 11, weight: 500, align: 'center' });
    const rowH = (b - t) / WIN.length;
    WIN.forEach(([name, a0, a1, fam], i) => {
      const y = t + i * rowH + rowH / 2;
      label(ctx, name, labW, y, { color: pal.ink, size: 12, weight: 600, align: 'right' });
      if (a0 === null) { label(ctx, 'opaco em todo o espectro', l + 4, y, { color: pal.ink2, size: 11, weight: 500 }); return; }
      const col = fam === 'Óxido' ? pal.glass : fam === 'Haleto' ? pal.cryst : pal.scl;
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(X(a0), y - rowH * 0.28, X(a1) - X(a0), rowH * 0.56, 4); ctx.fill();
    });
    ctx.strokeStyle = pal.ink2; ctx.beginPath(); ctx.moveTo(l, b); ctx.lineTo(r, b); ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0.1, 0.3, 1, 3, 10].forEach((v) => { ctx.fillText(String(v).replace('.', ','), X(v), b + 5); });
    label(ctx, 'λ (µm)', r, b + 5, { color: pal.ink2, size: 11, weight: 600, align: 'right', base: 'top' });
  }

  function drawPh() {
    const { ctx, w, h } = vp; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const labW = Math.min(120, w * 0.34);
    const l = labW + 8, r = w - 60, t = 26, b = h - 26;
    const X = (v) => l + (v / 1500) * (r - l);
    label(ctx, 'ħω máx. (cm⁻¹)', l, 10, { color: pal.ink, size: 12 });
    label(ctx, w < 420 ? 'nº fônons' : `nº de fônons p/ ${fmt(GAP)} cm⁻¹`, w - 4, 10, { color: pal.ink2, size: 11, weight: 500, align: 'right' });
    const rowH = (b - t) / PH.length;
    PH.forEach(([name, e], i) => {
      const y = t + i * rowH + rowH / 2;
      const p = Math.ceil(GAP / e);
      label(ctx, name, labW, y, { color: pal.ink, size: 12, weight: 600, align: 'right' });
      ctx.fillStyle = p >= 6 ? pal.glass : alpha(pal.ink2, 0.55);
      ctx.beginPath(); ctx.roundRect(l, y - rowH * 0.28, X(e) - l, rowH * 0.56, 4); ctx.fill();
      label(ctx, `~${fmt(e)}`, X(e) + 5, y, { color: pal.ink2, size: 11, weight: 500 });
      label(ctx, `${p}`, w - 6, y, { color: p >= 6 ? pal.glass : pal.ink2, size: 12, weight: 700, align: 'right' });
    });
    label(ctx, 'em destaque: ≥ 6 fônons (decaimento não radiativo lento)', 8, b + 12, { color: pal.glass, size: 11, weight: 500, base: 'top' });
  }
}
