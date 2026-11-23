// Modelo de relaxação estrutural Tool–Narayanaswamy–Moynihan (TNM)
// + cristalização por regra de aditividade (curva TTT em forma de "nariz").
// Material-modelo genérico (óxido "de laboratório"): números plausíveis, não de uma composição real.
//
//   τ(T, Tf) = A · exp[ x·Δh/(R T) + (1−x)·Δh/(R Tf) ]
//   Relaxação não exponencial (β ≈ 0,6) aproximada por uma série de Prony.
//   H_amorfo(T, Tf) = H_liq(Tf) + Cp_g · (T − Tf)
//   H_crist(T)      = H_liq(Tm) − ΔHm + Cp_c · (T − Tm)

export const P = {
  Tm: 1100,          // K, fusão
  dh: 60000,         // Δh/R (K)
  x: 0.5,            // parâmetro de não linearidade
  lnA: Math.log(100) - 60000 / 750, // τ(750 K, equilíbrio) = 100 s  → Tg ≈ 750 K a ~10 K/min
  CpL: 2.0, CpG: 1.0, CpC: 1.0, dHm: 600,
  // volume específico (u.a.): α do líquido > α do vidro ≈ α do cristal
  aL: 3.0e-4, aG: 1.0e-4, aC: 1.0e-4, V0: 1.0, dVm: 0.06,
  // TTT
  Tn: 960, tmin: 140, w: 55, avrami: 3,
  prony: { g: [0.05, 0.12, 0.25, 0.3, 0.2, 0.08], f: [0.01, 0.05, 0.2, 0.7, 2.5, 9] },
};

export function tau(T, Tf, p = P) {
  return Math.exp(p.lnA + (p.x * p.dh) / T + ((1 - p.x) * p.dh) / Tf);
}
export const Hliq = (T, p = P) => p.CpL * (T - p.Tm);
export const Hcrys = (T, p = P) => -p.dHm + p.CpC * (T - p.Tm);
export const Hamor = (T, Tf, p = P) => Hliq(Tf, p) + p.CpG * (T - Tf);
export const Vliq = (T, p = P) => p.V0 * (1 + p.aL * (T - p.Tm));
export const Vcrys = (T, p = P) => p.V0 * (1 - p.dVm + p.aC * (T - p.Tm));
export const Vamor = (T, Tf, p = P) => Vliq(Tf, p) + p.V0 * p.aG * (T - Tf);
// tempo característico de cristalização (s) — curva TTT
export function tX(T, p = P) {
  if (T >= p.Tm) return Infinity;
  // assimetria: acima do nariz cai a força motriz, abaixo cai a mobilidade
  const z = (T - p.Tn) / (T > p.Tn ? p.w * 0.55 : p.w);
  return p.tmin * Math.exp(z * z);
}

export class Sample {
  constructor(p = P) {
    this.p = p;
    this.reset(1250);
  }
  reset(T) {
    this.T = T;
    this.tf = this.p.prony.g.map(() => T);
    this.S = 0;      // integral de aditividade
    this.X = 0;      // fração cristalizada
    this.crystalEnabled = true;
  }
  get Tf() { return this.p.prony.g.reduce((s, g, i) => s + g * this.tf[i], 0); }
  get H() { return (1 - this.X) * Hamor(this.T, this.Tf, this.p) + this.X * Hcrys(this.T, this.p); }
  get V() { return (1 - this.X) * Vamor(this.T, this.Tf, this.p) + this.X * Vcrys(this.T, this.p); }
  // avança a amostra: muda T de dT com taxa q (K/s, >0) ou isoterma por tempo dt
  advance(dT, q, holdTime = 0) {
    const p = this.p;
    const nsub = Math.max(1, Math.ceil(Math.abs(dT) / 0.5));
    const dTs = dT / nsub;
    const dts = dT !== 0 ? Math.abs(dTs) / q : holdTime / nsub;
    for (let s = 0; s < (dT !== 0 ? nsub : 1); s++) {
      if (dT !== 0) this.T += dTs;
      const dt = dT !== 0 ? dts : holdTime;
      this.relax(dt);
    }
  }
  relax(dt) {
    const p = this.p;
    const Tf = this.Tf;
    const t0 = tau(this.T, Tf, p);
    for (let i = 0; i < this.tf.length; i++) {
      const ti = t0 * p.prony.f[i];
      this.tf[i] = this.T + (this.tf[i] - this.T) * Math.exp(-dt / ti);
    }
    if (this.crystalEnabled) {
      if (this.T >= p.Tm) {
        // fusão rápida do que estiver cristalizado
        this.X *= Math.exp(-dt / 0.5);
        this.S *= Math.exp(-dt / 0.5);
        if (this.X < 1e-4) { this.X = 0; this.S = 0; }
      } else {
        this.S += dt / tX(this.T, p);
        const Xn = 1 - Math.exp(-Math.pow(this.S, p.avrami));
        this.X = Math.max(this.X, Xn);
      }
    }
  }
}

// varre uma rampa e devolve a trajetória
export function ramp(sample, Tend, q, step = 2) {
  const out = [];
  const dir = Math.sign(Tend - sample.T);
  let guard = 0;
  while ((Tend - sample.T) * dir > 1e-9 && guard++ < 100000) {
    const dT = dir * Math.min(step, Math.abs(Tend - sample.T));
    const H0 = sample.H;
    sample.advance(dT, q);
    out.push({ T: sample.T, H: sample.H, V: sample.V, Tf: sample.Tf, X: sample.X, Cp: (sample.H - H0) / dT });
  }
  return out;
}
