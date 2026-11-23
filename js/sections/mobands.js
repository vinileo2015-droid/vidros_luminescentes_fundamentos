// Extra: transparência pela teoria de orbitais moleculares. Do par Si–O às bandas do vidro,
// e como modificadores (NBO), flúor, cátions de par isolado (Pb²⁺) e íons de transferência de carga mudam o gap.
import { hiDPI, palette, alpha, label, fmt, reducedMotion, color } from '../lib/ui.js';
import { transmittedRGB, lambdaRGB } from '../lib/color.js';
import { segmented } from '../lib/props-data.js';

// Energias relativas ao topo da banda de pares isolados do oxigênio ponte (BO) = 0 eV. Valores aproximados.
const FORMERS = {
  si: { name: 'SiO₂', cat: 'Si', Eg: 8.9, nbo: (y) => (2 * y) / (2 - y), note: 'Si 3s/3p + O 2p: o σ* Si–O fica alto, e o gap é largo.' },
  b: { name: 'B₂O₃', cat: 'B', Eg: 7.8, nbo: (y) => { const R = y / (1 - y); const N4 = R <= 0.5 ? R : Math.max(0, (3 - R) / 5); const free = Math.max(0, R - N4); return (2 * free) / (3 + R); }, note: 'Até R ≈ 0,5 o álcali converte BO₃ em BO₄⁻ sem criar NBO: o gap quase não se move (anomalia do boro).' },
  p: { name: 'P₂O₅', cat: 'P', Eg: 7.6, nbo: (y) => (0.4 * (1 - y) * 5 + 2 * y) / (5 * (1 - y) + y), note: 'Cada PO₄ já tem um oxigênio terminal (P=O). Ele fica um pouco acima dos BO e limita a borda desde o início.' },
  ge: { name: 'GeO₂', cat: 'Ge', Eg: 5.9, nbo: (y) => (2 * y) / (2 - y), note: 'Os orbitais 4s/4p do Ge formam um σ* mais baixo que o do Si: o gap encolhe para ~6 eV e o índice de refração sobe.' },
  as: { name: 'As₂S₃', cat: 'As', Eg: 2.35, chalc: true, note: 'Calcogeneto: os pares isolados do S 3p ficam bem mais altos que os do O 2p, e o gap cai para 2,35 eV. O vidro é laranja-avermelhado.' },
  ase: { name: 'As₂Se₃', cat: 'As', Eg: 1.75, chalc: true, note: 'Com Se 4p o gap cai a ~1,75 eV: todo o visível é absorvido e o vidro parece preto, mas é transparente no infravermelho.' },
};
const EU = 0.3; // largura de Urbach efetiva (eV) usada para combinar estados

