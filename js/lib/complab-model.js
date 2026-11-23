// Contabilidade estrutural simplificada para o laboratório de composição.
// Regras didáticas (silicato-modelo), na ordem em que a carga dos modificadores é "gasta":
//   1. [4]Al  — cada AlO4⁻ consome 1 carga positiva de modificador (compensação)
//   2. [4]B   — BO3 → BO4⁻, até N4 = R (R = carga disponível / 2 por B2O3), no máximo 0,5
//   3. [4]Fe³⁺ — como o Al
//   4. [6]Zr  — ZrO6²⁻ consome 2 cargas
//   5. [4]Zn, [4]Be — consomem 2 cargas cada; sem compensação viram modificadores
//   6. o que sobra gera NBOs: 1 NBO por carga positiva (NBO/T = 2·O/T − 4, Handbook eq. 13.3)
import { BY_ID, oxFraction } from './oxides.js';

export function analyze(comp, { logfO2 = -0.68 } = {}) {
  // comp: { id: mol } (não precisa somar 100)
  const tot = Object.values(comp).reduce((s, v) => s + v, 0) || 1;
  const x = Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, (100 * v) / tot]));
  const n = (id) => x[id] || 0;

  const T = {};            // unidades formadoras de rede por espécie
  const addT = (k, v) => { if (v > 0) T[k] = (T[k] || 0) + v; };
  let charge = 0;          // carga positiva de modificadores livres
  const mods = {};         // cátions modificadores por espécie (contagem de cátions)
  const addMod = (k, cations, z) => { if (cations > 0) { mods[k] = (mods[k] || 0) + cations; charge += cations * z; } };
  const notes = [];

  // formadores clássicos
  addT('Si', n('SiO2')); addT('Ge', n('GeO2')); addT('P', 2 * n('P2O5')); addT('As', 2 * n('As2O3'));
  const nB = 2 * n('B2O3');
  // condicionais (entram como unidades de rede)
  addT('Te', n('TeO2')); addT('Bi', 2 * n('Bi2O3')); addT('V', 2 * n('V2O5')); addT('Mo', n('MoO3')); addT('W', n('WO3'));
  addT('Ti', n('TiO2'));
  // modificadores
  for (const id of ['Li2O', 'Na2O', 'K2O']) addMod(BY_ID[id].el, 2 * n(id), 1);
  for (const id of ['MgO', 'CaO', 'BaO']) addMod(BY_ID[id].el, n(id), 2);
  // PbO: modificador em teor baixo; acima de ~30 % passa a formar rede (pirâmides PbO4)
  const pb = n('PbO');
  const pbForm = pb > 0 ? pb * Math.min(1, Math.max(0, (pb - 30) / 30)) : 0;
  addT('Pb', pbForm); addMod('Pb', pb - pbForm, 2);
  if (pbForm > 0) notes.push('Com muito PbO, parte do chumbo forma pirâmides PbO₄ que sustentam a rede.');
  // polivalentes
  const redox = {};
  for (const id of ['Fe', 'Eu', 'Ce', 'Cu']) {
    if (!n(id)) continue;
    const o = BY_ID[id];
    const fox = oxFraction(o, logfO2);
    const cations = o.cat * n(id);
    redox[id] = { fox, ox: cations * fox, red: cations * (1 - fox), o };
  }
  if (redox.Cu) { addMod('Cu2+', redox.Cu.ox, 2); addMod('Cu+', redox.Cu.red, 1); }
  if (redox.Eu) { addMod('Eu3+', redox.Eu.ox, 3); addMod('Eu2+', redox.Eu.red, 2); }
  if (redox.Ce) { addMod('Ce4+', redox.Ce.ox, 4); addMod('Ce3+', redox.Ce.red, 3); }
  if (redox.Fe) addMod('Fe2+', redox.Fe.red, 2);

  // ---- compensação de carga ----
  const comp4 = {};
  const take = (need) => { const g = Math.min(need, charge); charge -= g; return g; };
  const nAl = 2 * n('Al2O3');
  const alC = take(nAl);
  comp4.Al = alC; addT('Al4', alC);
  const alHigh = nAl - alC;
  addT('Al6', alHigh);
  if (alHigh > 0.01) notes.push('Al/M > 1 (peraluminoso): falta modificador para compensar todo o Al, que passa a coordenação 5–6.');
  // boro
  let nB4 = 0;
  if (nB > 0) {
    const R = charge / 2 / n('B2O3');
    const N4 = Math.min(Math.max(R, 0), 0.5);
    nB4 = take(N4 * nB);
    addT('B4', nB4); addT('B3', nB - nB4);
  }
  // Fe³⁺
  if (redox.Fe) {
    const f4 = take(redox.Fe.ox);
    addT('Fe4', f4);
    const f6 = redox.Fe.ox - f4;
    if (f6 > 0) { addMod('Fe3+', f6, 3); notes.push('Parte do Fe³⁺ ficou sem compensação e ocupa sítios octaédricos, como modificador.'); }
    comp4.Fe = f4;
  }
  // Zr
  const nZr = n('ZrO2');
  const zrC = take(2 * nZr) / 2;
  addT('Zr6', nZr);
  comp4.Zr = zrC * 2;
  if (nZr - zrC > 0.01) notes.push('Parte do ZrO₂ ficou sem cátions compensadores: tende a separar fase e precipitar ZrO₂.');
  // Zn, Be
  for (const id of ['ZnO', 'BeO']) {
    const nn = n(id); if (!nn) continue;
    const el = BY_ID[id].el;
    const c = take(2 * nn) / 2;
    addT(el + '4', c); comp4[el] = c * 2;
    if (nn - c > 0.001) addMod(el, nn - c, 2);
  }
  const nbo = Math.max(0, charge);

  // ---- índices ----
  const Tsum = Object.entries(T).reduce((s, [k, v]) => s + v, 0);
  const nboT = Tsum > 0 ? nbo / Tsum : Infinity;
  // distribuição Qⁿ (modelo binário, rede de unidades com 4 vértices)
  const nbar = Math.max(0, Math.min(4, 4 - nboT));
  const lo = Math.floor(nbar), hi = Math.min(4, lo + 1), w = nbar - lo;
  const Q = [0, 0, 0, 0, 0];
  if (isFinite(nboT)) { Q[lo] += 1 - w; if (hi !== lo) Q[hi] += w; else Q[lo] = 1; }

  // basicidade óptica Λ = Σ X_O,i Λ_i (Handbook eq. 13.11)
  let lamNum = 0, lamDen = 0; const missing = [];
  for (const [id, v] of Object.entries(x)) {
    const o = BY_ID[id];
    if (!o || o.ox === 0 || v === 0) continue;
    let lam = o.lam;
    if (id === 'Fe' && redox.Fe) lam = redox.Fe.fox * o.lam + (1 - redox.Fe.fox) * o.lamr;
    if (lam == null) { missing.push(o.f); continue; }
    lamNum += v * o.ox * lam; lamDen += v * o.ox;
  }
  const Lambda = missing.length || !lamDen ? null : lamNum / lamDen;

  // formabilidade (heurística qualitativa)
  const classic = n('SiO2') + n('GeO2') + n('P2O5') + n('B2O3') + n('As2O3');
  const cond = n('TeO2') + n('Bi2O3') + n('V2O5') + n('MoO3') + n('WO3');
  const partners = 100 - cond - n('Pt') - n('Ag') - n('Au');
  let gf, gfText;
  if (classic + cond + pbForm < 1) { gf = 'no'; gfText = 'Não há formador de rede: o fundido cristaliza ao resfriar (as regras de Zachariasen não são satisfeitas).'; }
  else if (classic < 1 && cond > 0 && partners < 8) { gf = 'no'; gfText = 'Formador condicional quase puro: em resfriamento comum, cristaliza. Adicione um parceiro (modificador ou outro óxido).'; }
  else if (nboT > 2.6) { gf = 'hard'; gfText = 'Rede muito fragmentada (NBO/T alto): só vitrifica com resfriamento rápido, se tanto.'; }
  else if (classic < 30 && cond < 30 && nboT > 1.6) { gf = 'hard'; gfText = 'Pouco formador para o teor de modificadores: formação de vidro difícil.'; }
  else if (classic < 1 && cond > 0) { gf = 'yes'; gfText = 'Formador condicional com parceiro: forma vidro em resfriamento comum.'; }
  else { gf = 'yes'; gfText = 'Composição formadora de vidro em resfriamento comum (estimativa qualitativa).'; }

  return { x, T, Tsum, mods, nbo, nboT, Q, Lambda, missing, comp4, nB4, redox, notes, gf, gfText };
}
