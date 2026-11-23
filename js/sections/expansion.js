// Calculadora de expansão térmica por aditividade (Varshneya, Tab. 10.2) + curva dilatométrica.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { sliders, OXLAB } from '../lib/props-data.js';

// fatores (×10⁻⁷/°C por % em massa): Winkelmann–Schott, English–Turner
const F = {
  SiO2: [0.267, 0.05], B2O3: [0.033, -0.653], Al2O3: [1.667, 0.14], Na2O: [3.333, 4.16], K2O: [2.833, 3.9],
  CaO: [1.667, 1.63], MgO: [0.033, 0.45], BaO: [1.0, 1.4], ZnO: [0.6, 0.7], PbO: [1.0, 1.06],
};
const KEYS = Object.keys(F);
const PRE = {
  sl: { name: 'Sodo-cálcico (float)', w: { SiO2: 72.5, Al2O3: 1.5, Na2O: 13.5, K2O: 0.5, CaO: 9, MgO: 3 }, meas: 90, Tg: 550 },
  bs: { name: 'Borossilicato', w: { SiO2: 80.6, B2O3: 13, Al2O3: 2.3, Na2O: 4, K2O: 0.1 }, meas: 32.5, Tg: 560 },
  pb: { name: 'Cristal de chumbo', w: { SiO2: 56, PbO: 30, K2O: 11, Na2O: 3 }, meas: 90, Tg: 450 },
  e: { name: 'Fibra E', w: { SiO2: 54, Al2O3: 14, B2O3: 10, CaO: 17.5, MgO: 4.5 }, meas: 54, Tg: 680 },
  si: { name: 'Sílica', w: { SiO2: 100 }, meas: 5.5, Tg: 1200 },
};
const SCALE = [['sílica', 5.5], ['Invar', 12], ['Si', 26], ['W', 45], ['Kovar', 50], ['Pt', 90], ['Fe', 120], ['Cu', 170], ['Al', 230]];

