// Laboratório de composição: escolha óxidos (um ou vários) e veja como cada cátion entra na rede-modelo.
import { buildCRN } from '../lib/crn.js';
import { OXIDES, BY_ID, CLASSES, fieldStrength, oxFraction } from '../lib/oxides.js';
import { analyze } from '../lib/complab-model.js';
import { hiDPI, palette, alpha, label, fmt, reducedMotion } from '../lib/ui.js';
import { mulberry32 } from '../lib/md-engine.js';

const W = 17, H = 10.5;
const PRESETS = [
  ['Sílica pura', { SiO2: 100 }],
  ['Sodo-cálcico', { SiO2: 74, Na2O: 16, CaO: 10 }],
  ['Borossilicato', { SiO2: 80, B2O3: 13, Na2O: 5, Al2O3: 2 }],
  ['Aluminossilicato alcalino', { SiO2: 64, Al2O3: 13, Na2O: 13, K2O: 3, MgO: 7 }],
  ['Telurito TZN', { TeO2: 75, ZnO: 20, Na2O: 5 }],
  ['Verde de garrafa', { SiO2: 72, Na2O: 14, CaO: 12, Fe: 2 }],
  ['Base de vitrocerâmica LAS', { SiO2: 68, Al2O3: 13, Li2O: 13, MgO: 2, TiO2: 2.5, ZrO2: 1.5 }],
];
const ION_LABEL = { Li: 'Li⁺', Na: 'Na⁺', K: 'K⁺', Mg: 'Mg²⁺', Ca: 'Ca²⁺', Ba: 'Ba²⁺', Pb: 'Pb²⁺', Zn: 'Zn²⁺', Be: 'Be²⁺', 'Fe2+': 'Fe²⁺', 'Fe3+': 'Fe³⁺', 'Eu2+': 'Eu²⁺', 'Eu3+': 'Eu³⁺', 'Ce3+': 'Ce³⁺', 'Ce4+': 'Ce⁴⁺', 'Cu+': 'Cu⁺', 'Cu2+': 'Cu²⁺' };
const ION_Z = { Li: 1, Na: 1, K: 1, Mg: 2, Ca: 2, Ba: 2, Pb: 2, Zn: 2, Be: 2, 'Fe2+': 2, 'Fe3+': 3, 'Eu2+': 2, 'Eu3+': 3, 'Ce3+': 3, 'Ce4+': 4, 'Cu+': 1, 'Cu2+': 2 };
const ION_R = { Li: 0.76, Na: 1.02, K: 1.51, Mg: 0.72, Ca: 1.0, Ba: 1.42, Pb: 1.19, Zn: 0.74, Be: 0.45, 'Fe2+': 0.78, 'Fe3+': 0.645, 'Eu2+': 1.25, 'Eu3+': 0.95, 'Ce3+': 1.14, 'Ce4+': 0.97, 'Cu+': 0.6, 'Cu2+': 0.73 };
const ION_SRC = { Li: 'Li2O', Na: 'Na2O', K: 'K2O', Mg: 'MgO', Ca: 'CaO', Ba: 'BaO', Pb: 'PbO', Zn: 'ZnO', Be: 'BeO', 'Fe2+': 'Fe', 'Fe3+': 'Fe', 'Eu2+': 'Eu', 'Eu3+': 'Eu', 'Ce3+': 'Ce', 'Ce4+': 'Ce', 'Cu+': 'Cu', 'Cu2+': 'Cu' };
// tipo de sítio de rede → óxido de origem e cor
const SITE = {
  Si: ['SiO2'], Ge: ['GeO2'], P: ['P2O5'], As: ['As2O3'], B3: ['B2O3'], B4: ['B2O3'], Te: ['TeO2'], Bi: ['Bi2O3'], V: ['V2O5'], Mo: ['MoO3'], W: ['WO3'],
  Ti: ['TiO2'], Al4: ['Al2O3'], Al6: ['Al2O3'], Fe4: ['Fe'], Zr6: ['ZrO2'], Zn4: ['ZnO'], Be4: ['BeO'], Pb: ['PbO'],
};