export function init(root) {
  const cv = root.querySelector('#mo-canvas'), cs = root.querySelector('#mo-strip');
  const sM = root.querySelector('#mo-m'), sF = root.querySelector('#mo-f'), sPb = root.querySelector('#mo-pb');
  const tTi = root.querySelector('#mo-ti'), tCe = root.querySelector('#mo-ce'), tFe = root.querySelector('#mo-fe');
  let fid = 'si';
  segmented(root.querySelector('#mo-former'), Object.entries(FORMERS).map(([k, v]) => [k, v.name]), (k) => { fid = k; compute(); }, 'si');
  const V = hiDPI(cv, () => draw()), VS = hiDPI(cs, () => drawStrip());
  let tgt = null, cur = null, raf = null;

  function compute() {
    const F = FORMERS[fid], chalc = !!F.chalc;
    [sM, sF, sPb, tTi, tCe, tFe].forEach((e) => (e.disabled = chalc));
    const y = chalc ? 0 : +sM.value / 100, fF = chalc ? 0 : +sF.value / 100, yPb = chalc ? 0 : +sPb.value / 100;
    let xN = chalc ? 0 : F.nbo(y);
    // o flúor substitui primeiro os NBO (Si–O⁻ ⋯ M⁺ → Si–F), depois oxigênios ponte
    const xF = fF; const xNBO = Math.max(0, xN - xF * 0.8); const xBO = Math.max(0, 1 - xF - xNBO);
    const cands = [];
    const CB = F.Eg; // mínimo da banda de condução (σ* do formador)
    if (chalc) cands.push({ k: 'lp', name: 'pares isolados do calcogênio → σ*', occ: 0, emp: F.Eg, w: 1 });
    else {
      cands.push({ k: 'bo', name: 'O 2p (ponte) → σ*', occ: 0, emp: CB, w: xBO });
      if (xNBO > 1e-4) cands.push({ k: 'nbo', name: 'O 2p (NBO) → σ*', occ: fid === 'p' ? 1.6 : 2.7, emp: CB, w: xNBO });
      if (xF > 1e-4) cands.push({ k: 'f', name: 'F 2p → σ*', occ: -3.0, emp: CB, w: xF });
      if (yPb > 1e-4) cands.push({ k: 'pb', name: 'Pb²⁺ 6s² → 6p', occ: 1.0 + 1.6 * yPb, emp: 6.0 - 1.1 * yPb, w: yPb * 10 });
      if (tTi.checked) cands.push({ k: 'ti', name: 'O 2p → Ti⁴⁺ 3d (TC)', occ: 0, emp: 3.9, w: 1 });
      if (tCe.checked) cands.push({ k: 'ce', name: 'O 2p → Ce⁴⁺ 4f (TC)', occ: 0, emp: 3.95, w: 1 });
      if (tFe.checked) cands.push({ k: 'fe', name: 'O 2p → Fe³⁺ 3d (TC)', occ: 0, emp: 5.4, w: 1 });
    }
    let s = 0; for (const c of cands) s += c.w * Math.exp(-(c.emp - c.occ) / EU);
    const Eg = -EU * Math.log(s);
    let dom = cands[0]; for (const c of cands) if (c.w * Math.exp(-(c.emp - c.occ) / EU) > dom.w * Math.exp(-(dom.emp - dom.occ) / EU)) dom = c;
    tgt = { fid, chalc, xBO, xNBO, xF, yPb, CB, Eg, dom, cands, ti: tTi.checked && !chalc, ce: tCe.checked && !chalc, fe: tFe.checked && !chalc };
    if (!cur || reducedMotion()) cur = { ...tgt }; else if (!raf) raf = requestAnimationFrame(step);
    out(); V.redraw(); VS.redraw();
  }
  function step() {
    raf = null; let moving = false;
    for (const k of ['xBO', 'xNBO', 'xF', 'yPb', 'CB']) { const d = tgt[k] - cur[k]; if (Math.abs(d) > 1e-3) { cur[k] += d * 0.22; moving = true; } else cur[k] = tgt[k]; }
    Object.assign(cur, { fid: tgt.fid, chalc: tgt.chalc, Eg: tgt.Eg, dom: tgt.dom, cands: tgt.cands, ti: tgt.ti, ce: tgt.ce, fe: tgt.fe });
    V.redraw(); if (moving) raf = requestAnimationFrame(step);
  }
  function out() {
    const { Eg, dom } = tgt, l = 1239.84 / Eg;
    root.querySelector('#mo-m-v').textContent = `${fmt(+sM.value)} % mol`;
    root.querySelector('#mo-f-v').textContent = `${fmt(+sF.value)} % dos ânions`;
    root.querySelector('#mo-pb-v').textContent = `${fmt(+sPb.value)} % mol`;
    root.querySelector('#mo-eg').textContent = `${fmt(Eg, 2)} eV`;
    root.querySelector('#mo-l').textContent = `${fmt(l)} nm`;
    const r = 1 - Math.sqrt(Math.min(20, Eg) / 20), n = Math.sqrt((1 + 2 * r) / (1 - r));
    root.querySelector('#mo-n').textContent = `≈ ${fmt(n, 2)}`;
    root.querySelector('#mo-nbo').textContent = tgt.chalc ? '–' : fmt(tgt.xNBO * 100, 0) + ' %';
    root.querySelector('#mo-note').textContent = `${FORMERS[fid].note} Transição que define a borda agora: ${dom.name}. ${l < 380 ? 'A borda está no UV: o vidro é incolor.' : l < 520 ? 'A borda invade o azul: o vidro fica amarelado.' : l < 700 ? 'A borda corta boa parte do visível: o vidro é laranja ou vermelho.' : 'Todo o visível é absorvido: o vidro parece preto.'}`;
  }

  function draw() {
    if (!cur) return;
    const { ctx, w, h } = V; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const narrow = w < 620;
    const E0 = -12, E1 = 13, top = 22, bot = h - 18;
    const Y = (E) => bot - ((E - E0) / (E1 - E0)) * (bot - top);
    const colA = narrow ? 0 : w * 0.06, colM = narrow ? 0 : w * 0.3, colG = narrow ? 56 : w * 0.58, gw = narrow ? w - 70 : w * 0.38;
    ctx.font = '600 12px "Schibsted Grotesk", system-ui';
    // eixo
    ctx.strokeStyle = pal.rule; ctx.beginPath(); ctx.moveTo(colG - 10, top); ctx.lineTo(colG - 10, bot); ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '11px "Schibsted Grotesk", system-ui';
    for (let E = -10; E <= 12; E += 2) ctx.fillText(`${E > 0 ? '+' : ''}${E}`, colG - 14, Y(E));
    label(ctx, 'E (eV)', colG - 14, top - 10, { color: pal.ink, align: 'right', size: 11 });
    const F = FORMERS[cur.fid];
    // ---- coluna atômica e molecular (só em telas largas)
    if (!narrow) {
      const lvl = (x, E, ww, col, txt, side = 'left') => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, Y(E)); ctx.lineTo(x + ww, Y(E)); ctx.stroke(); if (txt) label(ctx, txt, side === 'left' ? x - 4 : x + ww + 4, Y(E), { color: col, align: side === 'left' ? 'right' : 'left', size: 11 }); };
      const xA = colA + 40, xO = colA + 40, wA = 46;
      const catE = cur.chalc ? 2.2 : F.Eg * 0.55 + 0.5, anE = cur.chalc ? -0.8 : -1.6;
      lvl(xA, catE, wA, pal.cryst, `${F.cat} (sp³)`);
      lvl(xO, anE, wA, pal.liq, cur.chalc ? (cur.fid === 'as' ? 'S 3p' : 'Se 4p') : 'O 2p');
      label(ctx, 'átomos', xA + wA / 2, top, { color: pal.ink2, align: 'center', size: 11 });
      // MO de uma ligação
      const xm = colM, wm = 70;
      const sig = cur.chalc ? -5 : -6.5, n0 = cur.chalc ? 0 : -0.8, sst = cur.CB + 1.2;
      lvl(xm, sig, wm, pal.glass, 'σ ligante', 'right');
      lvl(xm, n0, wm, pal.liq, 'n (par isolado)', 'right');
      lvl(xm, sst, wm, pal.cryst, 'σ* antiligante', 'right');
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = alpha(pal.ink2, 0.7); ctx.lineWidth = 1;
      [[xA + wA, catE, xm, sst], [xA + wA, catE, xm, sig], [xO + wA, anE, xm, sig], [xO + wA, anE, xm, n0], [xO + wA, anE, xm, sst]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, Y(b)); ctx.lineTo(c, Y(d)); ctx.stroke(); });
      ctx.restore();
      label(ctx, 'uma ligação', xm + wm / 2, top, { color: pal.ink2, align: 'center', size: 11 });
      // elétrons
      ctx.fillStyle = pal.ink; [sig, n0].forEach((E) => { [-6, 6].forEach((dx) => { ctx.beginPath(); ctx.arc(xm + wm / 2 + dx, Y(E) - 6, 2.6, 0, 6.283); ctx.fill(); }); });
    }
    label(ctx, `vidro de ${F.name}${cur.chalc ? '' : ''}: bandas`, colG + gw / 2, top, { color: pal.ink2, align: 'center', size: 11 });
    // ---- bandas do vidro
    const band = (E0b, E1b, frac, col, txt, x0 = colG, ww = gw) => {
      if (frac <= 0.002) return;
      const wv = ww * Math.min(1, 0.25 + 0.75 * frac);
      ctx.fillStyle = alpha(col, 0.28); ctx.fillRect(x0, Y(E1b), wv, Y(E0b) - Y(E1b));
      ctx.fillStyle = col; ctx.fillRect(x0, Y(E1b), wv, 2);
      if (txt) label(ctx, txt, x0 + wv + 6, (Y(E0b) + Y(E1b)) / 2, { color: col, size: 11 });
    };
    const gwB = gw * 0.62;
    band(-11, -4.5, 1, pal.glass, 'σ ligante', colG, gwB);
    if (cur.chalc) band(-2.2, 0, 1, pal.liq, 'pares isolados', colG, gwB);
    else {
      band(-2.6, 0, cur.xBO, pal.liq, 'O 2p ponte', colG, gwB);
      band(cur.fid === 'p' ? 0.2 : 0.9, cur.fid === 'p' ? 1.6 : 2.7, cur.xNBO * 2.2, pal.scl, 'O 2p NBO', colG, gwB);
      band(-5.2, -3.0, cur.xF * 2, color('--cond'), 'F 2p', colG, gwB);
    }
    band(cur.CB, 12.5, 1, pal.cryst, 'σ* (condução)', colG, gwB);
    // estados localizados
    const loc = (E, col, txt, occ) => { const x = colG + gwB * 0.15, ww = gwB * 0.4; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash(occ ? [] : [4, 3]); ctx.beginPath(); ctx.moveTo(x, Y(E)); ctx.lineTo(x + ww, Y(E)); ctx.stroke(); ctx.setLineDash([]); label(ctx, txt, x + ww + 6, Y(E), { color: col, size: 11 }); };
    if (cur.yPb > 0.003) { loc(1.0 + 1.6 * cur.yPb, pal.liq, 'Pb 6s² (cheio)', true); loc(6.0 - 1.1 * cur.yPb, pal.liq, 'Pb 6p (vazio)', false); }
    if (cur.ti) loc(3.9, pal.scl, 'Ti⁴⁺ 3d (vazio)', false);
    if (cur.ce) loc(3.95 + (cur.ti ? 0.6 : 0), pal.scl, 'Ce⁴⁺ 4f (vazio)', false);
    if (cur.fe) loc(5.4, pal.scl, 'Fe³⁺ 3d (vazio)', false);
    // seta do gap
    const d = cur.dom, xg = colG + gwB + (narrow ? 8 : 26);
    const yo = Y(d.occ), ye = Y(d.emp);
    ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xg, yo); ctx.lineTo(xg, ye + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xg, ye); ctx.lineTo(xg - 5, ye + 9); ctx.lineTo(xg + 5, ye + 9); ctx.fill();
    label(ctx, `Eg ≈ ${fmt(cur.Eg, 1)} eV`, xg + 8, (yo + ye) / 2, { color: pal.ink, size: 13, weight: 700, bg: alpha(pal.panel, 0.85) });
  }
  function drawStrip() {
    if (!tgt) return;
    const { ctx, w, h } = VS; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const L0 = 100, L1 = 1000, X = (l) => 10 + ((l - L0) / (L1 - L0)) * (w - 20 - 110);
    const Eg = tgt.Eg, lc = 1239.84 / Eg;
    const px0 = Math.floor(X(L0)), px1 = Math.ceil(X(L1));
    for (let px = px0; px < px1; px++) {
      const l = L0 + ((px + 0.5 - X(L0)) / (X(L1) - X(L0))) * (L1 - L0);
      const E = 1239.84 / l, a = 1e4 * Math.exp((E - Eg) / 0.08), T = Math.exp(-Math.min(50, a * 0.5));
      ctx.fillStyle = l >= 380 && l <= 780 ? lambdaRGB(l) : alpha(pal.ink2, 0.35);
      ctx.globalAlpha = 0.12 + 0.88 * T; ctx.fillRect(px, 22, 1, h - 44); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = pal.ink; ctx.fillRect(X(Math.min(L1, lc)) - 1, 16, 2, h - 32);
    label(ctx, `borda ≈ ${fmt(lc)} nm`, X(Math.min(L1, lc)) + (lc > 700 ? -6 : 6), 10, { color: pal.ink, align: lc > 700 ? 'right' : 'left', size: 11 });
    (w < 600 ? [100, 380, 780, 1000] : [100, 200, 380, 780, 1000]).forEach((l) => label(ctx, `${l}`, X(l), h - 8, { color: pal.ink2, align: 'center', size: 10, weight: 500 }));
    if (w >= 600) label(ctx, 'UV', X(240), h - 8, { color: pal.cryst, align: 'center', size: 10 }); label(ctx, 'visível', X(580), h - 8, { color: pal.ink, align: 'center', size: 10 });
    // amostra de 5 mm
    const sw = transmittedRGB((l) => { const E = 1239.84 / l; return Math.exp(-Math.min(60, 1e4 * Math.exp((E - Eg) / 0.08) * 0.5)); });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(w - 100, 8, 92, h - 16);
    ctx.fillStyle = sw.css; ctx.fillRect(w - 94, 14, 80, h - 28);
    label(ctx, '5 mm', w - 54, h / 2, { color: sw.Y > 0.4 ? '#333' : '#eee', align: 'center', size: 11 });
  }
  [sM, sF, sPb].forEach((s) => s.addEventListener('input', compute));
  [tTi, tCe, tFe].forEach((s) => s.addEventListener('change', compute));
  compute();
}