export function init(root) {
  const cBar = root.querySelector('#ex-bar'), cDil = root.querySelector('#ex-dil');
  const spec = KEYS.map((k) => ({ id: k, label: OXLAB[k], min: 0, max: k === 'SiO2' ? 100 : k === 'PbO' ? 60 : 30, step: 0.5, value: 0 }));
  const S = sliders(root.querySelector('#ex-sl'), spec, () => { cur = null; upd(); }, ' %');
  const tg = root.querySelector('#ex-tg');
  let cur = 'sl', res = null;
  const pb = root.querySelector('#ex-pre');
  Object.entries(PRE).forEach(([k, p]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = p.name;
    b.addEventListener('click', () => load(k)); pb.appendChild(b);
  });
  function load(k) { cur = k; KEYS.forEach((o) => S[o].set(PRE[k].w[o] || 0)); tg.value = PRE[k].Tg; upd(); }
  const V1 = hiDPI(cBar, () => drawBar()), V2 = hiDPI(cDil, () => drawDil());

  function upd() {
    const raw = {}; let sum = 0; KEYS.forEach((k) => { raw[k] = S[k].get(); sum += raw[k]; });
    const w = {}; KEYS.forEach((k) => (w[k] = sum ? (100 * raw[k]) / sum : 0));
    const ws = KEYS.reduce((s, k) => s + F[k][0] * w[k], 0), et = KEYS.reduce((s, k) => s + F[k][1] * w[k], 0);
    const contrib = KEYS.map((k) => [k, F[k][0] * w[k]]).sort((a, b) => b[1] - a[1]);
    res = { w, ws, et, contrib, sum };
    root.querySelector('#ex-ws').textContent = fmt(ws, 1);
    root.querySelector('#ex-et').textContent = fmt(et, 1);
    root.querySelector('#ex-meas').textContent = cur ? fmt(PRE[cur].meas, 1) : '–';
    root.querySelector('#ex-sum').textContent = `Soma dos sliders: ${fmt(sum, 1)} % (renormalizada para 100 %). ${cur ? `Composição: ${PRE[cur].name}.` : 'Composição personalizada.'}`;
    root.querySelector('#ex-tg-v').textContent = `${fmt(+tg.value)} °C`;
    V1.redraw(); V2.redraw();
  }
  function drawBar() {
    if (!res) return;
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 16, r: w - 16, t: 40, b: h - 62 };
    const lmax = Math.log10(300), lmin = Math.log10(3);
    const X = (v) => box.l + ((Math.log10(Math.max(3, v)) - lmin) / (lmax - lmin)) * (box.r - box.l);
    const grd = ctx.createLinearGradient(box.l, 0, box.r, 0); grd.addColorStop(0, alpha(pal.glass, 0.35)); grd.addColorStop(1, alpha(pal.liq, 0.35));
    ctx.fillStyle = grd; ctx.fillRect(box.l, box.t + 12, box.r - box.l, 10);
    ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.fillStyle = pal.ink2;
    SCALE.forEach(([n, v], i) => { const x = X(v); ctx.fillRect(x - 0.5, box.t + 22, 1, 8); label(ctx, n, x, box.t + 36 + (i % 2) * 13, { color: pal.ink2, align: 'center', size: 11, weight: 500 }); });
    [3, 10, 30, 100, 300].forEach((v) => label(ctx, String(v), X(v), box.t + 6, { color: pal.ink2, align: 'center', size: 10, weight: 500 }));
    label(ctx, 'α (×10⁻⁷/°C), escala log', box.l, 14, { color: pal.ink, size: 12 });
    const mark = (v, col, txt, up) => { const x = X(v); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, box.t + 12); ctx.lineTo(x - 6, box.t + 2 - (up ? 0 : 0)); ctx.lineTo(x + 6, box.t + 2); ctx.fill(); label(ctx, txt, x, box.b + 28 + (up ? 14 : 0), { color: col, align: 'center', size: 12 }); ctx.fillRect(x - 1, box.t + 12, 2, box.b + 18 - box.t + (up ? 14 : 0)); };
    mark(res.ws, pal.glass, `W–S ${fmt(res.ws, 0)}`, false);
    mark(res.et, pal.cryst, `E–T ${fmt(res.et, 0)}`, Math.abs(X(res.et) - X(res.ws)) < 70);
  }
  function drawDil() {
    if (!res) return;
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 50, r: w - 12, t: 26, b: h - 32 };
    const Tg = +tg.value, a = (res.ws * 1e-7), aL = a * 3.2, Td = Tg + 70;
    const Tmax = Math.min(1400, Td + 120);
    const dl = (T) => (T <= Tg ? a * (T - 25) : a * (Tg - 25) + aL * Math.min(T - Tg, Td - Tg));
    const pts = []; for (let T = 25; T <= Td; T += 5) pts.push([T, dl(T)]);
    const top = dl(Td);
    for (let T = Td; T <= Td + 45; T += 3) pts.push([T, top - aL * 1.2 * ((T - Td) ** 2) / 20]);
    const ymax = top * 1.15 || 1e-4;
    const X = (T) => box.l + (T / Tmax) * (box.r - box.l), Y = (v) => box.b - (v / ymax) * (box.b - box.t);
    const yt = []; const st = ymax > 0.01 ? 0.002 : ymax > 0.004 ? 0.001 : ymax > 0.0015 ? 0.0005 : 0.0001; for (let v = 0; v <= ymax; v += st) yt.push(v);
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 200, 400, 600, 800, 1000, 1200].filter((v) => v <= Tmax), yt, xl: 'T (°C)', yl: 'ΔL/L₀ (‰)', yfmt: (v) => fmt(v * 1000, 1) });
    ctx.beginPath(); pts.forEach(([T, v], i) => (i ? ctx.lineTo(X(T), Y(v)) : ctx.moveTo(X(T), Y(v)))); ctx.strokeStyle = pal.glass; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = pal.ink2; ctx.beginPath(); ctx.moveTo(X(25), Y(0)); ctx.lineTo(X(Td), Y(a * (Td - 25))); ctx.stroke(); ctx.restore();
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(Tg), Y(dl(Tg)), 4.5, 0, 6.283); ctx.fill();
    label(ctx, 'Tg', X(Tg) - 8, Y(dl(Tg)) - 4, { color: pal.ink, align: 'right', base: 'bottom', size: 12 });
    label(ctx, 'Td (amolecimento dilatométrico)', X(Td), Y(top) - 10, { color: pal.liq, align: X(Td) > w * 0.6 ? 'right' : 'center', base: 'bottom', size: 11 });
    label(ctx, `α vidro ≈ ${fmt(a * 1e7, 0)}`, X((25 + Tg) / 2), Y(dl((25 + Tg) / 2)) - 12, { color: pal.glass, align: 'center', base: 'bottom', size: 11 });
    label(ctx, `α líquido ≈ ${fmt(aL * 1e7, 0)}`, X(Tg) + 10, Y(dl(Tg)) + 14, { color: pal.scl, size: 11 });
  }
  tg.addEventListener('input', upd);
  load('sl');
}
