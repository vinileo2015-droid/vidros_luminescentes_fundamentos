// Dados de vidros comerciais (catálogo Corning e Varshneya, Tabs. 9.x e 10.1) e utilidades da Parte 3.
// Pontos fixos em °C; densidade em g/cm³; E em GPa; α (0–300 °C) em 10⁻⁷/°C; n = n_d.
export const GLASSES = [
  { id: 'sl', name: 'Sodo-cálcico', code: 'Corning 0080', strain: 473, anneal: 514, soften: 696, work: 1005, rho: 2.47, E: 70.3, nu: 0.22, alpha: 93.5, n: 1.512, col: '--liq' },
  { id: 'pb', name: 'Chumbo (K–Na–Pb)', code: 'Corning 0010', strain: 392, anneal: 432, soften: 626, work: 983, rho: 2.86, E: 61.4, nu: 0.21, alpha: 93.5, n: 1.539, col: '--cond' },
  { id: 'al', name: 'Aluminossilicato', code: 'Corning 1720', strain: 667, anneal: 712, soften: 915, work: 1202, rho: 2.52, E: 87.6, nu: 0.24, alpha: 42, n: 1.530, col: '--cryst' },
  { id: 'bs', name: 'Borossilicato (Pyrex)', code: 'Corning 7740', strain: 510, anneal: 560, soften: 821, work: 1252, rho: 2.23, E: 62.75, nu: 0.20, alpha: 32.5, n: 1.474, col: '--scl' },
  { id: 'vy', name: '96 % sílica (Vycor)', code: 'Corning 7913', strain: 890, anneal: 1020, soften: 1530, work: null, rho: 2.18, E: 67.6, nu: 0.19, alpha: 7.5, n: 1.458, col: '--nuc' },
  { id: 'si', name: 'Sílica vítrea', code: 'Corning 7940', strain: 956, anneal: 1084, soften: 1580, work: null, rho: 2.20, E: 72.0, nu: 0.16, alpha: 5.5, n: 1.459, col: '--glass' },
];

// Pontos de referência de viscosidade (log₁₀ η, Pa·s)
export const REF = [
  { k: 'strain', log: 13.5, name: 'deformação' },
  { k: 'anneal', log: 12.0, name: 'recozimento' },
  { k: 'soften', log: 6.65, name: 'amolecimento (Littleton)' },
  { k: 'flow', log: 4.0, name: 'escoamento' },
  { k: 'work', log: 3.0, name: 'trabalho' },
  { k: 'melt', log: 1.0, name: 'fusão' },
];

// Ajuste VFT log η = A + B/(T − T0) por mínimos quadrados (T em °C), varrendo T0.
export function fitVFT(g) {
  const pts = [[g.strain, 13.5], [g.anneal, 12], [g.soften, 6.65]];
  if (g.work) pts.push([g.work, 3]);
  let best = null;
  const tmin = Math.min(...pts.map((p) => p[0]));
  for (let T0 = -273; T0 < tmin - 40; T0 += 0.5) {
    const xs = pts.map((p) => 1 / (p[0] - T0)), ys = pts.map((p) => p[1]);
    const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
    let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
    const B = sxy / sxx, A = my - B * mx;
    const res = xs.reduce((s, x, i) => s + (A + B * x - ys[i]) ** 2, 0);
    // sem ponto de trabalho (3 pontos), fixamos A ≈ −2,5 (valor típico de log η∞) para não sobreajustar
    const pen = g.work ? 0 : (A + 2.5) ** 2 * 0.02;
    if (!best || res + pen < best.res) best = { A, B, T0, res: res + pen };
  }
  const f = (T) => best.A + best.B / (T - best.T0);
  const Tat = (lg) => best.T0 + best.B / (lg - best.A);
  const TgK = Tat(12) + 273.15, T0K = best.T0 + 273.15;
  const m = (best.B * TgK) / (TgK - T0K) ** 2;
  return { ...best, f, Tat, m };
}

export const cssColor = (name) => {
  const p = document.createElement('span'); p.style.color = `var(${name})`; p.style.display = 'none';
  document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c;
};

// Constrói sliders de composição. spec: [{id, label, min, max, step, value}]
export function sliders(host, spec, onChange, unit = '%') {
  host.innerHTML = '';
  const els = {};
  for (const s of spec) {
    const d = document.createElement('div'); d.className = 'ctl';
    d.innerHTML = `<label for="${host.id}-${s.id}">${s.label} <output id="${host.id}-${s.id}-v"></output></label><input type="range" id="${host.id}-${s.id}" min="${s.min}" max="${s.max}" step="${s.step || 0.5}" value="${s.value}">`;
    host.appendChild(d);
    const inp = d.querySelector('input'), out = d.querySelector('output');
    const upd = () => { out.textContent = `${(+inp.value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unit}`; };
    inp.addEventListener('input', () => { upd(); onChange(); });
    upd();
    els[s.id] = { inp, out, upd, get: () => +inp.value, set: (v) => { inp.value = v; upd(); } };
  }
  return els;
}

// Botões segmentados
export function segmented(host, items, onPick, initial) {
  host.innerHTML = '';
  const btns = items.map(([id, text]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.dataset.id = id;
    b.setAttribute('aria-pressed', id === initial ? 'true' : 'false');
    b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); onPick(id); });
    host.appendChild(b); return b;
  });
  return { set: (id) => btns.forEach((x) => x.setAttribute('aria-pressed', x.dataset.id === id ? 'true' : 'false')) };
}

// Massas molares (g/mol)
export const MW = { SiO2: 60.08, B2O3: 69.62, Al2O3: 101.96, Na2O: 61.98, K2O: 94.2, Li2O: 29.88, CaO: 56.08, MgO: 40.3, BaO: 153.33, ZnO: 81.38, PbO: 223.2, TiO2: 79.87, ZrO2: 123.22 };
export const NOX = { SiO2: 2, B2O3: 3, Al2O3: 3, Na2O: 1, K2O: 1, Li2O: 1, CaO: 1, MgO: 1, BaO: 1, ZnO: 1, PbO: 1, TiO2: 2, ZrO2: 2 };
export const NCAT = { SiO2: 1, B2O3: 2, Al2O3: 2, Na2O: 2, K2O: 2, Li2O: 2, CaO: 1, MgO: 1, BaO: 1, ZnO: 1, PbO: 1, TiO2: 1, ZrO2: 1 };
export const OXLAB = { SiO2: 'SiO₂', B2O3: 'B₂O₃', Al2O3: 'Al₂O₃', Na2O: 'Na₂O', K2O: 'K₂O', Li2O: 'Li₂O', CaO: 'CaO', MgO: 'MgO', BaO: 'BaO', ZnO: 'ZnO', PbO: 'PbO', TiO2: 'TiO₂', ZrO2: 'ZrO₂' };

// % em massa → fração molar
export function wtToMol(w) {
  const n = {}; let s = 0;
  for (const k in w) { n[k] = (w[k] || 0) / MW[k]; s += n[k]; }
  for (const k in n) n[k] /= s || 1;
  return n;
}
