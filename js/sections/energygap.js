// Lei do gap de energia: W_mp = B·exp(−α ΔE)·[1 − exp(−ħω/kT)]^(−ΔE/ħω). Eficiência quântica por matriz.
import { hiDPI, palette, alpha, axes, label, fmt, visibility, reducedMotion, color } from '../lib/ui.js';

// B (s⁻¹), α (cm), ħω (cm⁻¹): Layne, Lowdermilk & Weber, Phys. Rev. B 16, 10 (1977); fluoreto: Shinn et al., Phys. Rev. B 27, 6635 (1983).
const HOSTS = [
  { id: 'b', name: 'Borato', B: 2.9e12, a: 3.8e-3, hw: 1400, col: '--liq' },
  { id: 'p', name: 'Fosfato', B: 5.4e12, a: 4.7e-3, hw: 1200, col: '--scl' },
  { id: 's', name: 'Silicato', B: 1.4e12, a: 4.7e-3, hw: 1100, col: '--glass' },
  { id: 'g', name: 'Germanato', B: 3.4e10, a: 4.9e-3, hw: 900, col: '--cryst' },
  { id: 't', name: 'Telurito', B: 6.3e10, a: 4.7e-3, hw: 700, col: '--cond' },
  { id: 'f', name: 'Fluoreto (ZBLAN)', B: 1.59e10, a: 5.19e-3, hw: 500, col: '--nuc' },
];
const TR = [
  { id: 'er15', name: 'Er³⁺ ⁴I₁₃/₂ → ⁴I₁₅/₂ (1,53 µm)', gap: 6500, A: 100 },
  { id: 'nd', name: 'Nd³⁺ ⁴F₃/₂ → ⁴I (1,06 µm)', gap: 5400, A: 2500 },
  { id: 'ho', name: 'Ho³⁺ ⁵I₇ → ⁵I₈ (2,0 µm)', gap: 5100, A: 100 },
  { id: 'tm', name: 'Tm³⁺ ³H₄ (1,47 µm)', gap: 4300, A: 700 },
  { id: 'er11', name: 'Er³⁺ ⁴I₁₁/₂ (nível de bombeio, 980 nm)', gap: 3600, A: 100 },
  { id: 'er5', name: 'Er³⁺ ⁴S₃/₂ (verde, 545 nm)', gap: 3100, A: 1500 },
  { id: 'pr', name: 'Pr³⁺ ¹G₄ (1,3 µm)', gap: 3000, A: 800 },
  { id: 'eu', name: 'Eu³⁺ ⁵D₀ (vermelho, 612 nm)', gap: 12300, A: 500 },
];
const kcm = 0.695; // k_B em cm⁻¹/K
const W = (h, gap, T) => { const p = gap / h.hw, n = 1 / (Math.exp(h.hw / (kcm * T)) - 1); return h.B * Math.exp(-h.a * gap) * (n + 1) ** p; };

