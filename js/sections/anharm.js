// Poço de potencial de Morse: profundidade ↔ energia de ligação, curvatura ↔ rigidez (E), assimetria ↔ expansão térmica.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { segmented } from '../lib/props-data.js';

const kB = 8.617e-5; // eV/K
const PRESETS = { sio: { D: 4.6, a: 2.0, r0: 1.62, name: 'Si–O' }, bo: { D: 5.2, a: 2.3, r0: 1.37, name: 'B–O (BO₃)' }, cao: { D: 1.4, a: 1.6, r0: 2.4, name: 'Ca–O' }, nao: { D: 0.87, a: 1.5, r0: 2.4, name: 'Na–O' } };

function meanR(D, a, r0, T) {
  // média clássica de r com peso de Boltzmann no poço de Morse
  if (T < 1) return r0;
  const kT = kB * T; let s = 0, sr = 0;
  const lo = r0 - 1.2 / a, hi = r0 + 6 / a, N = 700, dr = (hi - lo) / N;
  for (let i = 0; i <= N; i++) { const r = lo + i * dr; const V = D * (1 - Math.exp(-a * (r - r0))) ** 2; const wgt = Math.exp(-V / kT); s += wgt; sr += wgt * r; }
  return sr / s;
}

export function init(root) {
  const cw = root.querySelector('#ah-well'), cl = root.querySelector('#ah-exp');
  const sD = root.querySelector('#ah-D'), sa = root.querySelector('#ah-a'), sT = root.querySelector('#ah-T');
  let P = { ...PRESETS.sio }, ref = { ...PRESETS.nao };
  segmented(root.querySelector('#ah-pre'), Object.entries(PRESETS).map(([k, v]) => [k, v.name]), (k) => { P = { ...PRESETS[k] }; sD.value = P.D; sa.value = P.a; ref = k === 'nao' ? { ...PRESETS.sio } : { ...PRESETS.nao }; upd(); }, 'sio');
  const V1 = hiDPI(cw, () => drawWell()), V2 = hiDPI(cl, () => drawExp());
  let curve = [], refCurve = [];
  const compute = (Q) => { const out = []; for (let T = 0; T <= 1500; T += 50) out.push([T, (meanR(Q.D, Q.a, Q.r0, T) - Q.r0) / Q.r0]); return out; };

  function drawWell() {
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 40, r: w - 12, t: 26, b: h - 30 };
    const rmin = 0.8, rmax = 4.6, Emax = 6.2;
    const X = (r) => box.l + ((r - rmin) / (rmax - rmin)) * (box.r - box.l), Y = (E) => box.t + (E / Emax) * (box.b - box.t);
    axes(ctx, box, { x: X, y: (E) => Y(E), pal, xt: [1, 2, 3, 4], yt: [0, 2, 4, 6], yfmt: (v) => String(v), xl: 'distância r (Å)', yl: 'profundidade do poço (eV)', xfmt: (v) => String(v) });
    const V = (Q, r) => Q.D * (1 - Math.exp(-Q.a * (r - Q.r0))) ** 2 - Q.D; // zero no infinito
    // desenho simples: profundidade medida a partir do topo (0 eV = átomos separados)
    const plot = (Q, col, lw, dash) => {
      ctx.save(); ctx.setLineDash(dash || []); ctx.beginPath(); let first = true;
      for (let r = rmin; r <= rmax; r += 0.01) { const E = -V(Q, r); if (E < -0.2) { first = true; continue; } const yy = Y(Math.max(0, Math.min(Emax, E))); first ? ctx.moveTo(X(r), yy) : ctx.lineTo(X(r), yy); first = false; }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore();
    };
    const E2y = (E) => Y(Math.max(0, Math.min(Emax, E))); // profundidade (positiva para baixo)
    plot(ref, alpha(pal.ink2, 0.6), 1.5, [5, 4]);
    plot(P, pal.glass, 3);
    // nível térmico e ponto médio
    const T = +sT.value, kT = kB * T;
    const Eth = Math.min(P.D * 0.98, kT * 6); // nível exagerado ×6 para ficar visível
    const rL = P.r0 - Math.log(1 + Math.sqrt(Eth / P.D)) / P.a, rR = P.r0 - Math.log(1 - Math.sqrt(Eth / P.D)) / P.a;
    const yE = E2y(P.D - Eth);
    ctx.strokeStyle = pal.liq; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(rL), yE); ctx.lineTo(X(Math.min(rR, rmax)), yE); ctx.stroke();
    const mid = (rL + Math.min(rR, rmax)) / 2;
    ctx.fillStyle = pal.liq; ctx.beginPath(); ctx.arc(X(mid), yE, 4.5, 0, 6.283); ctx.fill();
    ctx.strokeStyle = alpha(pal.ink, 0.5); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(P.r0), E2y(P.D)); ctx.lineTo(X(P.r0), yE - 20); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'r₀', X(P.r0), yE - 26, { color: pal.ink2, align: 'center', size: 11 });
    label(ctx, 'média ↦', X(mid) + 8, yE + 14, { color: pal.liq, size: 11 });
    label(ctx, `${P.name}: poço de ${fmt(P.D, 1)} eV`, box.r - 4, box.b - 54, { color: pal.glass, align: 'right', size: 12, bg: alpha(pal.bg, 0.85) });
    label(ctx, `tracejado: ${ref.name}`, box.r - 4, box.b - 36, { color: pal.ink2, align: 'right', size: 11, weight: 500, bg: alpha(pal.bg, 0.85) });
  }
  function drawExp() {
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 46, r: w - 12, t: 26, b: h - 30 };
    const ymax = Math.max(0.004, ...curve.map((p) => p[1]), ...refCurve.map((p) => p[1])) * 1.1;
    const X = (T) => box.l + (T / 1500) * (box.r - box.l), Y = (v) => box.b - (v / ymax) * (box.b - box.t);
    const yt = []; const step = ymax > 0.03 ? 0.01 : ymax > 0.012 ? 0.005 : 0.002; for (let v = 0; v <= ymax; v += step) yt.push(v);
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 500, 1000, 1500], yt, xl: 'T (K)', yl: 'Δr/r₀ (%)', yfmt: (v) => fmt(v * 100, 1) });
    const line = (c, col, lw, d) => { ctx.save(); ctx.setLineDash(d || []); ctx.beginPath(); c.forEach(([T, v], i) => (i ? ctx.lineTo(X(T), Y(v)) : ctx.moveTo(X(T), Y(v)))); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); };
    line(refCurve, alpha(pal.ink2, 0.7), 1.5, [5, 4]); line(curve, pal.glass, 3);
    const T = +sT.value; const v = (meanR(P.D, P.a, P.r0, T) - P.r0) / P.r0;
    ctx.fillStyle = pal.liq; ctx.beginPath(); ctx.arc(X(T), Y(v), 5, 0, 6.283); ctx.fill();
  }
  function upd() {
    P.D = +sD.value; P.a = +sa.value;
    root.querySelector('#ah-D-v').textContent = `${fmt(P.D, 1)} eV`;
    root.querySelector('#ah-a-v').textContent = `${fmt(P.a, 1)} Å⁻¹`;
    root.querySelector('#ah-T-v').textContent = `${fmt(+sT.value)} K`;
    curve = compute(P); refCurve = compute(ref);
    const k = 2 * P.D * P.a * P.a; // eV/Å²
    const Erel = (k / P.r0) / ((2 * PRESETS.sio.D * PRESETS.sio.a ** 2) / PRESETS.sio.r0);
    const al = (3 * kB) / (4 * P.D * P.a * P.r0);
    root.querySelector('#ah-k').textContent = `${fmt(k * 16.02, 0)} N/m`;
    root.querySelector('#ah-E').textContent = `${fmt(Erel * 100, 0)} %`;
    root.querySelector('#ah-al').textContent = `${fmt(al * 1e6, 1)} ×10⁻⁶/K`;
    V1.redraw(); V2.redraw();
  }
  [sD, sa].forEach((s) => s.addEventListener('input', upd));
  sT.addEventListener('input', () => { root.querySelector('#ah-T-v').textContent = `${fmt(+sT.value)} K`; V1.redraw(); V2.redraw(); });
  upd();
}
