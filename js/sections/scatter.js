// Espalhamento: partículas (Rayleigh → Mie, via aproximação de difração anômala) e perdas de uma fibra de sílica.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { transmittedRGB, emissionRGB, planck, lambdaRGB } from '../lib/color.js';
import { segmented } from '../lib/props-data.js';

export function init(root) {
  const cv = root.querySelector('#sc-canvas'), sw = root.querySelector('#sc-sw');
  const pPart = root.querySelector('#sc-part'), pFib = root.querySelector('#sc-fib');
  const sR = root.querySelector('#sc-r'), sN = root.querySelector('#sc-dn'), sF = root.querySelector('#sc-phi');
  const sTf = root.querySelector('#sc-tf'), sOH = root.querySelector('#sc-oh'), cGe = root.querySelector('#sc-ge');
  let mode = 'part';
  segmented(root.querySelector('#sc-mode'), [['part', 'Partículas e opalescência'], ['fib', 'Fibra óptica de sílica']], (m) => { mode = m; pPart.hidden = m !== 'part'; pFib.hidden = m !== 'fib'; sw.parentElement.hidden = m !== 'part'; draw(); }, 'part');
  const V = hiDPI(cv, () => draw()), VS = hiDPI(sw, () => drawSw());
  const n0 = 1.5;
  const tau = (l) => { // cm⁻¹
    const r = 10 ** +sR.value, dn = +sN.value, phi = 10 ** +sF.value, m = (n0 + dn) / n0;
    const x = (2 * Math.PI * r * n0) / l, LL = ((m * m - 1) / (m * m + 2)) ** 2;
    const QR = (8 / 3) * x ** 4 * LL, rho = 2 * x * (m - 1);
    const QA = rho < 1e-3 ? rho * rho / 2 : 2 - (4 / rho) * Math.sin(rho) + (4 / (rho * rho)) * (1 - Math.cos(rho));
    const Q = 1 / (1 / QR + 1 / QA);
    return (phi * 3 * Q) / (4 * r * 1e-7);
  };
  const d = 0.5; // cm (5 mm)
  function draw() {
    const { ctx, w, h } = V; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 52, r: w - 12, t: 28, b: h - 40 };
    if (mode === 'part') {
      const L0 = 380, L1 = 780; let mx = 0; for (let l = L0; l <= L1; l += 5) mx = Math.max(mx, tau(l));
      const lo = Math.floor(Math.log10(Math.max(1e-4, mx))) - 2, hi = lo + 3;
      const X = (l) => box.l + ((l - L0) / (L1 - L0)) * (box.r - box.l), Y = (t) => box.b - ((Math.log10(Math.max(t, 10 ** lo)) - lo) / (hi - lo)) * (box.b - box.t);
      for (let l = 380; l < 780; l += 4) { ctx.fillStyle = lambdaRGB(l); ctx.fillRect(X(l), box.b + 2, X(l + 4) - X(l) + 0.5, 6); }
      const yt = []; for (let e = lo; e <= hi; e++) yt.push(10 ** e);
      axes(ctx, box, { x: X, y: Y, pal, xt: [400, 500, 600, 700], yt, yfmt: (v) => `10${String(Math.round(Math.log10(v))).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`, xl: 'λ (nm)', yl: 'coeficiente de espalhamento τ (cm⁻¹), log' });
      ctx.beginPath(); for (let l = L0; l <= L1; l += 4) { const y = Y(tau(l)); l === L0 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); } ctx.strokeStyle = pal.cryst; ctx.lineWidth = 3; ctx.stroke();
      const nexp = -Math.log(tau(650) / tau(450)) / Math.log(650 / 450);
      const r = 10 ** +sR.value;
      label(ctx, `τ ∝ λ⁻ⁿ com n ≈ ${fmt(nexp, 1)}  ·  ${nexp > 3.3 ? 'regime de Rayleigh' : nexp > 1 ? 'transição (Mie)' : 'partículas grandes: espalhamento quase neutro'}`, box.r, box.t + 6, { color: pal.ink, align: 'right', size: 12, bg: alpha(pal.panel, 0.85) });
      root.querySelector('#sc-r-v').textContent = r >= 1000 ? `${fmt(r / 1000, 2)} µm` : `${fmt(r)} nm`;
      root.querySelector('#sc-dn-v').textContent = fmt(+sN.value, 3);
      root.querySelector('#sc-phi-v').textContent = `${fmt(100 * 10 ** +sF.value, 3)} %`;
      VS.redraw();
    } else {
      const Tf = +sTf.value, OH = 10 ** +sOH.value, ge = cGe.checked;
      const A = 0.70 * (Tf / 1500) * (ge ? 1.3 : 1);
      const ray = (lu) => A / lu ** 4, ir = (lu) => 7.81e11 * Math.exp(-48.48 / lu), uv = (lu) => 1.1e-3 * Math.exp(4.63 / lu);
      const oh = (lu) => OH * (62 / (1 + ((lu - 1.383) / 0.012) ** 2) + 2.5 / (1 + ((lu - 1.24) / 0.015) ** 2) + 1 / (1 + ((lu - 0.945) / 0.012) ** 2));
      const tot = (lu) => ray(lu) + ir(lu) + uv(lu) + oh(lu);
      const X = (l) => box.l + ((l - 0.6) / 1.2) * (box.r - box.l), Y = (v) => box.b - ((Math.log10(Math.max(v, 0.01)) + 2) / 4) * (box.b - box.t);
      axes(ctx, box, { x: X, y: Y, pal, xt: [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8], yt: [0.01, 0.1, 1, 10, 100], xfmt: (v) => fmt(v, 1), yfmt: (v) => fmt(v, v < 1 ? 2 : 0), xl: 'λ (µm)', yl: 'atenuação (dB/km), log' });
      [[1.31, 'banda O'], [1.55, 'banda C']].forEach(([l, t]) => { ctx.fillStyle = alpha(pal.glass, 0.1); ctx.fillRect(X(l - 0.04), box.t, X(l + 0.04) - X(l - 0.04), box.b - box.t); label(ctx, t, X(l), box.t + 8, { color: pal.glass, align: 'center', size: 11 }); });
      const line = (f, col, lw, dash) => { ctx.save(); ctx.setLineDash(dash || []); ctx.beginPath(); for (let l = 0.6; l <= 1.8; l += 0.002) { const y = Y(f(l)); l === 0.6 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); } ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); };
      line(ray, pal.cryst, 1.5, [5, 4]); line(ir, pal.liq, 1.5, [5, 4]); line(tot, pal.ink, 3);
      let best = 9, bl = 0; for (let l = 1.2; l <= 1.75; l += 0.001) { const v = tot(l); if (v < best) { best = v; bl = l; } }
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(bl), Y(best), 5, 0, 6.283); ctx.fill();
      label(ctx, `mínimo: ${fmt(best, 3)} dB/km em ${fmt(bl * 1000)} nm`, X(bl), Y(best) + 18, { color: pal.ink, align: 'center', size: 12, bg: alpha(pal.panel, 0.85) });
      label(ctx, 'Rayleigh ∝ Tf/λ⁴', X(0.66), Y(ray(0.66)) - 10, { color: pal.cryst, size: 11 });
      label(ctx, 'multifônon (Si–O)', X(1.78), Y(ir(1.78)) - 10, { color: pal.liq, align: 'right', size: 11 });
      const km = 10 / best;
      root.querySelector('#sc-tf-v').textContent = `${fmt(Tf)} K`;
      root.querySelector('#sc-oh-v').textContent = `${fmt(OH, OH < 1 ? 2 : 1)} ppm`;
      root.querySelector('#sc-fib-out').textContent = `Com ${fmt(best, 3)} dB/km, a luz perde metade da potência a cada ${fmt(3.01 / best, 0)} km e 90 % em ${fmt(km, 0)} km. Uma janela de vidro comum (~10³ dB/km no IV próximo) perderia 90 % em ~10 m.`;
    }
  }
  function drawSw() {
    const { ctx, w, h } = VS; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const tr = transmittedRGB((l) => Math.exp(-tau(l) * d));
    const sc = emissionRGB((l) => planck(l, 6504) * (1 - Math.exp(-tau(l) * d)));
    const strength = Math.min(1, 1 - tr.Y);
    const half = (w - 30) / 2;
    ctx.fillStyle = '#20262a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = tr.css; ctx.fillRect(10, 26, half, h - 36);
    const [r, g, b] = sc.rgb; ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + 0.85 * strength})`; ctx.fillRect(20 + half, 26, half, h - 36);
    label(ctx, 'luz transmitida', 10, 13, { color: '#e6e6e6', size: 11 });
    label(ctx, 'vista de lado (espalhada)', 20 + half, 13, { color: '#e6e6e6', size: 11 });
    void pal;
  }
  [sR, sN, sF, sTf, sOH].forEach((s) => s.addEventListener('input', draw)); cGe.addEventListener('change', draw);
}
