// Motor de dinâmica molecular 2D (Lennard-Jones, contorno periódico).
// Unidades reduzidas: σ_AA = 1, ε = 1, m = 1, k_B = 1.
// Dois sistemas: monoatômico (cristaliza com facilidade, rede hexagonal)
// e mistura binária 50:50 com razão de tamanhos 1 : 1,4 (formadora de vidro clássica em 2D).

export class MD {
  constructor({ n = 400, kind = 'binary', seed = 7, T = 1.2 } = {}) {
    this.kind = kind;
    this.n = n;
    this.rand = mulberry32(seed);
    const sB = kind === 'binary' ? 1.4 : 1.0;
    this.sig = [[1, (1 + sB) / 2], [(1 + sB) / 2, sB]];
    const frac = kind === 'binary' ? 0.5 : 0;
    // mesma fração de área nos dois casos (φ ≈ 0,70)
    const phi = 0.70;
    const meanArea = (Math.PI / 4) * ((1 - frac) * 1 + frac * sB * sB);
    this.L = Math.sqrt((n * meanArea) / phi);
    this.dt = 0.004;
    this.T0 = T;
    this.tau = 0.05;
    this.time = 0;
    this.x = new Float64Array(n); this.y = new Float64Array(n);
    this.vx = new Float64Array(n); this.vy = new Float64Array(n);
    this.fx = new Float64Array(n); this.fy = new Float64Array(n);
    this.type = new Uint8Array(n);
    // posições de referência para mobilidade
    this.rx = new Float64Array(n); this.ry = new Float64Array(n);
    this.ux = new Float64Array(n); this.uy = new Float64Array(n); // posições "desdobradas"
    this.mob = new Float32Array(n);
    this.psi = new Float32Array(n);
    // grade inicial
    const side = Math.ceil(Math.sqrt(n));
    const a = this.L / side;
    let k = 0;
    const idx = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    for (let i = 0; i < side && k < n; i++) for (let j = 0; j < side && k < n; j++) {
      const p = idx[k];
      this.x[p] = (i + 0.5) * a + (this.rand() - 0.5) * 0.1;
      this.y[p] = (j + 0.5) * a + (this.rand() - 0.5) * 0.1;
      this.type[p] = kind === 'binary' && k % 2 === 1 ? 1 : 0;
      k++;
    }
    for (let i = 0; i < n; i++) {
      this.vx[i] = gauss(this.rand) * Math.sqrt(T);
      this.vy[i] = gauss(this.rand) * Math.sqrt(T);
      this.ux[i] = this.x[i]; this.uy[i] = this.y[i];
      this.rx[i] = this.x[i]; this.ry[i] = this.y[i];
    }
    this.rc = 2.5;
    this.buildCells();
    this.forces();
    this.mobWindow = 0;
  }

  buildCells() {
    const maxS = this.sig[1][1];
    this.cellSize = this.rc * maxS;
    this.nc = Math.max(3, Math.floor(this.L / this.cellSize));
    this.cs = this.L / this.nc;
    this.head = new Int32Array(this.nc * this.nc);
    this.next = new Int32Array(this.n);
  }

  forces() {
    const { n, x, y, fx, fy, L, nc, cs, head, next, type, sig } = this;
    head.fill(-1);
    for (let i = 0; i < n; i++) {
      const cx = Math.min(nc - 1, Math.floor(x[i] / cs));
      const cy = Math.min(nc - 1, Math.floor(y[i] / cs));
      const c = cx * nc + cy;
      next[i] = head[c]; head[c] = i;
    }
    fx.fill(0); fy.fill(0);
    let pot = 0;
    const half = L / 2;
    const rc = this.rc;
    for (let cx = 0; cx < nc; cx++) for (let cy = 0; cy < nc; cy++) {
      const c = cx * nc + cy;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const ox = (cx + dx + nc) % nc, oy = (cy + dy + nc) % nc;
        const c2 = ox * nc + oy;
        if (c2 < c) continue;
        for (let i = head[c]; i >= 0; i = next[i]) {
          for (let j = c2 === c ? next[i] : head[c2]; j >= 0; j = next[j]) {
            let rx = x[i] - x[j], ry = y[i] - y[j];
            if (rx > half) rx -= L; else if (rx < -half) rx += L;
            if (ry > half) ry -= L; else if (ry < -half) ry += L;
            const s = sig[type[i]][type[j]];
            const r2 = rx * rx + ry * ry;
            const rcut = rc * s;
            if (r2 > rcut * rcut) continue;
            const sr2 = (s * s) / r2;
            const sr6 = sr2 * sr2 * sr2;
            const f = (24 * sr6 * (2 * sr6 - 1)) / r2;
            const fcap = Math.min(f, 5000);
            fx[i] += fcap * rx; fy[i] += fcap * ry;
            fx[j] -= fcap * rx; fy[j] -= fcap * ry;
            pot += 4 * sr6 * (sr6 - 1);
          }
        }
      }
    }
    this.pot = pot / n;
  }

  step(k = 1) {
    const { n, x, y, vx, vy, fx, fy, L, dt } = this;
    for (let s = 0; s < k; s++) {
      for (let i = 0; i < n; i++) {
        vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
        const ddx = dt * vx[i], ddy = dt * vy[i];
        x[i] += ddx; y[i] += ddy;
        this.ux[i] += ddx; this.uy[i] += ddy;
        if (x[i] < 0) x[i] += L; else if (x[i] >= L) x[i] -= L;
        if (y[i] < 0) y[i] += L; else if (y[i] >= L) y[i] -= L;
      }
      this.forces();
      let ke = 0;
      for (let i = 0; i < n; i++) {
        vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i];
        ke += vx[i] * vx[i] + vy[i] * vy[i];
      }
      const T = ke / (2 * n);
      this.T = T;
      const lam = Math.sqrt(Math.max(0.5, Math.min(1.5, 1 + (dt / this.tau) * (this.T0 / Math.max(T, 1e-6) - 1))));
      for (let i = 0; i < n; i++) { vx[i] *= lam; vy[i] *= lam; }
      this.time += dt;
      this.mobWindow++;
    }
  }

  // mobilidade: deslocamento desde a última referência (janela deslizante)
  updateMobility(window = 250) {
    if (this.mobWindow < window) return false;
    let sum = 0;
    for (let i = 0; i < this.n; i++) {
      const dx = this.ux[i] - this.rx[i], dy = this.uy[i] - this.ry[i];
      const d = Math.sqrt(dx * dx + dy * dy);
      this.mob[i] = d;
      sum += d * d;
      this.rx[i] = this.ux[i]; this.ry[i] = this.uy[i];
    }
    this.msd = sum / this.n;
    this.mobWindow = 0;
    return true;
  }

  // parâmetro de ordem hexático local |ψ6|
  order() {
    const { n, x, y, L, type, sig } = this;
    const half = L / 2;
    let tot = 0;
    for (let i = 0; i < n; i++) {
      let re = 0, im = 0, c = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let rx = x[j] - x[i], ry = y[j] - y[i];
        if (rx > half) rx -= L; else if (rx < -half) rx += L;
        if (ry > half) ry -= L; else if (ry < -half) ry += L;
        const s = sig[type[i]][type[j]] * 1.35;
        if (rx * rx + ry * ry < s * s) {
          const th = Math.atan2(ry, rx);
          re += Math.cos(6 * th); im += Math.sin(6 * th); c++;
        }
      }
      const p = c ? Math.hypot(re, im) / c : 0;
      this.psi[i] = p;
      tot += p;
    }
    this.psi6 = tot / n;
    return this.psi6;
  }
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
