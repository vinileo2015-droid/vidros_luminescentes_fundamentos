// Teoria clássica de nucleação e crescimento (Varshneya, cap. 3; Handbook, cap. 4)
//   ΔGv  = ΔHm/Vm · (Tm − T)/Tm                          força motriz por volume (eq. 3.21)
//   σ    = α · ΔHm / (NA^(1/3) Vm^(2/3))                  energia de interface (regra de Turnbull)
//   W*   = 16πσ³ / (3 ΔGv²) · f(θ)                        trabalho de nucleação (eqs. 3.10, 3.16)
//   I    = Nsites · kT/(3π a³ η) · exp(−W*/kT)            taxa de nucleação, mobilidade via Stokes–Einstein
//   u    = kT/(3π a² η) · [1 − exp(−ΔHm ΔT/(R T Tm))]     crescimento normal (eq. 3.27)
//   t(X) = [3X / (π I u³)]^(1/4)                          JMA para X pequeno (eq. 3.29)
//   Rc   = (Tm − Tn)/tn ;  Yc ≈ √(κ tn)                   (eqs. 3.30, 3.31)
import { myega } from './visc.js';

const kB = 1.380649e-23, NA = 6.02214e23, R = 8.314462;

export const PRESETS = {
  sio2: {
    name: 'SiO₂ (sílica)', Tm: 1996, dHm: 9.6e3, Vm: 27.3e-6, Tg: 1420, m: 20, alpha: 0.631, kappa: 8e-7,
    note: 'Viscosidade altíssima no ponto de fusão: forma vidro com resfriamento lento.',
  },
  ns2: {
    name: 'Na₂O·2SiO₂', Tm: 1147, dHm: 35.6e3, Vm: 72e-6, Tg: 728, m: 38, alpha: 0.350, kappa: 6e-7,
    note: 'Modificador reduz a viscosidade: cristaliza mais fácil que a sílica, mas ainda vitrifica bem.',
  },
  bmg: {
    name: 'Vidro metálico massivo (Zr)', Tm: 993, dHm: 8.2e3, Vm: 10.5e-6, Tg: 625, m: 44, alpha: 0.509, kappa: 5e-6,
    note: 'Liga multicomponente: líquido viscoso para um metal, taxa crítica da ordem de 1 K/s.',
  },
  metal: {
    name: 'Metal puro', Tm: 1728, dHm: 17.5e3, Vm: 6.6e-6, Tg: 430, m: 60, alpha: 0.647, kappa: 2e-5,
    note: 'Líquido muito fluido (η ≈ mPa·s): cristaliza em microssegundos sem têmpera extrema.',
  },
};

export const fTheta = (deg) => { const c = Math.cos((deg * Math.PI) / 180); return ((2 + c) * (1 - c) ** 2) / 4; };

export function model(p, { theta = 180, alphaScale = 1, etaShift = 0, X = 1e-6 } = {}) {
  const a = Math.cbrt(p.Vm / NA);
  const sigma = p.alpha * alphaScale * p.dHm / (Math.cbrt(NA) * Math.pow(p.Vm, 2 / 3));
  const het = theta < 179.9;
  const f = fTheta(theta);
  // sítios: homogênea = todo o volume; heterogênea = 10⁻⁶ dos sítios (partículas/inclusões)
  const Nsites = (1 / a ** 3) * (het ? 1e-6 : 1);
  const eta = (T) => 10 ** (myega(T, p.Tg, p.m) + etaShift);
  const dGv = (T) => (p.dHm / p.Vm) * (p.Tm - T) / p.Tm;
  const I = (T) => {
    if (T >= p.Tm) return 0;
    const W = (16 * Math.PI * sigma ** 3) / (3 * dGv(T) ** 2) * f;
    return Nsites * (kB * T) / (3 * Math.PI * a ** 3 * eta(T)) * Math.exp(-W / (kB * T));
  };
  const u = (T) => {
    if (T >= p.Tm) return 0;
    return (kB * T) / (3 * Math.PI * a ** 2 * eta(T)) * (1 - Math.exp(-(p.dHm * (p.Tm - T)) / (R * T * p.Tm)));
  };
  const tX = (T) => {
    const i = I(T), v = u(T);
    if (!(i > 0) || !(v > 0)) return Infinity;
    return Math.pow((3 * X) / (Math.PI * i * v ** 3), 0.25);
  };
  // nariz da curva TTT
  let tn = Infinity, Tn = null;
  const T0 = Math.max(p.Tg * 0.8, 0.3 * p.Tm);
  for (let T = T0; T < p.Tm - 0.5; T += (p.Tm - T0) / 600) {
    const t = tX(T);
    if (t < tn) { tn = t; Tn = T; }
  }
  const Rc = Tn ? (p.Tm - Tn) / tn : 0;
  const Yc = Math.sqrt(p.kappa * tn);
  // máximos de I e u
  let Imax = 0, TI = null, umax = 0, Tu = null;
  for (let T = T0; T < p.Tm; T += (p.Tm - T0) / 600) {
    const i = I(T), v = u(T);
    if (i > Imax) { Imax = i; TI = T; }
    if (v > umax) { umax = v; Tu = T; }
  }
  return { I, u, tX, eta, Tn, tn, Rc, Yc, Imax, TI, umax, Tu, sigma, a, T0, f };
}
