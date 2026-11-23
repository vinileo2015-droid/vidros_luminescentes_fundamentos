// Janela de transparência: borda UV (Urbach), absorção multifônon no IV, bandas de OH e de ferro, reflexão de Fresnel.
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';
import { lambdaRGB } from '../lib/color.js';
import { segmented } from '../lib/props-data.js';

// E1: energia (eV) em que α_UV = 1 cm⁻¹; Eu: largura de Urbach; nu1: número de onda (cm⁻¹) em que α_IV = 1 cm⁻¹; wIR: inclinação.
const H = {
  si: { name: 'Sílica vítrea', n: 1.458, E1: 7.6, Eu: 0.12, nu1: 2330, wIR: 110, oh: 'si', OH: 5, fe: false },
  sl: { name: 'Sodo-cálcico', n: 1.52, E1: 5.0, Eu: 0.2, nu1: 2150, wIR: 130, oh: 'mc', OH: 300, fe: true },
  ge: { name: 'Germanato', n: 1.60, E1: 5.0, Eu: 0.15, nu1: 1760, wIR: 100, oh: 'mc', OH: 100, fe: false },
  te: { name: 'Telurito', n: 2.0, E1: 3.25, Eu: 0.1, nu1: 1600, wIR: 100, oh: 'mc', OH: 80, fe: false },
  zb: { name: 'Fluoreto ZBLAN', n: 1.50, E1: 5.3, Eu: 0.25, nu1: 1350, wIR: 80, oh: 'mc', OH: 5, fe: false },
  as: { name: 'Calcogeneto As₂S₃', n: 2.4, E1: 2.25, Eu: 0.05, nu1: 870, wIR: 50, oh: 'none', OH: 0, fe: false },
};
const KEYS = Object.keys(H);
const COLS = { si: '--glass', sl: '--liq', ge: '--cryst', te: '--scl', zb: '--nuc', as: '--cond' };

function alphaOf(g, lnm, OH, Fe) {
  const E = 1239.84 / lnm, nu = 1e7 / lnm;
  let a = Math.exp((E - g.E1) / g.Eu) + Math.exp((g.nu1 - nu) / g.wIR);
  if (g.oh === 'si') a += OH * (0.2 * Math.exp(-0.5 * ((nu - 3670) / 45) ** 2) + 0.006 * Math.exp(-0.5 * ((nu - 4520) / 50) ** 2) + 0.0012 * Math.exp(-0.5 * ((nu - 7225) / 40) ** 2));
  else if (g.oh === 'mc') a += OH * (0.03 * Math.exp(-0.5 * ((nu - 3500) / 220) ** 2) + 0.02 * Math.exp(-0.5 * ((nu - 2850) / 180) ** 2));
  if (g.fe && Fe > 0) {
    const fe2 = 0.25 * Fe * 0.9, fe3 = 0.75 * Fe; // FeO e Fe₂O₃ (% em massa) para redox Fe²⁺/Fe_total ≈ 0,25
    a += 25 * fe2 * Math.exp(-0.5 * ((nu - 9100) / 2300) ** 2) + 3000 * fe3 * Math.exp(-0.5 * ((nu - 44000) / 5000) ** 2);
  }
  return a;
}
const trans = (g, lnm, d, OH, Fe) => { const R = ((g.n - 1) / (g.n + 1)) ** 2, e = Math.exp(-alphaOf(g, lnm, OH, Fe) * d); return ((1 - R) ** 2 * e) / (1 - R * R * e * e); };

