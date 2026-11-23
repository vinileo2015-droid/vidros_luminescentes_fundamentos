// Simulador de cor: bandas de absorção de íons e coloides → transmitância → cor percebida (CIE 1931 → sRGB).
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { transmittedRGB, lambdaRGB } from '../lib/color.js';

// bandas: [ν0 (cm⁻¹), σ (cm⁻¹), α por % em massa (cm⁻¹)]. Valores típicos em silicatos (de Ligny & Möncke; Bamford).
const IONS = [
  { id: 'co', name: 'Co²⁺', ox: 'CoO', why: 'd⁷ em sítio tetraédrico: três bandas ⁴A₂→⁴T₁(P) no amarelo-vermelho. Sem centro de inversão, a regra de Laporte relaxa e a banda é intensa.', bands: [[15500, 700, 180], [17000, 700, 160], [18700, 650, 110]], min: 0.001, max: 0.3, v: 0.02 },
  { id: 'cr3', name: 'Cr³⁺', ox: 'Cr₂O₃', why: 'd³ octaédrico: ⁴A₂→⁴T₂ (~650 nm) e ⁴A₂→⁴T₁ (~450 nm). Sobra a janela do verde.', bands: [[15400, 1500, 30], [22000, 1800, 35]], min: 0.01, max: 2, v: 0.2 },
  { id: 'cr6', name: 'Cr⁶⁺', ox: 'CrO₃', why: 'd⁰: não há transição d–d. A cor amarela vem de transferência de carga O²⁻→Cr⁶⁺ no UV próximo.', bands: [[27400, 2600, 400]], min: 0.001, max: 0.2, v: 0.02 },
  { id: 'cu', name: 'Cu²⁺', ox: 'CuO', why: 'd⁹ octaédrico distorcido (Jahn–Teller): uma banda larga ~800 nm que come o vermelho: azul-turquesa.', bands: [[12500, 2600, 12]], min: 0.05, max: 5, v: 1 },
  { id: 'fe2', name: 'Fe²⁺', ox: 'FeO', why: 'd⁶ octaédrico: banda larga em ~1100 nm cuja cauda alcança o vermelho. Azul-esverdeado, e absorve calor (IV).', bands: [[9100, 2300, 25], [5000, 1500, 8]], min: 0.01, max: 1, v: 0.1 },
  { id: 'fe3', name: 'Fe³⁺', ox: 'Fe₂O₃', why: 'd⁵ de spin alto: transições d–d proibidas por spin, fracas. A cauda da transferência de carga O²⁻→Fe³⁺ no UV dá o amarelo.', bands: [[23800, 500, 1.2], [26300, 800, 2.5], [44000, 5000, 3000]], min: 0.01, max: 1, v: 0.2 },
  { id: 'mn3', name: 'Mn³⁺', ox: 'Mn₂O₃', why: 'd⁴ (Jahn–Teller): banda larga em ~500 nm, no verde: púrpura. É a cor das garrafas antigas "solarizadas".', bands: [[20000, 2300, 25]], min: 0.01, max: 2, v: 0.3 },
  { id: 'ni', name: 'Ni²⁺', ox: 'NiO', why: 'd⁸: mistura de sítios octaédricos (amarelo-marrom) e tetraédricos (violeta). A cor muda com o álcali da matriz.', bands: [[22500, 1800, 15], [15500, 2000, 6], [8000, 1500, 4]], min: 0.01, max: 1, v: 0.1 },
  { id: 'nd', name: 'Nd³⁺', ox: 'Nd₂O₃', why: '4f³: linhas finas, pois os elétrons 4f são blindados pelas camadas 5s5p. A forte em 585 nm dá o lilás que muda com a luz (dicroísmo).', bands: [[17200, 210, 8], [19050, 180, 3], [13400, 150, 4], [12500, 150, 5], [11500, 140, 1.5], [23250, 200, 1.2], [16900, 120, 2]], min: 0.2, max: 10, v: 3 },
  { id: 'au', name: 'Au⁰ (coloide)', ox: 'Au', why: 'Nanopartículas de ouro: ressonância de plasmon em ~530 nm, banda forte no verde: rubi. Precisa de tratamento térmico para formar as partículas.', bands: [[18900, 1900, 2500]], min: 0.0005, max: 0.05, v: 0.006 },
  { id: 'ag', name: 'Ag⁰ (coloide)', ox: 'Ag', why: 'Plasmon da prata em ~410 nm: amarelo. É o "amarelo de prata" dos vitrais medievais.', bands: [[24400, 2200, 1500]], min: 0.0005, max: 0.05, v: 0.005 },
  { id: 'fes', name: 'Fe³⁺–S²⁻ (âmbar)', ox: 'Fe + S', why: 'Cromóforo Fe³⁺ tetraédrico com um S²⁻ vizinho: transferência de carga S→Fe em ~410 nm. Só se forma em fusão redutora.', bands: [[24000, 2600, 60]], min: 0.01, max: 1, v: 0.15 },
  { id: 'cds', name: 'CdS₁₋ₓSeₓ', ox: 'x (Se)', why: 'Nanocristais semicondutores: absorvem tudo acima do gap (2,42 eV no CdS a 1,74 eV no CdSe). Filtros de corte amarelo, laranja e vermelho.', edge: true, min: 0, max: 1, v: 0.4 },
];
const PRESETS = [
  ['Verde-garrafa', { fe2: 0.15, fe3: 0.35, cr3: 0.15 }], ['Azul-cobalto', { co: 0.03 }], ['Rubi de ouro', { au: 0.008 }],
  ['Âmbar', { fes: 0.2, fe3: 0.2 }], ['Neodímio', { nd: 4 }], ['Fe + Mn: descoloração', { fe2: 0.03, fe3: 0.08, mn3: 0.05 }], ['Filtro laranja', { cds: 0.35 }],
];