export function init(root) {
  const $ = (s) => root.querySelector(s);
  const cv = $('#lab-canvas');
  const pal0 = $('#lab-palette'), list = $('#lab-comp'), info = $('#lab-info'), trends = $('#lab-trends');
  const out = { nbo: $('#lab-nbo'), lam: $('#lab-lam'), gf: $('#lab-gf'), q: $('#lab-q'), notes: $('#lab-notes'), bar: $('#lab-bar') };
  const redoxBox = $('#lab-redox'), redoxS = $('#lab-fo2'), redoxV = $('#lab-fo2-v'), redoxR = $('#lab-redox-r');
  const heatBtn = $('#lab-heat'), presets = $('#lab-presets');

  const net = buildCRN({ W, H, seed: 9 });
  const rand = mulberry32(21);
  // ordens fixas (para que acrescentar um óxido mude a rede aos poucos, sem embaralhar tudo)
  const siteOrder = net.A.map((_, i) => i).sort(() => rand() - 0.5);
  const bridgeOrder = net.bridges.map((_, i) => i).sort(() => rand() - 0.5);
  const visA = net.A.map((p) => p[0] > -0.6 && p[1] > -0.6 && p[0] < W + 0.6 && p[1] < H + 0.6);
  const nVis = visA.filter(Boolean).length;
  // direção "para fora" de cada A (para desenhar ligações terminais e pares isolados)
  const outward = net.A.map((p, i) => {
    const os = net.tri[i]; let sx = 0, sy = 0;
    os.forEach((o) => { sx += net.O[o][0] - p[0]; sy += net.O[o][1] - p[1]; });
    const d = Math.hypot(sx, sy);
    if (d < 0.2) return [0, -1];
    return [-sx / d, -sy / d];
  });
  const oBridge = new Map(); net.bridges.forEach((b, bi) => oBridge.set(b.o, bi));
  const voids = net.rings.map((r) => r.c).filter((c) => c[0] > 0.5 && c[1] > 0.5 && c[0] < W - 0.5 && c[1] < H - 0.5);

  let comp = { SiO2: 74, Na2O: 16, CaO: 10 };
  let focus = 'CaO';
  let logfO2 = -0.68;
  let heat = 0;               // progresso do tratamento térmico (0 a 1)
  let heating = false;
  let layout = null, prev = null, anim = 1;

  // ---------- paleta ----------
  pal0.innerHTML = Object.entries(CLASSES).map(([k, c]) => {
    const items = OXIDES.filter((o) => o.cls === k || (k === 'nucleant' && o.nucleant));
    return `<div class="lab-group"><div class="lab-gh"><span class="dot" style="color:var(${c.color})"></span>${c.name}</div>
      <div class="lab-chips">${items.map((o) => `<button type="button" class="chip" data-id="${o.id}" style="--c:${o.color}" aria-pressed="false">${o.f}</button>`).join('')}</div></div>`;
  }).join('');
  pal0.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const id = b.dataset.id;
    if (comp[id] != null) {
      if (focus === id) { delete comp[id]; focus = Object.keys(comp).slice(-1)[0] || null; }
      else focus = id;
    } else { comp[id] = BY_ID[id].def; focus = id; }
    update(true);
  });
  presets.innerHTML = PRESETS.map(([n], i) => `<button type="button" class="btn" data-i="${i}">${n}</button>`).join('');
  presets.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    comp = { ...PRESETS[Number(b.dataset.i)][1] };
    focus = Object.keys(comp).find((k) => BY_ID[k].cls !== 'former') || Object.keys(comp)[0];
    heat = 0; heating = false; heatBtn.textContent = 'Aplicar tratamento térmico'; update(true);
  });
  redoxS.addEventListener('input', () => { logfO2 = Number(redoxS.value); update(true); });
  heatBtn.addEventListener('click', () => {
    if (heating || heat >= 1) { heat = 0; heating = false; heatBtn.textContent = 'Aplicar tratamento térmico'; draw(); return; }
    heating = true; heatBtn.textContent = 'Voltar ao vidro'; loop();
  });

  // ---------- lista de composição ----------
  function renderList(r) {
    const ids = Object.keys(comp);
    list.innerHTML = ids.map((id) => {
      const o = BY_ID[id];
      const step = o.max <= 1 ? 0.01 : o.max <= 5 ? 0.1 : 0.5;
      return `<div class="lab-row${id === focus ? ' on' : ''}" data-id="${id}">
        <button type="button" class="lab-name" data-act="focus" style="--c:${o.color}" aria-label="Ver detalhes de ${o.f}">${o.f}</button>
        <input type="range" min="0" max="${o.max}" step="${step}" value="${comp[id]}" aria-label="Quantidade de ${o.f} (mol)">
        <span class="lab-pct">${fmt(r.x[id] || 0, (r.x[id] || 0) < 1 ? 2 : 1)} %</span>
        <button type="button" class="lab-x" data-act="rm" aria-label="Remover ${o.f}">×</button></div>`;
    }).join('') || '<p class="note">Escolha um ou mais compostos na paleta.</p>';
  }
  list.addEventListener('input', (e) => {
    const row = e.target.closest('.lab-row'); if (!row) return;
    comp[row.dataset.id] = Number(e.target.value); focus = row.dataset.id;
    update(false, true);
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.closest('.lab-row').dataset.id;
    if (b.dataset.act === 'rm') { delete comp[id]; if (focus === id) focus = Object.keys(comp).slice(-1)[0] || null; update(true); }
    else { focus = id; update(false); }
  });

  // ---------- disposição dos átomos ----------
  function computeLayout(r) {
    // tipos dos sítios
    const types = Object.entries(r.T).filter(([, v]) => v > 1e-6);
    const tot = types.reduce((s, [, v]) => s + v, 0) || 1;
    const N = net.A.length;
    const counts = types.map(([k, v]) => [k, (v / tot) * N]);
    const ints = counts.map(([k, v]) => [k, Math.floor(v), v - Math.floor(v)]);
    let left = N - ints.reduce((s, t) => s + t[1], 0);
    ints.sort((a, b) => b[2] - a[2]).forEach((t) => { if (left > 0) { t[1]++; left--; } });
    // espécies minoritárias selecionadas aparecem ao menos uma vez
    ints.forEach((t) => { if (t[1] === 0 && (r.T[t[0]] || 0) > 0.05) t[1] = 1; });
    const siteType = new Array(N).fill('Si');
    // ordem: minoritários primeiro nos sítios visíveis
    const order = siteOrder.filter((i) => visA[i]).concat(siteOrder.filter((i) => !visA[i]));
    let k = 0;
    ints.sort((a, b) => a[1] - b[1]).forEach(([t, c]) => { for (let j = 0; j < c && k < N; j++) siteType[order[k++]] = t; });
    while (k < N) siteType[order[k++]] = ints.length ? ints[ints.length - 1][0] : 'Si';
    if (!types.length) siteType.fill(null);

    // pontes quebradas (NBO): em 2D cada A tem 3 oxigênios em vez de 4
    const nboPerSite = isFinite(r.nboT) ? r.nboT * 0.75 : 3;
    let nBreak = Math.min(net.bridges.length, Math.round((nboPerSite * N) / 2));
    const broken = new Set(bridgeOrder.slice(0, nBreak));

    // cargas de compensação
    const compSlots = [];
    net.A.forEach((p, i) => {
      const t = siteType[i];
      const need = t === 'Al4' || t === 'B4' || t === 'Fe4' ? 1 : t === 'Zr6' || t === 'Zn4' || t === 'Be4' ? 2 : 0;
      const [ox, oy] = outward[i];
      for (let j = 0; j < need; j++) compSlots.push({ x: p[0] + ox * 1.05 + (j ? -oy : oy) * 0.45 * (need > 1 ? 1 : 0), y: p[1] + oy * 1.05 + (j ? ox : -ox) * 0.45 * (need > 1 ? 1 : 0), site: i });
    });
    // posições dos NBOs
    const nboPos = [];
    const bridgeState = net.bridges.map((b, bi) => {
      if (!broken.has(bi)) return null;
      const res = {};
      for (const [key, a] of [['pa', b.a], ['pb', b.b]]) {
        const A0 = net.A[a], O0 = net.O[b.o];
        let dx = O0[0] - A0[0], dy = O0[1] - A0[1];
        const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        // gira levemente para afastar os dois NBOs
        const s = key === 'pa' ? 0.32 : -0.32;
        const rx = dx * Math.cos(s) - dy * Math.sin(s), ry = dx * Math.sin(s) + dy * Math.cos(s);
        res[key] = [A0[0] + rx, A0[1] + ry];
      }
      nboPos.push({ x: (res.pa[0] + res.pb[0]) / 2, y: (res.pa[1] + res.pb[1]) / 2, a: res.pa }, { x: (res.pa[0] + res.pb[0]) / 2, y: (res.pa[1] + res.pb[1]) / 2, a: res.pb });
      return res;
    });

    // íons: distribui a carga entre espécies modificadoras
    const modCharge = Object.entries(r.mods).map(([k, v]) => [k, v * ION_Z[k]]).filter(([, c]) => c > 1e-6);
    const totC = modCharge.reduce((s, [, c]) => s + c, 0);
    const slots = [...compSlots.map((s) => ({ ...s, kind: 'comp' })), ...nboPos.map((s) => ({ ...s, kind: 'nbo' }))];
    const ions = [];
    if (totC > 0 && slots.length) {
      const S = slots.length;
      let plan = modCharge.map(([k, c]) => [k, Math.max(1, Math.round(((c / totC) * S) / ION_Z[k]))]);
      // não exceder as vagas: reduz a espécie majoritária
      let used = plan.reduce((s, [k, n]) => s + n * ION_Z[k], 0);
      plan.sort((a, b) => b[1] * ION_Z[b[0]] - a[1] * ION_Z[a[0]]);
      while (used > S && plan[0][1] > 1) { plan[0][1]--; used -= ION_Z[plan[0][0]]; plan.sort((a, b) => b[1] * ION_Z[b[0]] - a[1] * ION_Z[a[0]]); }
      // intercala espécies
      const seq = [];
      const rem = plan.map(([k, n]) => [k, n]);
      while (rem.some(([, n]) => n > 0)) rem.forEach((t) => { if (t[1] > 0) { seq.push(t[0]); t[1]--; } });
      let si = 0;
      for (const sp of seq) {
        const z = ION_Z[sp];
        const take = slots.slice(si, si + z); si += z;
        if (!take.length) break;
        const cx = take.reduce((s, t) => s + t.x, 0) / take.length, cy = take.reduce((s, t) => s + t.y, 0) / take.length;
        let px = cx, py = cy;
        if (take[0].kind === 'nbo' && take.length === 1) { const a = take[0].a; px = cx + (cx - a[0]) * 0.6 + (a[0] - cx) * 0.0; py = cy + (cy - a[1]) * 0.6; }
        ions.push({ sp, x: px, y: py, key: `${si}-${sp}` });
      }
    }
    // coloides metálicos
    const colloids = [];
    ['Pt', 'Ag', 'Au'].forEach((id, j) => {
      if (!comp[id]) return;
      for (let q = 0; q < 2; q++) { const v = voids[(7 + j * 5 + q * 11) % voids.length]; if (v) colloids.push({ id, x: v[0], y: v[1] }); }
    });
    // centros de nucleação para o tratamento térmico
    const nucSites = [];
    net.A.forEach((p, i) => { if (['Ti', 'Zr6'].includes(siteType[i]) && visA[i]) nucSites.push(p); });
    if (comp.P2O5 && (comp.SiO2 || 0) > 0) net.A.forEach((p, i) => { if (siteType[i] === 'P' && visA[i]) nucSites.push(p); });
    colloids.forEach((c) => nucSites.push([c.x, c.y]));
    return { siteType, broken, bridgeState, ions, colloids, nucSites, compSlots };
  }

  // ---------- desenho ----------
  const view = hiDPI(cv, () => draw());
  function geom() {
    const { w, h } = view;
    const s = Math.min(w / (W + 0.4), h / (H + 0.4));
    return { s, X: (x) => (w - W * s) / 2 + x * s, Y: (y) => (h - H * s) / 2 + y * s };
  }
  const siteColor = (t) => {
    const src = SITE[t]; if (!src) return '#888';
    return BY_ID[src[0]].color;
  };
  function isFocus(t) { return focus && SITE[t] && SITE[t].includes(focus); }

  function draw() {
    if (!layout) return;
    const { ctx, w, h } = view; const pal = palette();
    const { s, X, Y } = geom();
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(X(-0.2), Y(-0.2), (W + 0.4) * s, (H + 0.4) * s); ctx.clip();
    const p = anim;
    const L = layout, P0 = prev || layout;
    const dimOthers = focus && BY_ID[focus];
    // tratamento térmico: cristais crescendo
    if (heat > 0) {
      const rad = heat * 3.2;
      const seeds = L.nucSites.length ? L.nucSites : [[W / 2, -0.5], [W * 0.2, H + 0.5], [W * 0.8, H + 0.5]];
      seeds.forEach((c) => {
        const g = ctx.createRadialGradient(X(c[0]), Y(c[1]), 0, X(c[0]), Y(c[1]), rad * s);
        g.addColorStop(0, alpha(pal.cryst, 0.35)); g.addColorStop(1, alpha(pal.cryst, 0.05));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(c[0]), Y(c[1]), rad * s, 0, 6.283); ctx.fill();
        // rede ordenada dentro do cristal
        ctx.strokeStyle = alpha(pal.cryst, 0.5); ctx.lineWidth = 1;
        const a = 0.9;
        for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
          const x = c[0] + (i + (j & 1) * 0.5) * a, y = c[1] + j * a * 0.866;
          if (Math.hypot(x - c[0], y - c[1]) > rad - 0.2) continue;
          ctx.beginPath(); ctx.arc(X(x), Y(y), s * 0.09, 0, 6.283); ctx.stroke();
        }
      });
    }
    const oPos = (bi, which) => {
      const b = net.bridges[bi];
      const now = L.bridgeState[bi], was = P0.bridgeState[bi];
      const O0 = net.O[b.o];
      const target = now ? now[which] : O0, from = was ? was[which] : O0;
      return [from[0] + (target[0] - from[0]) * p, from[1] + (target[1] - from[1]) * p];
    };
    // posição do oxigênio o visto pelo átomo i (NBO se a ponte foi quebrada)
    const vtx = (i, o) => {
      const bi = oBridge.get(o);
      if (bi == null || !(L.bridgeState[bi] || P0.bridgeState[bi])) return net.O[o];
      return oPos(bi, net.bridges[bi].a === i ? 'pa' : 'pb');
    };
    // triângulos
    net.tri.forEach((os, i) => {
      if (os.length < 2) return;
      const t = L.siteType[i]; if (!t) return;
      const col = siteColor(t);
      const f = isFocus(t);
      ctx.beginPath(); os.forEach((o, j) => { const q = vtx(i, o); j ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])); }); ctx.closePath();
      ctx.fillStyle = alpha(rgbOf(col), f ? 0.42 : dimOthers ? 0.14 : 0.2); ctx.fill();
    });
    // ligações A–O
    ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeStyle = alpha(pal.ink, 0.75);
    ctx.beginPath();
    net.bonds.forEach(([a, o]) => { const q = vtx(a, o); ctx.moveTo(X(net.A[a][0]), Y(net.A[a][1])); ctx.lineTo(X(q[0]), Y(q[1])); });
    ctx.stroke();
    const rO = s * 0.27;
    // oxigênios ponteantes
    const brokenNow = new Set(); net.bridges.forEach((b, bi) => { if (L.bridgeState[bi] || P0.bridgeState[bi]) brokenNow.add(b.o); });
    net.O.forEach((o, i) => {
      if (brokenNow.has(i)) return;
      ctx.beginPath(); ctx.arc(X(o[0]), Y(o[1]), rO, 0, 6.283);
      ctx.fillStyle = pal.panel; ctx.fill(); ctx.strokeStyle = alpha(pal.ink, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
    });
    // NBOs
    const nboFocus = focus && ['modifier', 'polyvalent'].includes(BY_ID[focus]?.cls);
    net.bridges.forEach((b, bi) => {
      const now = L.bridgeState[bi], was = P0.bridgeState[bi];
      if (!now && !was) return;
      const a = now ? (was ? 1 : p) : 1 - p;
      for (const k of ['pa', 'pb']) {
        const q = oPos(bi, k);
        ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), rO, 0, 6.283);
        ctx.fillStyle = alpha(pal.liq, (nboFocus ? 0.85 : 0.6) * a + 0.0); ctx.fill();
        ctx.strokeStyle = alpha(pal.ink, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
      }
    });
    // átomos formadores
    net.A.forEach((pA, i) => {
      const t = L.siteType[i]; if (!t) return;
      const col = siteColor(t);
      const f = isFocus(t);
      const x = X(pA[0]), y = Y(pA[1]);
      const [ox, oy] = outward[i];
      if (t === 'Al6' || t === 'Zr6' || t === 'Mo' || t === 'W') {
        // octaedro (hexágono) sobre o sítio
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const an = (k * Math.PI) / 3 + 0.3; ctx.lineTo(x + Math.cos(an) * s * 0.42, y + Math.sin(an) * s * 0.42); }
        ctx.closePath(); ctx.fillStyle = alpha(rgbOf(col), 0.55); ctx.fill(); ctx.strokeStyle = rgbOf(col); ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (['P', 'Ti', 'V'].includes(t)) {
        // ligação terminal X=O
        const ex = x + ox * s * 0.95, ey = y + oy * s * 0.95;
        ctx.strokeStyle = alpha(pal.ink, 0.8); ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath(); ctx.moveTo(x - oy * 2, y + ox * 2); ctx.lineTo(ex - oy * 2, ey + ox * 2); ctx.moveTo(x + oy * 2, y - ox * 2); ctx.lineTo(ex + oy * 2, ey - ox * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, ey, rO * 0.9, 0, 6.283); ctx.fillStyle = pal.panel; ctx.fill(); ctx.strokeStyle = alpha(pal.ink, 0.8); ctx.lineWidth = 1.2; ctx.stroke();
      }
      if (['As', 'Te', 'Bi', 'Pb'].includes(t)) {
        // par eletrônico isolado
        ctx.fillStyle = alpha(rgbOf(col), 0.5);
        ctx.beginPath(); ctx.ellipse(x + ox * s * 0.5, y + oy * s * 0.5, s * 0.32, s * 0.17, Math.atan2(oy, ox), 0, 6.283); ctx.fill();
        ctx.fillStyle = pal.ink; [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.arc(x + ox * s * 0.55 - oy * s * 0.09 * sg, y + oy * s * 0.55 + ox * s * 0.09 * sg, 1.8, 0, 6.283); ctx.fill(); });
      }
      ctx.beginPath(); ctx.arc(x, y, s * (t === 'Si' ? 0.13 : 0.17), 0, 6.283);
      ctx.fillStyle = t === 'Si' ? pal.ink : rgbOf(col); ctx.fill();
      if (t === 'B4' || t === 'Al4' || t === 'Fe4' || t === 'Zn4' || t === 'Be4') {
        ctx.strokeStyle = rgbOf(col); ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.arc(x, y, s * 0.32, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      }
      if (f) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, 6.283); ctx.stroke(); }
    });
    // linhas de compensação de carga
    ctx.strokeStyle = alpha(pal.ink2, 0.6); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    L.compSlots.forEach((c) => { ctx.beginPath(); ctx.moveTo(X(net.A[c.site][0]), Y(net.A[c.site][1])); ctx.lineTo(X(c.x), Y(c.y)); ctx.stroke(); });
    ctx.setLineDash([]);
    // coloides
    L.colloids.forEach((c) => {
      const col = BY_ID[c.id].color;
      [[0, 0], [0.22, 0.1], [-0.18, 0.16], [0.05, -0.22], [-0.2, -0.12]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(X(c.x + dx), Y(c.y + dy), s * 0.13, 0, 6.283); ctx.fillStyle = col; ctx.fill();
        ctx.strokeStyle = alpha(pal.ink, 0.5); ctx.lineWidth = 0.8; ctx.stroke();
      });
      if (focus === c.id) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), s * 0.55, 0, 6.283); ctx.stroke(); }
    });
    // íons modificadores (com transição)
    const drawIons = (arr, a) => arr.forEach((ion) => {
      const src = ION_SRC[ion.sp]; const o = BY_ID[src];
      const rr = (0.22 + ION_R[ion.sp] * 0.22) * s;
      const f = focus === src;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(X(ion.x), Y(ion.y), rr, 0, 6.283);
      ctx.fillStyle = o.color; ctx.fill();
      ctx.strokeStyle = f ? pal.ink : alpha(pal.ink, 0.4); ctx.lineWidth = f ? 2.2 : 1; ctx.stroke();
      if (rr > 9) label(ctx, ION_LABEL[ion.sp], X(ion.x), Y(ion.y), { color: '#fff', size: Math.min(12, rr * 0.75), align: 'center', weight: 700 });
      ctx.globalAlpha = 1;
    });
    const keyNow = new Set(L.ions.map((i) => i.key)), keyWas = new Set(P0.ions.map((i) => i.key));
    drawIons(P0.ions.filter((i) => !keyNow.has(i.key)), 1 - p);
    drawIons(L.ions.filter((i) => !keyWas.has(i.key)), p);
    drawIons(L.ions.filter((i) => keyWas.has(i.key)), 1);
    ctx.restore();
    if (heat > 0) label(ctx, L.nucSites.length ? 'Cristais crescendo a partir dos núcleos (nucleação no volume)' : 'Sem nucleante: cristalização só a partir das superfícies', 12, h - 14, { color: pal.cryst, size: 12, bg: alpha(pal.panel, 0.85) });
  }

  // cor CSS (hex) → rgb() para alpha()
  const cache = {};
  function rgbOf(hex) {
    if (cache[hex]) return cache[hex];
    const n = parseInt(hex.slice(1), 16);
    return (cache[hex] = `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`);
  }

  // ---------- painéis de texto ----------
  function renderInfo(r) {
    if (!focus || !BY_ID[focus]) { info.innerHTML = '<p class="note">Clique em um composto para ver como ele entra na rede.</p>'; return; }
    const o = BY_ID[focus]; const c = CLASSES[o.cls];
    const Fv = fieldStrength(o);
    let rows = [];
    if (o.cls === 'polyvalent') {
      const fox = oxFraction(o, logfO2);
      rows.push(['Estados', `${o.redox.ox}: ${fmt(fox * 100, 0)} % · ${o.redox.red}: ${fmt((1 - fox) * 100, 0)} %`]);
      rows.push(['Coordenação', o.cn]);
      rows.push(['Força de campo', `${o.redox.ox}: ${fmt(Fv, 2)} · ${o.redox.red}: ${fmt(fieldStrength(o, true), 2)} Å⁻²`]);
    } else if (o.cls !== 'nucleant' || o.r != null) {
      rows.push(['Cátion e coordenação', `${o.el}${o.z ? sup(o.z) : ''} · NC ${o.cn}`]);
      if (o.r != null) rows.push(['Raio iônico (Shannon)', `${fmt(o.r, 2)} Å${o.r6 ? ` (NC 6: ${fmt(o.r6, 2)} Å)` : ''}`]);
      if (Fv != null) rows.push(['Força de campo F', `${fmt(Fv, 2)} Å⁻² ${dietzel(Fv)}`]);
      rows.push(['Ligação simples (Sun)', o.sun ? `~${o.sun}${o.sun6 ? `/${o.sun6}` : ''} kcal/mol ${sunCls(o.sun)}` : '—']);
      rows.push(['Basicidade óptica Λ', o.lam != null ? fmt(o.lam, 2) : 'não tabelada aqui']);
    } else {
      rows.push(['Forma', 'nanopartículas metálicas (não entram na rede)']);
    }
    const nucl = o.nucleant ? '<span class="tag nuc">também nucleante</span>' : '';
    info.innerHTML = `<div class="lab-ih"><span class="tag" style="--c:var(${c.color})">${c.short}</span>${nucl}<h5>${o.f}</h5></div>
      <div class="kv">${rows.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>
      <h6>Como entra na rede</h6><p>${o.how}</p>
      <h6>Efeito</h6><p>${o.effect}</p>
      <p class="note"><b>Exemplo:</b> ${o.example}</p>`;
  }
  const sup = (z) => ({ 1: '⁺', 2: '²⁺', 3: '³⁺', 4: '⁴⁺', 5: '⁵⁺', 6: '⁶⁺' }[z] || '');
  const dietzel = (F) => (F >= 1.3 ? '(faixa de formador)' : F >= 0.5 ? '(faixa de intermediário)' : '(faixa de modificador)');
  const sunCls = (b) => (b > 80 ? '(> 80: formador)' : b >= 60 ? '(60–80: intermediário)' : '(< 60: modificador)');

  function renderOut(r) {
    out.nbo.textContent = isFinite(r.nboT) ? fmt(r.nboT, 2) : '–';
    out.lam.textContent = r.Lambda != null ? fmt(r.Lambda, 3) : '—';
    out.lam.title = r.missing.length ? `Sem valor tabelado para: ${r.missing.join(', ')}` : '';
    const gfIcon = { yes: 'Sim', hard: 'Difícil', no: 'Não' }[r.gf];
    out.gf.textContent = gfIcon; out.gf.dataset.s = r.gf;
    out.q.innerHTML = r.Q.map((v, i) => `<div class="qbar"><span class="ql">Q${'⁰¹²³⁴'[i]}</span><span class="qtrack"><span class="qfill" style="width:${(v * 100).toFixed(1)}%"></span></span><span class="qv">${fmt(v * 100, 0)} %</span></div>`).reverse().join('');
    const notes = [r.gfText, ...r.notes];
    if (r.missing.length) notes.push(`Λ não calculada: falta valor tabelado de basicidade óptica para ${r.missing.join(', ')}.`);
    if (r.nB4 > 0) notes.push(`Boro: ${fmt((r.nB4 / (2 * (r.x.B2O3 || 1))) * 100, 0)} % em BO₄ (N₄), sem NBO enquanto houver boro para converter.`);
    out.notes.innerHTML = notes.map((n) => `<li>${n}</li>`).join('');
    // barra de composição
    out.bar.innerHTML = Object.entries(r.x).filter(([, v]) => v > 0).map(([id, v]) => `<span style="flex:${v};background:${BY_ID[id].color}" title="${BY_ID[id].f}: ${fmt(v, 1)} %"></span>`).join('');
    // redox
    const pv = Object.keys(comp).filter((id) => BY_ID[id].cls === 'polyvalent');
    redoxBox.hidden = !pv.length;
    redoxV.textContent = logfO2 > -1 ? `ar (log fO₂ ≈ ${fmt(logfO2, 1)})` : logfO2 > -5 ? `levemente redutora (log fO₂ = ${fmt(logfO2, 1)})` : `redutora (log fO₂ = ${fmt(logfO2, 1)})`;
    redoxR.innerHTML = pv.map((id) => { const o = BY_ID[id]; const f = oxFraction(o, logfO2); return `<span><b>${o.redox.ox}</b> ${fmt(f * 100, 0)} % · <b>${o.redox.red}</b> ${fmt((1 - f) * 100, 0)} %</span>`; }).join('');
    // tratamento térmico
    const hasNuc = Object.keys(comp).some((id) => BY_ID[id].nucleant || BY_ID[id].cls === 'nucleant');
    heatBtn.parentElement.querySelector('.note').textContent = hasNuc
      ? 'Há agente nucleante: o tratamento térmico gera cristais em todo o volume.'
      : 'Sem agente nucleante: um tratamento térmico só cristaliza a partir das superfícies. Experimente adicionar TiO₂, ZrO₂, P₂O₅ ou um metal.';
    // tendências
    const props = [['tg', 'Tg / viscosidade'], ['alpha', 'Expansão térmica'], ['dur', 'Durabilidade química'], ['n', 'Índice de refração']];
    trends.innerHTML = `<table class="trend"><thead><tr><th>Composto</th>${props.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead><tbody>${
      Object.keys(comp).map((id) => { const o = BY_ID[id]; return `<tr${id === focus ? ' class="on"' : ''}><td><span class="sw" style="background:${o.color}"></span>${o.f}</td>${props.map(([k]) => `<td>${arrow(o.props[k])}</td>`).join('')}</tr>`; }).join('')
    }</tbody></table>`;
  }
  const arrow = (s) => `<span class="ar${s?.includes('↑') && !s.includes('↓') ? ' up' : s?.includes('↓') && !s.includes('↑') ? ' dn' : ''}">${s || '≈'}</span>`;

  // ---------- atualização ----------
  let rafA = null;
  function update(animate, quick = false) {
    const r = analyze(comp, { logfO2 });
    [...pal0.querySelectorAll('.chip')].forEach((b) => { b.setAttribute('aria-pressed', String(comp[b.dataset.id] != null)); b.classList.toggle('focus', b.dataset.id === focus); });
    if (!quick) renderList(r);
    else list.querySelectorAll('.lab-row').forEach((row) => { const id = row.dataset.id; row.classList.toggle('on', id === focus); row.querySelector('.lab-pct').textContent = `${fmt(r.x[id] || 0, (r.x[id] || 0) < 1 ? 2 : 1)} %`; });
    renderInfo(r); renderOut(r);
    prev = layout; layout = computeLayout(r);
    if (!prev || reducedMotion()) { anim = 1; prev = layout; draw(); return; }
    anim = 0;
    const t0 = performance.now(), dur = quick ? 160 : 700;
    cancelAnimationFrame(rafA);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      anim = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      draw();
      if (u < 1) rafA = requestAnimationFrame(step); else { prev = layout; anim = 1; }
    };
    rafA = requestAnimationFrame(step);
  }
  function loop() {
    if (!heating) return;
    heat = Math.min(1, heat + 0.008);
    draw();
    if (heat < 1) requestAnimationFrame(loop); else heating = false;
  }
  update(false);
}