export function init(root) {
  const cv = root.querySelector('#wn-canvas');
  const sD = root.querySelector('#wn-d'), sOH = root.querySelector('#wn-oh'), sFe = root.querySelector('#wn-fe');
  let sel = 'si';
  const st = {}; KEYS.forEach((k) => (st[k] = { OH: H[k].OH, Fe: 0.1 }));
  segmented(root.querySelector('#wn-pick'), KEYS.map((k) => [k, H[k].name]), (k) => { sel = k; sOH.value = Math.log10(Math.max(0.1, st[k].OH)); sFe.value = st[k].Fe; ui(); }, 'si');
  const view = hiDPI(cv, () => draw());
  const L0 = 150, L1 = 15000;
  function draw() {
    const { ctx, w, h } = view; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 46, r: w - 12, t: 30, b: h - 52 };
    const X = (l) => box.l + (Math.log10(l / L0) / Math.log10(L1 / L0)) * (box.r - box.l), Y = (t) => box.b - t * (box.b - box.t);
    const d = (10 ** +sD.value) / 10; // cm
    // faixas
    for (let l = 380; l < 780; l += 5) { ctx.fillStyle = lambdaRGB(l); ctx.fillRect(X(l), box.b + 2, X(l + 5) - X(l) + 0.6, 6); }
    ctx.fillStyle = alpha(pal.cryst, 0.07); ctx.fillRect(box.l, box.t, X(380) - box.l, box.b - box.t);
    ctx.fillStyle = alpha(pal.liq, 0.06); ctx.fillRect(X(780), box.t, box.r - X(780), box.b - box.t);
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.fillStyle = pal.ink2;
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => { ctx.beginPath(); ctx.moveTo(box.l, Y(t) + 0.5); ctx.lineTo(box.r, Y(t) + 0.5); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`${t * 100}`, box.l - 6, Y(t)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    (w < 600 ? [200, 500, 1000, 3000, 10000] : [200, 300, 500, 1000, 2000, 3000, 5000, 10000]).forEach((l) => ctx.fillText(l >= 1000 ? `${l / 1000} µm` : `${l} nm`, X(l), box.b + 12));
    label(ctx, 'transmitância (%)', 6, 14, { color: pal.ink, size: 12 });
    label(ctx, w < 600 ? 'UV: gap' : 'UV: elétrons atravessam o gap', box.l + 4, box.t + 10, { color: pal.cryst, size: 11 });
    label(ctx, w < 600 ? 'IV: fônons' : 'IV: vibrações da rede (multifônons)', box.r - 4, box.t + 10, { color: pal.liq, align: 'right', size: 11 });
    const plot = (k, lw, a) => {
      const g = H[k]; ctx.beginPath();
      for (let i = 0; i <= 600; i++) { const l = L0 * (L1 / L0) ** (i / 600); const y = Y(trans(g, l, d, st[k].OH, st[k].Fe)); i ? ctx.lineTo(X(l), y) : ctx.moveTo(X(l), y); }
      ctx.strokeStyle = a; ctx.lineWidth = lw; ctx.stroke();
    };
    const cc = (k) => { const p = document.createElement('i'); p.style.color = `var(${COLS[k]})`; root.appendChild(p); const v = getComputedStyle(p).color; p.remove(); return v; };
    KEYS.forEach((k) => k !== sel && plot(k, 1.2, alpha(cc(k), 0.35)));
    plot(sel, 3, cc(sel));
    // limites a 10 %
    const g = H[sel]; let uv = null, ir = null;
    for (let i = 0; i <= 2000; i++) { const l = L0 * (L1 / L0) ** (i / 2000); const t = trans(g, l, d, st[sel].OH, st[sel].Fe); if (uv == null && t > 0.1) uv = l; if (uv != null && t > 0.1) ir = l; }
    const f = (l) => (l == null ? '–' : l >= 1000 ? `${fmt(l / 1000, 2)} µm` : `${fmt(l)} nm`);
    root.querySelector('#wn-uv').textContent = f(uv);
    root.querySelector('#wn-ir').textContent = f(ir);
    root.querySelector('#wn-R').textContent = `${fmt(100 * (1 - (1 - ((g.n - 1) / (g.n + 1)) ** 2) ** 2), 1)} %`;
    if (uv) { ctx.strokeStyle = pal.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(uv), box.t + 18); ctx.lineTo(X(uv), box.b); ctx.moveTo(X(ir), box.t + 18); ctx.lineTo(X(ir), box.b); ctx.stroke(); ctx.setLineDash([]); }
  }
  function ui() {
    const g = H[sel];
    sOH.disabled = g.oh === 'none'; sFe.disabled = !g.fe;
    root.querySelector('#wn-d-v').textContent = `${fmt(10 ** +sD.value, 1)} mm`;
    root.querySelector('#wn-oh-v').textContent = g.oh === 'none' ? 'n/a' : `${fmt(st[sel].OH, st[sel].OH < 10 ? 1 : 0)} ppm`;
    root.querySelector('#wn-fe-v').textContent = g.fe ? `${fmt(st[sel].Fe, 2)} %` : 'n/a';
    view.redraw();
  }
  sD.addEventListener('input', ui);
  sOH.addEventListener('input', () => { st[sel].OH = 10 ** +sOH.value; ui(); });
  sFe.addEventListener('input', () => { st[sel].Fe = +sFe.value; ui(); });
  ui();
}