export function init(root) {
  const cS = root.querySelector('#co-spec'), cW = root.querySelector('#co-wedge');
  const chips = root.querySelector('#co-chips'), sl = root.querySelector('#co-sl'), sD = root.querySelector('#co-d');
  const why = root.querySelector('#co-why');
  const act = {}; let illum = 6504;
  IONS.forEach((ion) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = ion.name; b.setAttribute('aria-pressed', 'false');
    b.style.setProperty('--c', 'var(--glass)');
    b.addEventListener('click', () => { if (act[ion.id] != null) delete act[ion.id]; else act[ion.id] = ion.v; why.textContent = `${ion.name}: ${ion.why}`; build(); });
    chips.appendChild(b); ion.btn = b;
  });
  const pr = root.querySelector('#co-pre');
  PRESETS.forEach(([n, set]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = n; b.addEventListener('click', () => { Object.keys(act).forEach((k) => delete act[k]); Object.assign(act, set); build(); const first = IONS.find((i) => i.id === Object.keys(set)[0]); why.textContent = `${first.name}: ${first.why}`; }); pr.appendChild(b); });
  root.querySelectorAll('#co-ill button').forEach((b) => b.addEventListener('click', () => { illum = +b.dataset.t; root.querySelectorAll('#co-ill button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); draw(); }));

  function build() {
    sl.innerHTML = '';
    IONS.forEach((ion) => {
      ion.btn.setAttribute('aria-pressed', act[ion.id] != null ? 'true' : 'false');
      if (act[ion.id] == null) return;
      const d = document.createElement('div'); d.className = 'ctl';
      const isLog = !ion.edge;
      const toS = (v) => (isLog ? Math.log10(v) : v), fromS = (s) => (isLog ? 10 ** s : s);
      d.innerHTML = `<label>${ion.name} <span class="val"></span></label><input type="range" min="${toS(ion.min)}" max="${toS(ion.max)}" step="${isLog ? 0.01 : 0.01}" value="${toS(act[ion.id])}" aria-label="Concentração de ${ion.name}">`;
      const inp = d.querySelector('input'), val = d.querySelector('.val');
      const u = () => { const v = fromS(+inp.value); act[ion.id] = v; val.textContent = ion.edge ? `x = ${fmt(v, 2)}` : `${fmt(v, v < 0.01 ? 4 : v < 0.1 ? 3 : 2)} % ${ion.ox}`; };
      inp.addEventListener('input', () => { u(); draw(); }); u(); sl.appendChild(d);
    });
    if (!Object.keys(act).length) sl.innerHTML = '<p class="note" style="margin:0">Escolha um ou mais íons acima.</p>';
    draw();
  }
  const alphaAt = (lnm) => {
    let a = 0; const nu = 1e7 / lnm;
    for (const ion of IONS) {
      const c = act[ion.id]; if (c == null) continue;
      if (ion.edge) { const Eg = 2.42 - 0.68 * c, E = 1239.84 / lnm; a += 60 / (1 + Math.exp(-(E - Eg) / 0.035)); continue; }
      for (const [n0, s, k] of ion.bands) a += c * k * Math.exp(-0.5 * ((nu - n0) / s) ** 2);
    }
    return a;
  };
  const V1 = hiDPI(cS, () => drawS()), V2 = hiDPI(cW, () => drawW());
  function drawS() {
    const { ctx, w, h } = V1; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const box = { l: 46, r: w - 12, t: 26, b: h - 40 };
    const L0 = 350, L1 = 1100; let amax = 0.5; for (let l = 380; l <= L1; l += 5) amax = Math.max(amax, alphaAt(l));
    amax = Math.min(amax * 1.1, 200);
    const X = (l) => box.l + ((l - L0) / (L1 - L0)) * (box.r - box.l), Y = (a) => box.b - (Math.min(a, amax) / amax) * (box.b - box.t);
    for (let l = 380; l < 780; l += 4) { ctx.fillStyle = lambdaRGB(l); ctx.fillRect(X(l), box.b + 2, X(l + 4) - X(l) + 0.5, 6); }
    const yt = []; const st = amax > 50 ? 20 : amax > 20 ? 5 : amax > 5 ? 2 : amax > 2 ? 0.5 : 0.1; for (let v = 0; v <= amax; v += st) yt.push(v);
    axes(ctx, box, { x: X, y: Y, pal, xt: [400, 500, 600, 700, 800, 900, 1000], yt, yfmt: (v) => fmt(v, st < 1 ? 1 : 0), xl: 'λ (nm)', yl: 'coeficiente de absorção α (cm⁻¹)' });
    ctx.beginPath(); for (let l = L0; l <= L1; l += 2) { const y = Y(alphaAt(l)); l === L0 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); }
    ctx.lineTo(X(L1), box.b); ctx.lineTo(X(L0), box.b); ctx.closePath(); ctx.fillStyle = alpha(pal.ink, 0.12); ctx.fill();
    ctx.beginPath(); for (let l = L0; l <= L1; l += 2) { const y = Y(alphaAt(l)); l === L0 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); } ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, 'o que é absorvido não chega ao olho', box.r, box.t + 4, { color: pal.ink2, align: 'right', size: 11, weight: 500 });
  }
  function drawW() {
    const { ctx, w, h } = V2; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const d = (10 ** +sD.value) / 10;
    const Tf = (dd) => (l) => Math.exp(-alphaAt(l) * dd);
    // bloco grande à espessura escolhida
    const big = transmittedRGB(Tf(d), illum);
    const bx = 14, bw = Math.min(170, w * 0.32), by = 14, bh = h - 28;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 6, by - 6, bw + 12, bh + 12);
    ctx.fillStyle = big.css; roundRect(ctx, bx, by, bw, bh, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(ctx, bx + 10, by + 10, 10, bh - 20, 5); ctx.fill();
    // cunha 0 → 4d
    const wx = bx + bw + 30, ww = w - wx - 16, wy = 34, wh = Math.min(60, h * 0.35);
    for (let i = 0; i < 60; i++) { const dd = (4 * d * (i + 0.5)) / 60; ctx.fillStyle = transmittedRGB(Tf(dd), illum).css; ctx.fillRect(wx + (i * ww) / 60, wy, ww / 60 + 0.6, wh); }
    ctx.strokeStyle = pal.rule; ctx.strokeRect(wx, wy, ww, wh);
    label(ctx, 'cunha: espessura de 0 a 4×', wx, 18, { color: pal.ink, size: 12 });
    [0, 2, 4].forEach((k) => label(ctx, `${fmt(k * 10 * d, 1)} mm`, wx + (k * ww) / 4, wy + wh + 12, { color: pal.ink2, align: k === 0 ? 'left' : k === 4 ? 'right' : 'center', size: 11, weight: 500 }));
    const Tv = big.Y;
    label(ctx, `transmitância luminosa: ${fmt(100 * Tv, 0)} %`, wx, wy + wh + 40, { color: pal.ink, size: 13 });
    label(ctx, `iluminante: ${illum === 6504 ? 'luz do dia (D65)' : 'lâmpada incandescente (A)'}`, wx, wy + wh + 62, { color: pal.ink2, size: 12, weight: 500 });
    root.querySelector('#co-d-v').textContent = `${fmt(10 * d, 1)} mm`;
  }
  function draw() { V1.redraw(); V2.redraw(); }
  sD.addEventListener('input', draw);
  Object.assign(act, PRESETS[0][1]); why.textContent = `Verde-garrafa: Fe²⁺ (azul-esverdeado) + Fe³⁺ (amarelo) + um pouco de Cr³⁺. ${IONS[4].why}`; build();
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
