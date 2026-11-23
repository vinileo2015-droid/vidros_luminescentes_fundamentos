// Curvas de viscosidade de vidros comerciais ajustadas (VFT) aos pontos fixos Corning.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { GLASSES, REF, fitVFT, cssColor, segmented } from '../lib/props-data.js';

export function init(root) {
  const cv = root.querySelector('#vr-canvas');
  const fits = GLASSES.map((g) => ({ g, fit: fitVFT(g) }));
  let sel = 0, hoverT = null, geom = null;
  segmented(root.querySelector('#vr-pick'), GLASSES.map((g, i) => [i, g.name]), (i) => { sel = +i; draw(); info(); }, 0);
  const view = hiDPI(cv, () => draw());

  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560;
    const box = { l: 44, r: w - (narrow ? 12 : 150), t: 28, b: h - 34 };
    const T0 = 300, T1 = 1700;
    const X = (T) => box.l + ((T - T0) / (T1 - T0)) * (box.r - box.l);
    const Y = (lg) => box.b - ((lg - 0) / 15) * (box.b - box.t);
    geom = { X, Y, box, T0, T1 };
    // faixa de trabalho do vidro selecionado (entre 10³ e 10^6,65 Pa·s)
    const F = fits[sel].fit, c = cssColor(fits[sel].g.col);
    const tw = F.Tat(3), ts = F.Tat(6.65);
    ctx.fillStyle = alpha(c, 0.12);
    ctx.fillRect(X(Math.max(T0, ts)), box.t, X(Math.min(T1, tw)) - X(Math.max(T0, ts)), box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: [400, 600, 800, 1000, 1200, 1400, 1600], yt: [0, 3, 6, 9, 12, 15], xl: 'T (°C)', yl: 'log₁₀ η (Pa·s)' });
    // linhas de referência
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = pal.ink2; ctx.globalAlpha = 0.55;
    for (const r of REF) { ctx.beginPath(); ctx.moveTo(box.l, Y(r.log)); ctx.lineTo(box.r, Y(r.log)); ctx.stroke(); }
    ctx.restore();
    if (!narrow) for (const r of REF) label(ctx, `${r.name}`, box.r + 8, Y(r.log), { color: pal.ink2, size: 11, weight: 500 });
    // curvas
    fits.forEach(({ g, fit }, i) => {
      const col = cssColor(g.col);
      ctx.beginPath(); let first = true;
      for (let T = T0; T <= T1; T += 4) {
        const v = fit.f(T); if (T <= fit.T0 + 5 || v > 15.5 || v < -0.5) { first = true; continue; }
        const x = X(T), y = Y(v); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false;
      }
      ctx.strokeStyle = i === sel ? col : alpha(col, 0.45); ctx.lineWidth = i === sel ? 3 : 1.6; ctx.stroke();
      // pontos medidos
      const pts = [[g.strain, 13.5], [g.anneal, 12], [g.soften, 6.65]]; if (g.work) pts.push([g.work, 3]);
      for (const [T, lg] of pts) { ctx.beginPath(); ctx.arc(X(T), Y(lg), i === sel ? 4.5 : 3, 0, 6.283); ctx.fillStyle = i === sel ? col : alpha(col, 0.6); ctx.fill(); }
    });
    if (tw < T1 && ts > T0) label(ctx, 'faixa de trabalho', (X(ts) + X(Math.min(tw, T1))) / 2, box.t + 10, { color: c, align: 'center', size: 11, bg: alpha(pal.bg, 0.8) });
    // cursor
    if (hoverT != null) {
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(hoverT), box.t); ctx.lineTo(X(hoverT), box.b); ctx.stroke();
      const v = F.f(hoverT);
      if (v > 0 && v < 15) { ctx.beginPath(); ctx.arc(X(hoverT), Y(v), 5, 0, 6.283); ctx.fillStyle = c; ctx.fill(); label(ctx, `${fmt(hoverT)} °C → η ≈ 10^${fmt(v, 1)} Pa·s`, X(hoverT) + (X(hoverT) > (box.l + box.r) / 2 ? -8 : 8), Y(v) - 14, { color: pal.ink, align: X(hoverT) > (box.l + box.r) / 2 ? 'right' : 'left', size: 12, bg: alpha(pal.panel, 0.9) }); }
    }
  }
  function info() {
    const { g, fit } = fits[sel];
    const q = (k) => root.querySelector(k);
    q('#vr-a').textContent = `${fmt(fit.Tat(12))} °C`;
    q('#vr-s').textContent = `${fmt(fit.Tat(6.65))} °C`;
    const tw = fit.Tat(3);
    q('#vr-w').textContent = g.work ? `${fmt(tw)} °C` : `≈ ${fmt(tw)} °C*`;
    q('#vr-range').textContent = `${fmt(tw - fit.Tat(6.65))} K`;
    q('#vr-m').textContent = fmt(fit.m, 0);
    q('#vr-vft').textContent = `log η = ${fmt(fit.A, 2)} + ${fmt(fit.B, 0)}/(T − ${fmt(fit.T0, 0)})`;
    const range = tw - fit.Tat(6.65);
    q('#vr-note').textContent = `${g.name} (${g.code}). ${range > 330 ? 'Vidro "longo": a viscosidade varia devagar com T e dá tempo para moldar.' : range < 260 ? 'Vidro "curto": endurece depressa ao esfriar, bom para máquinas rápidas.' : 'Comprimento intermediário.'} Fragilidade estimada m ≈ ${fmt(fit.m, 0)}.${g.work ? '' : ' * Sem ponto de trabalho medido: o valor é uma extrapolação do ajuste.'}`;
  }
  cv.addEventListener('pointermove', (e) => {
    if (!geom) return;
    const r = cv.getBoundingClientRect(); const x = e.clientX - r.left;
    const T = geom.T0 + ((x - geom.box.l) / (geom.box.r - geom.box.l)) * (geom.T1 - geom.T0);
    hoverT = T >= geom.T0 && T <= geom.T1 ? T : null; draw();
  });
  cv.addEventListener('pointerleave', () => { hoverT = null; draw(); });
  info();
}
