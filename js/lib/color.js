// Cor a partir de espectros: funções de cor CIE 1931 (aproximação analítica de Wyman, Sloan & Shirley, 2013),
// iluminantes de corpo negro (D65 ≈ 6504 K, A = 2856 K) e conversão XYZ → sRGB.
const g = (l, mu, s1, s2) => { const t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
export const xbar = (l) => 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
export const ybar = (l) => 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
export const zbar = (l) => 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);

export function planck(lnm, T) {
  const l = lnm * 1e-9;
  return 1 / (l ** 5 * (Math.exp(0.014388 / (l * T)) - 1));
}

const L0 = 380, L1 = 780, DL = 5;
const LAMS = []; for (let l = L0; l <= L1; l += DL) LAMS.push(l);
export const VIS = LAMS;

const M = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]];
const toLin = (X, Y, Z) => M.map((r) => r[0] * X + r[1] * Y + r[2] * Z);
const gam = (c) => { c = Math.max(0, c); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };

const cache = {};
function white(T) {
  if (cache[T]) return cache[T];
  let X = 0, Y = 0, Z = 0;
  for (const l of LAMS) { const p = planck(l, T); X += p * xbar(l); Y += p * ybar(l); Z += p * zbar(l); }
  const lin = toLin(X / Y, 1, Z / Y);
  return (cache[T] = { Y, lin });
}

// Transmitância T(λ) sob iluminante (temperatura de cor) → sRGB. Branco do iluminante = branco da tela.
export function transmittedRGB(Tfun, illumT = 6504) {
  const w = white(illumT);
  let X = 0, Y = 0, Z = 0;
  for (const l of LAMS) { const p = planck(l, illumT) * Tfun(l); X += p * xbar(l); Y += p * ybar(l); Z += p * zbar(l); }
  const lin = toLin(X / w.Y, Y / w.Y, Z / w.Y).map((c, i) => c / w.lin[i]);
  return rgbOut(lin, Y / w.Y);
}

// Espectro de emissão S(λ) (unidades arbitrárias) → cor normalizada pelo canal mais forte.
export function emissionRGB(Sfun) {
  let X = 0, Y = 0, Z = 0;
  for (const l of LAMS) { const s = Sfun(l); X += s * xbar(l); Y += s * ybar(l); Z += s * zbar(l); }
  const w = white(6504);
  let lin = toLin(X, Y, Z).map((c, i) => c / w.lin[i]);
  const mn = Math.min(...lin); if (mn < 0) lin = lin.map((c) => c - mn); // dessatura para caber no gamut
  const mx = Math.max(...lin, 1e-12);
  lin = lin.map((c) => c / mx);
  const s = X + Y + Z || 1;
  return { ...rgbOut(lin, Y / mx), x: X / s, y: Y / s };
}

// Cor aproximada de um comprimento de onda (para desenhar o arco-íris)
export function lambdaRGB(l) {
  const r = emissionRGB((x) => Math.exp(-0.5 * ((x - l) / 6) ** 2));
  const fade = l < 420 ? 0.35 + 0.65 * (l - 380) / 40 : l > 700 ? 0.35 + 0.65 * (780 - l) / 80 : 1;
  const [R, G, B] = r.rgb.map((c) => Math.round(c * Math.max(0.2, fade)));
  return `rgb(${R},${G},${B})`;
}

function rgbOut(lin, Y) {
  let over = Math.max(...lin);
  if (over > 1) lin = lin.map((c) => c / over);
  const rgb = lin.map((c) => Math.round(255 * gam(c)));
  return { rgb, css: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, Y };
}

// Banda gaussiana em número de onda (cm⁻¹) avaliada em λ (nm)
export const band = (lnm, nu0, sig) => { const nu = 1e7 / lnm; return Math.exp(-0.5 * ((nu - nu0) / sig) ** 2); };
