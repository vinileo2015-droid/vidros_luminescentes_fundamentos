// Corrosão aquosa: troca iônica controlada por interdifusão (∝ √t) + dissolução da rede (∝ t, depende do pH).
// Em sistema fechado, o álcali extraído vira NaOH, sobe o pH e acelera a dissolução.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { segmented } from '../lib/props-data.js';

// D: interdifusão Na⁺⇄H⁺/H₃O⁺ a 90 °C (nm²/s); r: dissolução da rede a pH 7 e 90 °C (nm/s); C: Na no vidro (mol/cm³)
const P = {
  ws: { name: 'Na₂O·2SiO₂ ("vidro solúvel")', D: 5, r: 1e-2, C: 0.0275, CS: 0.0275 },
  sl0: { name: 'Sodo-cálcico sem Al₂O₃', D: 0.04, r: 3e-4, C: 0.0115, CS: 0.03 },
  sl: { name: 'Sodo-cálcico com 2 % Al₂O₃', D: 0.01, r: 1e-4, C: 0.0109, CS: 0.03 },
  bs: { name: 'Borossilicato', D: 3e-4, r: 4e-5, C: 0.0029, CS: 0.03 },
  si: { name: 'Sílica vítrea', D: 0, r: 1.5e-5, C: 0, CS: 0.0367 },
};
const R = 8.314;
export function init(root) {
  const c1 = root.querySelector('#lc-plot'), c2 = root.querySelector('#lc-cut');
  const sPH = root.querySelector('#lc-ph'), sT = root.querySelector('#lc-T'), sSV = root.querySelector('#lc-sv'), sTime = root.querySelector('#lc-t'), cClosed = root.querySelector('#lc-closed');
  let gid = 'sl', sim = null;
  segmented(root.querySelector('#lc-pick'), Object.entries(P).map(([k, v]) => [k, v.name]), (k) => { gid = k; run(); }, 'sl');
  const V1 = hiDPI(c1, () => d1()), V2 = hiDPI(c2, () => d2());
  const T0 = 60, T1 = 3.15e8;
  function rate(r0, pH, TK) { const f = pH > 7 ? 10 ** (0.45 * (pH - 7)) : 10 ** (0.12 * (7 - pH)); return r0 * f * Math.exp((-70000 / R) * (1 / TK - 1 / 363)); }
  function run() {
    const g = P[gid], TK = +sT.value + 273.15, pH0 = +sPH.value, SV = 10 ** +sSV.value, closed = cClosed.checked;
    const D = g.D * Math.exp((-80000 / R) * (1 / TK - 1 / 363));
    let t = 0, xl = 0.3, xd = 0, na = 0, pH = pH0; const out = [];
    const N = 900, lt0 = Math.log(T0), lt1 = Math.log(T1);
    for (let i = 0; i <= N; i++) {
      const tn = Math.exp(lt0 + ((lt1 - lt0) * i) / N);
      const sub = 6; const dt = (tn - t) / sub;
      for (let k = 0; k < sub; k++) {
        let r = rate(g.r, pH, TK);
        let si = 0;
        if (closed) { si = xd * 1e-7 * g.CS * SV * 1000; const Csat = 2e-3 * (1 + 10 ** (pH - 9.5)); r *= Math.max(0.01, 1 - si / Csat); }
        const grow = D > 0 ? D / Math.max(0.3, xl) : 0;
        xl = Math.max(0.3, xl + (grow - r) * dt); xd += r * dt;
        na += g.C * grow * dt * 1e-7; // mol/cm²
        if (closed) {
          const Na = na * SV * 1000, free = Na - 0.5 * si; // parte do OH⁻ é consumida pelo ácido silícico (tampão)
          const pOH = free > 1e-7 ? -Math.log10(free) : 7;
          const target = Math.max(pH0, Math.min(12.5, 14 - pOH, si > 1e-9 && Na > 1e-9 ? 9.8 + Math.log10(Na / Math.max(1e-12, si)) + 1 : 14));
          pH += (target - pH) * 0.15;
        }
        t += dt;
      }
      out.push([t, D > 0 ? xl : 0, xd, pH, na]);
    }
    sim = { out, D, g }; ui();
  }
  function at(tq) { const o = sim.out; let i = 0; while (i < o.length - 1 && o[i][0] < tq) i++; return o[i]; }
  const tf = (s) => (s < 3600 ? `${fmt(s / 60)} min` : s < 86400 ? `${fmt(s / 3600, 1)} h` : s < 3.15e7 ? `${fmt(s / 86400, 0)} dias` : `${fmt(s / 3.15e7, 1)} anos`);
  function d1() {
    if (!sim) return;
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 60, r: w - 40, t: 28, b: h - 34 };
    const X = (t) => box.l + (Math.log10(t / T0) / Math.log10(T1 / T0)) * (box.r - box.l), Y = (x) => box.b - ((Math.log10(Math.max(x, 0.01)) + 2) / 8) * (box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: [60, 3600, 86400, 2.6e6, 3.15e7, 3.15e8], xfmt: (t) => ({ 60: '1 min', 3600: '1 h', 86400: '1 dia', 2.6e6: '1 mês', 3.15e7: '1 ano', 3.15e8: '10 anos' })[t], yt: [0.01, 1, 100, 1e4, 1e6], yfmt: (x) => (x >= 1e6 ? `${fmt(x / 1e6)} mm` : x >= 1000 ? `${fmt(x / 1000)} µm` : `${fmt(x, x < 1 ? 2 : 0)} nm`), xl: 'tempo de imersão', yl: 'espessura afetada (log)' });
    const line = (j, col, lw) => { ctx.beginPath(); let f = true; sim.out.forEach((o) => { if (o[j] <= 0.01) { f = true; return; } f ? ctx.moveTo(X(o[0]), Y(o[j])) : ctx.lineTo(X(o[0]), Y(o[j])); f = false; }); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); };
    line(1, pal.scl, 3); line(2, pal.liq, 3);
    // pH no eixo da direita
    const YP = (p) => box.b - ((p - 0) / 14) * (box.b - box.t);
    ctx.beginPath(); sim.out.forEach((o, i) => (i ? ctx.lineTo(X(o[0]), YP(o[3])) : ctx.moveTo(X(o[0]), YP(o[3])))); ctx.strokeStyle = alpha(pal.cryst, 0.8); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = pal.cryst; ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; [0, 7, 14].forEach((p) => ctx.fillText(`pH ${p}`, box.r + 4, YP(p)));
    label(ctx, 'camada lixiviada (√t)', box.l + 8, box.t + 8, { color: pal.scl, size: 11 });
    label(ctx, 'rede dissolvida (∝ t)', box.l + 8, box.t + 24, { color: pal.liq, size: 11 });
    const tq = 10 ** +sTime.value; ctx.strokeStyle = pal.ink; ctx.beginPath(); ctx.moveTo(X(tq), box.t); ctx.lineTo(X(tq), box.b); ctx.stroke();
  }
  function d2() {
    if (!sim) return;
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const o = at(10 ** +sTime.value), xl = o[1], xd = o[2];
    const scale = Math.max(50, (xl + xd) * 1.6), Xp = (nm) => 40 + (nm / scale) * (w - 60);
    const x0 = Xp(xd), x1 = Xp(xd + xl);
    ctx.fillStyle = alpha(pal.cryst, 0.15); ctx.fillRect(0, 20, x0, h - 50);
    ctx.fillStyle = alpha(pal.scl, 0.35); ctx.fillRect(x0, 20, Math.max(0, x1 - x0), h - 50);
    ctx.fillStyle = alpha(pal.glass, 0.3); ctx.fillRect(x1, 20, w - x1, h - 50);
    label(ctx, 'solução', 6, 12, { color: pal.cryst, size: 11 });
    if (xd > 0.05 * scale) label(ctx, 'rede dissolvida', x0 - 4, h - 20, { color: pal.liq, align: 'right', size: 11 });
    if (x1 - x0 > 30) label(ctx, 'gel rico em SiOH', (x0 + x1) / 2, 12, { color: pal.scl, align: 'center', size: 11 });
    label(ctx, 'vidro intacto', w - 8, 12, { color: pal.glass, align: 'right', size: 11 });
    // perfil de Na (erf) na camada
    ctx.beginPath(); for (let x = x0; x <= w - 10; x += 2) { const z = (x - x0) / Math.max(1, x1 - x0); const c = sim.g.C > 0 ? Math.min(1, Math.max(0, z)) ** 1.5 : 0; const y = h - 32 - c * (h - 70); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, '[Na⁺]', w - 8, 32, { color: pal.ink, align: 'right', size: 11 });
    const m = Math.max(1, scale / 4); label(ctx, `escala: ${m >= 1000 ? fmt(m / 1000, 1) + ' µm' : fmt(m) + ' nm'}`, 6, h - 8, { color: pal.ink2, size: 10, weight: 500 });
    ctx.fillStyle = pal.ink2; ctx.fillRect(40, h - 12, Xp(m) - 40, 2);
    root.querySelector('#lc-t-v').textContent = tf(o[0]);
    root.querySelector('#lc-xl').textContent = xl > 0 ? (xl >= 1000 ? `${fmt(xl / 1000, 2)} µm` : `${fmt(xl, 1)} nm`) : '–';
    root.querySelector('#lc-xd').textContent = xd >= 1000 ? `${fmt(xd / 1000, 2)} µm` : `${fmt(xd, xd < 1 ? 2 : 1)} nm`;
    root.querySelector('#lc-pHn').textContent = fmt(o[3], 1);
  }
  function ui() {
    root.querySelector('#lc-ph-v').textContent = fmt(+sPH.value, 1);
    root.querySelector('#lc-T-v').textContent = `${fmt(+sT.value)} °C`;
    root.querySelector('#lc-sv-v').textContent = `${fmt(10 ** +sSV.value, 1)} cm⁻¹`;
    V1.redraw(); V2.redraw();
  }
  [sPH, sT, sSV].forEach((s) => s.addEventListener('input', run)); cClosed.addEventListener('change', run);
  sTime.addEventListener('input', () => { V1.redraw(); V2.redraw(); });
  run();
}
