// Densidade por fatores de diferença (Varshneya, Tab. 7.2) a partir de um sodo-cálcico; volume molar e empacotamento.
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';
import { sliders, OXLAB, MW, NOX, NCAT, wtToMol } from '../lib/props-data.js';

const FAC = { SiO2: -0.0024, Al2O3: 0.0018, CaO: 0.0106, MgO: 0.005, BaO: 0.0173, Na2O: 0.005, K2O: 0.0028, B2O3: 0.0036, ZnO: 0.0145, PbO: 0.0192 };
const BASE = { SiO2: 72.5, Al2O3: 1.5, Na2O: 13.5, K2O: 0.5, CaO: 9, MgO: 3, BaO: 0, B2O3: 0, ZnO: 0, PbO: 0 };
const RHO0 = 2.50;
const RAD = { SiO2: 0.26, B2O3: 0.11, Al2O3: 0.39, Na2O: 1.02, K2O: 1.38, CaO: 1.0, MgO: 0.72, BaO: 1.35, ZnO: 0.6, PbO: 1.19 };
const RO = 1.35, NA = 6.022e23;
const Vi = (k) => NA * (4 * Math.PI / 3) * (NCAT[k] * RAD[k] ** 3 + NOX[k] * RO ** 3) * 1e-24;
const VARS = ['Na2O', 'K2O', 'CaO', 'MgO', 'BaO', 'ZnO', 'PbO', 'Al2O3', 'B2O3'];

export function init(root) {
  const cv = root.querySelector('#dn-canvas');
  const S = sliders(root.querySelector('#dn-sl'), VARS.map((k) => ({ id: k, label: OXLAB[k], min: 0, max: k === 'PbO' ? 30 : 20, step: 0.5, value: BASE[k] })), () => upd(), ' %');
  root.querySelector('#dn-reset').addEventListener('click', () => { VARS.forEach((k) => S[k].set(BASE[k])); upd(); });
  const view = hiDPI(cv, () => draw());
  let R = null;
  function upd() {
    const w = { ...BASE }; let sum = 0; VARS.forEach((k) => { w[k] = S[k].get(); sum += w[k]; });
    w.SiO2 = Math.max(0, 100 - sum);
    let rho = RHO0; const con = [];
    for (const k in FAC) { const d = FAC[k] * (w[k] - BASE[k]); rho += d; con.push([k, d]); }
    const x = wtToMol(w); let M = 0, vol = 0, nO = 0;
    for (const k in x) { M += x[k] * MW[k]; vol += x[k] * Vi(k); nO += x[k] * NOX[k]; }
    const Vm = M / rho, Cg = (rho * vol) / M, VO = Vm / nO;
    R = { w, rho, con, Vm, Cg, VO, M, low: w.SiO2 < 50 };
    root.querySelector('#dn-si').textContent = `${fmt(w.SiO2, 1)} %`;
    root.querySelector('#dn-rho').textContent = fmt(rho, 3);
    root.querySelector('#dn-vm').textContent = fmt(Vm, 2);
    root.querySelector('#dn-vo').textContent = fmt(VO, 2);
    root.querySelector('#dn-cg').textContent = fmt(Cg, 3);
    root.querySelector('#dn-warn').textContent = R.low ? 'Atenção: com menos de ~50 % de SiO₂ você está longe da base sodo-cálcica, e os fatores da tabela perdem precisão.' : 'O SiO₂ entra como balanço: cada 1 % de outro óxido substitui 1 % de SiO₂.';
    view.redraw();
  }
  function draw() {
    if (!R) return;
    const { ctx, w, h } = view; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const rows = R.con.filter(([, d]) => Math.abs(d) > 1e-6).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const box = { l: 70, r: w - 60, t: 34, b: h - 16 };
    const mx = Math.max(0.02, ...rows.map((r) => Math.abs(r[1])));
    const cx = (box.l + box.r) / 2, X = (v) => cx + (v / mx) * ((box.r - box.l) / 2);
    label(ctx, w < 520 ? 'Δρ por óxido (g/cm³)' : 'contribuição para Δρ em relação ao sodo-cálcico (g/cm³)', box.l - 60, 14, { color: pal.ink, size: 12 });
    ctx.strokeStyle = pal.ink2; ctx.beginPath(); ctx.moveTo(cx, box.t - 6); ctx.lineTo(cx, box.b); ctx.stroke();
    const rh = Math.min(26, (box.b - box.t) / Math.max(1, rows.length));
    rows.forEach(([k, d], i) => {
      const y = box.t + i * rh;
      ctx.fillStyle = d >= 0 ? alpha(pal.cryst, 0.75) : alpha(pal.liq, 0.75);
      ctx.fillRect(Math.min(cx, X(d)), y + 3, Math.abs(X(d) - cx), rh - 7);
      label(ctx, OXLAB[k], box.l - 8, y + rh / 2, { color: pal.ink, align: 'right', size: 12 });
      label(ctx, `${d >= 0 ? '+' : ''}${fmt(d, 3)}`, d >= 0 ? X(d) + 6 : X(d) - 6, y + rh / 2, { color: pal.ink2, align: d >= 0 ? 'left' : 'right', size: 11, weight: 500 });
    });
    if (!rows.length) label(ctx, 'Composição igual à base: ρ = 2,500 g/cm³', cx, box.t + 20, { color: pal.ink2, align: 'center', size: 12 });
  }
  upd();
}
