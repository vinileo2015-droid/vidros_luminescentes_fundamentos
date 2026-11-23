// Choque térmico: ΔT_max = σ_f (1 − ν) / (E α) para os vidros Corning.
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';
import { GLASSES, cssColor } from '../lib/props-data.js';

export function init(root) {
  const cv = root.querySelector('#sh-canvas');
  const sS = root.querySelector('#sh-s'), sD = root.querySelector('#sh-dT'), cT = root.querySelector('#sh-temp');
  const view = hiDPI(cv, () => draw());
  const dTmax = (g, s) => (s * 1e6 * (1 - g.nu)) / (g.E * 1e9 * g.alpha * 1e-7);
  function cracks(ctx, x, y, w, h, seed, col) {
    let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      let px = x + rnd() * w, py = y + (rnd() < 0.5 ? 0 : h); ctx.beginPath(); ctx.moveTo(px, py);
      for (let j = 0; j < 5; j++) { px += (rnd() - 0.5) * w * 0.5; py += (py <= y + 1 ? 1 : -1) * rnd() * h * 0.35; px = Math.max(x, Math.min(x + w, px)); py = Math.max(y, Math.min(y + h, py)); ctx.lineTo(px, py); }
      ctx.stroke();
    }
  }
  function draw() {
    const { ctx, w, h } = view; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const s = +sS.value + (cT.checked ? 100 : 0), dT = +sD.value;
    const n = GLASSES.length, box = { l: 50, r: w - 14, t: 64, b: h - 46 };
    const ymax = 1200, lg = (v) => Math.log10(Math.max(10, v));
    const Y = (v) => box.b - ((lg(v) - 1) / (lg(ymax) - 1)) * (box.b - box.t);
    ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.fillStyle = pal.ink2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [10, 30, 100, 300, 1000].forEach((v) => { ctx.fillText(String(v), box.l - 6, Y(v)); ctx.strokeStyle = alpha(pal.rule, 0.7); ctx.beginPath(); ctx.moveTo(box.l, Y(v) + 0.5); ctx.lineTo(box.r, Y(v) + 0.5); ctx.stroke(); });
    label(ctx, 'ΔT máximo suportado (K), escala log', box.l - 40, 14, { color: pal.ink, size: 12 });
    const bw = (box.r - box.l) / n;
    GLASSES.forEach((g, i) => {
      const v = dTmax(g, s), x = box.l + i * bw + bw * 0.2, ww = bw * 0.6, col = cssColor(g.col);
      const fail = dT > v;
      ctx.fillStyle = alpha(col, fail ? 0.35 : 0.85); ctx.fillRect(x, Y(Math.min(v, ymax)), ww, box.b - Y(Math.min(v, ymax)));
      label(ctx, fmt(v, 0), x + ww / 2, Y(Math.min(v, ymax)) - 9, { color: pal.ink, align: 'center', size: 12 });
      // placa
      const px = x, py = 30, ph = 22;
      ctx.fillStyle = alpha(col, 0.25); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.fillRect(px, py, ww, ph); ctx.strokeRect(px, py, ww, ph);
      if (fail) cracks(ctx, px, py, ww, ph, 17 + i * 31, pal.ink);
      const SHORT = { sl: 'Sodo-cálc.', pb: 'Chumbo', al: 'Al-silic.', bs: 'Boross.', vy: '96 % SiO₂', si: 'SiO₂' };
      const short = w < 600 ? SHORT[g.id] : g.name.replace(' (Pyrex)', '').replace(' (K–Na–Pb)', '').replace(' (Vycor)', '');
      label(ctx, short, x + ww / 2, box.b + 14, { color: pal.ink, align: 'center', size: w < 600 ? 9.5 : 12, weight: 600 });
      label(ctx, `α ${fmt(g.alpha, 1)}`, x + ww / 2, box.b + 30, { color: pal.ink2, align: 'center', size: 10, weight: 500 });
    });
    ctx.strokeStyle = pal.liq; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(box.l, Y(dT)); ctx.lineTo(box.r, Y(dT)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, `choque aplicado: ${fmt(dT)} K`, box.r, Y(dT) - 9, { color: pal.liq, align: 'right', size: 12, bg: alpha(pal.panel, 0.85) });
    root.querySelector('#sh-s-v').textContent = `${fmt(+sS.value)} MPa${cT.checked ? ' + 100' : ''}`;
    root.querySelector('#sh-dT-v').textContent = `${fmt(dT)} K`;
    const ok = GLASSES.filter((g) => dTmax(g, s) >= dT).map((g) => g.name.split(' (')[0]);
    root.querySelector('#sh-out').textContent = ok.length === n ? 'Todos os vidros sobrevivem a esse choque.' : ok.length ? `Sobrevivem: ${ok.join(', ')}.` : 'Nenhum vidro sobrevive: até a sílica trinca.';
  }
  [sS, sD].forEach((x) => x.addEventListener('input', draw)); cT.addEventListener('change', draw);
}
