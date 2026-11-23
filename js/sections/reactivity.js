// Reatividade do fundido, do LSR e do vidro: difusividades e tempos característicos de um sodo-cálcico em função de T.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { GLASSES, fitVFT } from '../lib/props-data.js';

const R = 8.314, kB = 1.380649e-23;
export function init(root) {
  const cv = root.querySelector('#rx-canvas'), sT = root.querySelector('#rx-T'), list = root.querySelector('#rx-list');
  const fit = fitVFT(GLASSES[0]);
  const Tg = fit.Tat(12), TL = 1000; // °C (liquidus típico do float ≈ 1000 °C)
  // viscosidade: VFT acima de Tg; abaixo, Arrhenius "congelado" (isoestrutural) com ~3/4 da inclinação em Tg
  const slope = (fit.B / (Tg - fit.T0) ** 2) * (Tg + 273.15) ** 2; // d logη / d(1/T) em K
  const logEta = (T) => (T >= Tg ? fit.f(T) : 12 + slope * 0.75 * (1 / (T + 273.15) - 1 / (Tg + 273.15)));
  const SP = [
    { id: 'na', name: 'Na⁺ (íon modificador)', col: '--scl', D: (T) => 5e-4 * Math.exp(-80000 / (R * (T + 273.15))) * (T > Tg ? Math.exp(0.004 * (T - Tg)) : 1) },
    { id: 'h2o', name: 'H₂O molecular', col: '--glass', D: (T) => 1e-4 * Math.exp(-85000 / (R * (T + 273.15))) },
    { id: 'o2', name: 'O₂ dissolvido (redox)', col: '--cryst', D: (T) => 2.8e-4 * Math.exp(-112000 / (R * (T + 273.15))) },
    { id: 'net', name: 'Si e O da rede (Eyring)', col: '--liq', D: (T) => ((kB * (T + 273.15)) / (3e-10 * 10 ** logEta(T))) * 1e4 },
  ];
  const view = hiDPI(cv, () => draw());
  const col = (v) => { const p = document.createElement('i'); p.style.color = `var(${v})`; root.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  const tf = (s) => (s < 1e-3 ? `${fmt(s * 1e6, 0)} µs` : s < 1 ? `${fmt(s * 1e3, 0)} ms` : s < 120 ? `${fmt(s, 0)} s` : s < 7200 ? `${fmt(s / 60, 0)} min` : s < 172800 ? `${fmt(s / 3600, 0)} h` : s < 6.3e7 ? `${fmt(s / 86400, 0)} dias` : s < 3e10 ? `${fmt(s / 3.15e7, 0)} anos` : s < 3e13 ? `${fmt(s / 3.15e10, 0)} mil anos` : s < 4.4e17 ? `${fmt(s / 3.15e13, 0)} milhões de anos` : 'mais que a idade do Universo');
  function draw() {
    const { ctx, w, h } = view; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 52, r: w - 12, t: 28, b: h - 34 };
    const X = (T) => box.l + (T / 1600) * (box.r - box.l), Y = (lD) => box.b - ((lD + 24) / 20) * (box.b - box.t);
    ctx.fillStyle = alpha(pal.glass, 0.08); ctx.fillRect(box.l, box.t, X(Tg) - box.l, box.b - box.t);
    ctx.fillStyle = alpha(pal.scl, 0.1); ctx.fillRect(X(Tg), box.t, X(TL) - X(Tg), box.b - box.t);
    ctx.fillStyle = alpha(pal.liq, 0.1); ctx.fillRect(X(TL), box.t, box.r - X(TL), box.b - box.t);
    label(ctx, 'vidro', (box.l + X(Tg)) / 2, box.b - 12, { color: pal.glass, align: 'center', size: 12 });
    label(ctx, 'LSR', (X(Tg) + X(TL)) / 2, box.b - 12, { color: pal.scl, align: 'center', size: 12 });
    label(ctx, 'fundido', (X(TL) + box.r) / 2, box.b - 12, { color: pal.liq, align: 'center', size: 12 });
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 400, 800, 1200, 1600], yt: [-24, -20, -16, -12, -8, -4], yfmt: (v) => `10${String(v).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`, xl: 'T (°C)', yl: 'coeficiente de difusão D (cm²/s)' });
    label(ctx, `Tg ≈ ${fmt(Tg)} °C`, X(Tg) + 4, box.t + 8, { color: pal.ink, size: 11 });
    SP.forEach((s) => {
      const c = col(s.col); ctx.beginPath();
      let first = true;
      for (let T = 0; T <= 1600; T += 5) { const lD = Math.log10(s.D(T)); if (lD < -24) { first = true; continue; } const y = Y(lD); first ? ctx.moveTo(X(T), y) : ctx.lineTo(X(T), y); first = false; }
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.stroke();
    });
    const T = +sT.value; ctx.strokeStyle = pal.ink; ctx.beginPath(); ctx.moveTo(X(T), box.t); ctx.lineTo(X(T), box.b); ctx.stroke();
    SP.forEach((s) => { if (Math.log10(s.D(T)) < -24) return; const y = Y(Math.log10(s.D(T))); ctx.fillStyle = col(s.col); ctx.beginPath(); ctx.arc(X(T), y, 4.5, 0, 6.283); ctx.fill(); });
    // lista de tempos
    const eta = 10 ** logEta(T), tau = eta / 3e10;
    const reg = T < Tg ? 'vidro' : T < TL ? 'líquido super-resfriado' : 'fundido (acima do liquidus)';
    root.querySelector('#rx-T-v').textContent = `${fmt(T)} °C`;
    root.querySelector('#rx-reg').textContent = reg;
    root.querySelector('#rx-eta').textContent = `10^${fmt(logEta(T), 1)} Pa·s`;
    root.querySelector('#rx-tau').textContent = tf(tau);
    list.innerHTML = SP.map((s) => { const D = s.D(T); return `<tr><td><span class="dot" style="background:var(${s.col})"></span>${s.name}</td><td class="num">${tf(1e-8 / D)}</td><td class="num">${tf(1e-2 / D)}</td></tr>`; }).join('');
  }
  sT.addEventListener('input', draw);
}