export function init(root) {
  const c1 = root.querySelector('#eg-plot'), c2 = root.querySelector('#eg-ladder'), sT = root.querySelector('#eg-T'), tb = root.querySelector('#eg-table');
  const selT = root.querySelector('#eg-tr'), selH = root.querySelector('#eg-host');
  TR.forEach((t, i) => { const o = document.createElement('option'); o.value = i; o.textContent = t.name; selT.appendChild(o); });
  HOSTS.forEach((h, i) => { const o = document.createElement('option'); o.value = i; o.textContent = h.name; selH.appendChild(o); });
  selH.value = 2;
  const V1 = hiDPI(c1, () => d1()), V2 = hiDPI(c2, () => d2(0));
  function d1() {
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 52, r: w - 12, t: 28, b: h - 34 };
    const X = (g) => box.l + (g / 8000) * (box.r - box.l), Y = (v) => box.b - ((Math.log10(Math.max(v, 1e-4)) + 4) / 16) * (box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 2000, 4000, 6000, 8000], yt: [1e-4, 1, 1e4, 1e8, 1e12], yfmt: (v) => `10${String(Math.round(Math.log10(v))).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`, xl: 'gap até o nível de baixo ΔE (cm⁻¹)', yl: 'taxa multifônon Wmp (s⁻¹)' });
    const tr = TR[+selT.value], T = +sT.value;
    ctx.fillStyle = alpha(pal.ink, 0.08); ctx.fillRect(box.l, Y(tr.A * 3), box.r - box.l, Y(tr.A / 3) - Y(tr.A * 3));
    label(ctx, `taxa radiativa ≈ ${fmt(tr.A)} s⁻¹`, box.r - 4, Y(tr.A) - 14, { color: pal.ink, align: 'right', size: 11 });
    HOSTS.forEach((hh, i) => {
      const c = color(hh.col); ctx.beginPath();
      for (let g = 0; g <= 8000; g += 50) { const y = Y(W(hh, g, T)); g ? ctx.lineTo(X(g), y) : ctx.moveTo(X(g), y); }
      ctx.strokeStyle = c; ctx.lineWidth = i === +selH.value ? 3.2 : 1.6; ctx.stroke();
      const gl = 300 + i * 1050; label(ctx, hh.name.split(' ')[0], X(gl) + 4, Y(W(hh, gl, T)) - 2, { color: c, size: 11, bg: alpha(pal.panel, 0.75) });
    });
    const gx = Math.min(tr.gap, 8000);
    ctx.strokeStyle = pal.ink; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(gx), box.t); ctx.lineTo(X(gx), box.b); ctx.stroke(); ctx.setLineDash([]);
    if (tr.gap > 8000) label(ctx, `ΔE = ${fmt(tr.gap)} cm⁻¹ (fora do gráfico →)`, box.r - 4, box.t + 8, { color: pal.ink, align: 'right', size: 11 });
    // tabela
    tb.innerHTML = HOSTS.map((hh, i) => { const wm = W(hh, tr.gap, T), eta = tr.A / (tr.A + wm), p = tr.gap / hh.hw; return `<tr${i === +selH.value ? ' class="cur"' : ''}><td><span class="dot" style="background:var(${hh.col})"></span>${hh.name}</td><td class="num">${fmt(hh.hw)}</td><td class="num">${fmt(p, 1)}</td><td class="num">${wm < 0.01 ? '< 0,01' : wm > 1e6 ? wm.toExponential(1).replace('.', ',').replace('e+', '·10^') : fmt(wm, wm < 10 ? 2 : 0)}</td><td class="num"><b>${fmt(100 * eta, eta > 0.995 ? 1 : 0)} %</b></td></tr>`; }).join('');
    root.querySelector('#eg-T-v').textContent = `${fmt(T)} K`;
  }
  // escada de fônons animada
  let events = [], last = 0, acc = 0, vis = false, raf = null;
  function d2(dt) {
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const hh = HOSTS[+selH.value], tr = TR[+selT.value], T = +sT.value;
    const wm = W(hh, tr.gap, T), eta = tr.A / (tr.A + wm), p = Math.round(tr.gap / hh.hw);
    const top = 40, bot = h - 34, xl = 70, xr = w * 0.72;
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xl, top); ctx.lineTo(xr, top); ctx.moveTo(xl, bot); ctx.lineTo(xr, bot); ctx.stroke();
    label(ctx, 'nível emissor', xl, top - 14, { color: pal.ink, size: 11 }); label(ctx, 'nível de baixo', xl, bot + 16, { color: pal.ink, size: 11 });
    // degraus de fônons
    const steps = Math.max(1, Math.min(30, p)), stepH = (bot - top) / steps, c = color(hh.col);
    for (let i = 1; i < steps; i++) { ctx.strokeStyle = alpha(c, 0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xr - 60, top + i * stepH); ctx.lineTo(xr - 10, top + i * stepH); ctx.stroke(); }
    label(ctx, `${p} fônons de ${fmt(hh.hw)} cm⁻¹`, xr + 4, (top + bot) / 2, { color: c, size: 11 });
    // eventos
    if (dt > 0) { acc += dt; if (acc > 0.55) { acc = 0; events.push({ t: 0, rad: Math.random() < eta }); } }
    events.forEach((e) => (e.t += dt));
    events = events.filter((e) => e.t < 1.6);
    for (const e of events) {
      const f = Math.min(1, e.t / 1.1);
      if (e.rad) {
        const x = xl + 60, y = top + f * (bot - top);
        ctx.strokeStyle = pal.liq; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, y); ctx.stroke();
        // fóton ondulado saindo
        ctx.beginPath(); for (let k = 0; k < 24; k++) { const xx = x + 10 + k * 3 + f * 30, yy = (top + bot) / 2 + Math.sin(k * 0.8 - e.t * 12) * 5; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.strokeStyle = alpha(pal.liq, 1 - Math.max(0, e.t - 1) * 1.6); ctx.stroke();
      } else {
        const k = Math.min(steps, Math.floor(f * steps)); const x = xr - 35;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, top + k * stepH, 5, 0, 6.283); ctx.fill();
        for (let i = 0; i < k; i++) { ctx.strokeStyle = alpha(c, 0.7); ctx.beginPath(); ctx.moveTo(x + 8, top + i * stepH + stepH / 2); for (let j = 0; j < 6; j++) ctx.lineTo(x + 12 + j * 4, top + i * stepH + stepH / 2 + (j % 2 ? 3 : -3)); ctx.stroke(); }
      }
    }
    label(ctx, `${hh.name}: η ≈ ${fmt(100 * eta, eta > 0.995 ? 1 : 0)} %`, w - 8, top - 14, { color: pal.ink, align: 'right', size: 13, weight: 700 });
    label(ctx, 'emite luz', xl + 54, (top + bot) / 2 - 22, { color: pal.liq, align: 'right', size: 11 });
    label(ctx, 'vira calor', xr + 4, (top + bot) / 2 + 18, { color: c, size: 11 });
  }
  const loop = (now) => { raf = null; if (!vis) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; d2(dt); raf = requestAnimationFrame(loop); };
  visibility(c2, (v) => { vis = v && !reducedMotion(); if (vis && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } });
  const all = () => { V1.redraw(); if (!vis) d2(0); };
  [selT, selH].forEach((s) => s.addEventListener('change', () => { events = []; all(); })); sT.addEventListener('input', all);
}
