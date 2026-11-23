// Simulador cinético: I(T), u(T), viscosidade/difusão e diagrama TTT com taxa crítica.
import { PRESETS, model } from '../lib/cnt-engine.js';
import { hiDPI, palette, alpha, axes, label, fmt, sup } from '../lib/ui.js';

const kB = 1.380649e-23;
const e10 = (v, d = 1) => {
  if (!isFinite(v)) return '∞';
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e;
  if (e >= -2 && e <= 3) return fmt(v, Math.max(0, d + 1 - e - 1));
  return `${fmt(m, d)}×10${sup(e)}`;
};
const fmtT = (s) => {
  if (!isFinite(s)) return '∞';
  if (s < 1e-3) return `${e10(s * 1e6)} µs`;
  if (s < 1) return `${fmt(s * 1e3, 1)} ms`;
  if (s < 120) return `${fmt(s, 1)} s`;
  if (s < 7200) return `${fmt(s / 60, 1)} min`;
  if (s < 2 * 86400) return `${fmt(s / 3600, 1)} h`;
  if (s < 3.15e7 * 2) return `${fmt(s / 86400, 0)} dias`;
  return `${e10(s / 3.156e7)} anos`;
};
const fmtL = (m) => (m < 1e-6 ? `${e10(m * 1e9)} nm` : m < 1e-3 ? `${fmt(m * 1e6, 0)} µm` : m < 1 ? `${fmt(m * 1e3, m < 1e-2 ? 1 : 0)} mm` : `${e10(m)} m`);

export function init(root) {
  const $ = (s) => root.querySelector(s);
  const cIU = $('#kin-iu'), cTTT = $('#kin-ttt'), cEta = $('#kin-eta');
  const seg = $('#kin-preset'), th = $('#kin-theta'), thV = $('#kin-theta-v'), sg = $('#kin-sigma'), sgV = $('#kin-sigma-v'), et = $('#kin-eta-s'), etV = $('#kin-eta-v'), q = $('#kin-q'), qV = $('#kin-q-v');
  const R = { rc: $('#kin-rc'), tn: $('#kin-tn'), yc: $('#kin-yc'), trg: $('#kin-trg'), verdict: $('#kin-verdict'), note: $('#kin-note') };
  let key = 'ns2', M = null;

  seg.innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button type="button" data-v="${k}" aria-pressed="${k === key}">${p.name}</button>`).join('');
  seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; key = b.dataset.v; [...seg.children].forEach((c) => c.setAttribute('aria-pressed', String(c === b))); const m0 = model(PRESETS[key], { theta: Number(th.value) }); q.value = Math.max(-8, Math.min(13, Math.round(Math.log10(m0.Rc) + 1))); update(); });
  [th, sg, et, q].forEach((el) => el.addEventListener('input', update));

  const vIU = hiDPI(cIU, () => drawIU());
  const vT = hiDPI(cTTT, () => drawTTT());
  const vE = hiDPI(cEta, () => drawEta());

  function update() {
    const p = PRESETS[key];
    const theta = Number(th.value), sScale = Number(sg.value), eShift = Number(et.value);
    M = model(p, { theta, alphaScale: sScale, etaShift: eShift });
    thV.textContent = theta >= 179.5 ? '180° (homogênea)' : `${theta}° (f(θ) = ${fmt(M.f, 3)})`;
    sgV.textContent = `${fmt(sScale, 2)}× (σ = ${fmt(M.sigma * 1e3, 0)} mJ/m²)`;
    etV.textContent = eShift === 0 ? 'nominal' : `${eShift > 0 ? '+' : ''}${fmt(eShift, 1)} décadas`;
    const qq = 10 ** Number(q.value);
    qV.textContent = `${e10(qq)} K/s`;
    R.rc.textContent = `${e10(M.Rc)} K/s`;
    R.tn.textContent = M.Tn ? `${fmt(M.Tn, 0)} K · ${fmtT(M.tn)}` : '–';
    R.yc.textContent = fmtL(M.Yc);
    R.trg.textContent = fmt(p.Tg / p.Tm, 2);
    const ok = qq >= M.Rc;
    R.verdict.textContent = ok ? `Vitrifica: ${e10(qq)} K/s ≥ taxa crítica.` : `Cristaliza: a curva de resfriamento cruza o nariz (taxa < ${e10(M.Rc)} K/s).`;
    R.verdict.dataset.s = ok ? 'yes' : 'no';
    R.note.textContent = p.note;
    drawIU(); drawTTT(); drawEta();
  }

  const Trange = () => { const p = PRESETS[key]; return [Math.max(p.Tg * 0.85, p.Tm * 0.3), p.Tm * 1.02]; };

  function drawIU() {
    if (!M) return;
    const { ctx, w, h } = vIU; const pal = palette(); const p = PRESETS[key];
    ctx.clearRect(0, 0, w, h);
    const [T0, T1] = Trange();
    const box = { l: 44, r: w - 14, t: 26, b: h - 30 };
    const X = (T) => box.l + ((T - T0) / (T1 - T0)) * (box.r - box.l), Y = (v) => box.b - v * (box.b - box.t) * 0.92;
    axes(ctx, box, { x: X, y: Y, pal, xt: ticks(T0, T1), yt: [0, 0.5, 1], yfmt: (v) => fmt(v, 1), xl: 'T (K)', yl: 'taxa relativa ao máximo' });
    // sobreposição (área hachurada)
    const N = 300;
    ctx.fillStyle = alpha(pal.liq, 0.18); ctx.beginPath(); ctx.moveTo(X(T0), Y(0));
    for (let i = 0; i <= N; i++) { const T = T0 + ((T1 - T0) * i) / N; ctx.lineTo(X(T), Y(Math.min(M.I(T) / (M.Imax || 1), M.u(T) / (M.umax || 1)))); }
    ctx.lineTo(X(T1), Y(0)); ctx.fill();
    const curve = (fn, mx, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i <= N; i++) { const T = T0 + ((T1 - T0) * i) / N; const v = fn(T) / (mx || 1); i ? ctx.lineTo(X(T), Y(v)) : ctx.moveTo(X(T), Y(v)); } ctx.stroke(); };
    curve(M.I, M.Imax, pal.cryst); curve(M.u, M.umax, pal.glass);
    // Tg e Tm
    [[p.Tg, 'Tg'], [p.Tm, 'Tm']].forEach(([T, t]) => { if (T < T0 || T > T1) return; ctx.strokeStyle = alpha(pal.ink2, 0.6); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(T), box.t); ctx.lineTo(X(T), box.b); ctx.stroke(); ctx.setLineDash([]); label(ctx, t, X(T) + 4, box.t + 6, { color: pal.ink2, size: 11 }); });
    label(ctx, `I(T): máx. ${e10(M.Imax)} m⁻³s⁻¹ em ${fmt(M.TI, 0)} K`, box.l + 8, box.t + 6, { color: pal.cryst, size: 11, bg: alpha(pal.bg, 0.8) });
    label(ctx, `u(T): máx. ${e10(M.umax)} m/s em ${fmt(M.Tu, 0)} K`, box.l + 8, box.t + 22, { color: pal.glass, size: 11, bg: alpha(pal.bg, 0.8) });
    label(ctx, 'sobreposição', X((M.TI + M.Tu) / 2), Y(0.12), { color: pal.liq, size: 11, align: 'center' });
  }

  function drawTTT() {
    if (!M) return;
    const { ctx, w, h } = vT; const pal = palette(); const p = PRESETS[key];
    ctx.clearRect(0, 0, w, h);
    const [T0, T1] = Trange();
    // faixa de tempo centrada no nariz
    const ln = Math.log10(M.tn);
    const t0 = Math.floor(ln - 4), t1 = Math.ceil(ln + 8);
    const box = { l: 44, r: w - 14, t: 26, b: h - 30 };
    const X = (t) => box.l + ((Math.log10(t) - t0) / (t1 - t0)) * (box.r - box.l), Y = (T) => box.b - ((T - T0) / (T1 - T0)) * (box.b - box.t);
    const xt = []; for (let e = t0; e <= t1; e += Math.ceil((t1 - t0) / 6)) xt.push(10 ** e);
    axes(ctx, box, { x: X, y: Y, pal, xt, yt: ticks(T0, T1), xfmt: (v) => `10${sup(Math.round(Math.log10(v)))}`, xl: 't (s)', yl: 'T (K)' });
    // curva TTT (X = 10⁻⁶)
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    ctx.fillStyle = alpha(pal.cryst, 0.12); ctx.strokeStyle = pal.cryst; ctx.lineWidth = 2.5;
    ctx.beginPath(); let started = false;
    const pts = [];
    for (let i = 0; i <= 400; i++) {
      const T = T0 + ((T1 - T0) * i) / 400, t = M.tX(T);
      if (!isFinite(t) || t > 10 ** (t1 + 2)) continue;
      pts.push([X(t), Y(T)]);
    }
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    if (pts.length) { ctx.lineTo(box.r, pts[pts.length - 1][1]); ctx.lineTo(box.r, pts[0][1]); ctx.closePath(); ctx.fill(); }
    // curva de resfriamento a partir de Tm
    const qq = 10 ** Number(q.value);
    const ok = qq >= M.Rc;
    ctx.strokeStyle = ok ? pal.glass : pal.liq; ctx.lineWidth = 2.2; ctx.beginPath(); started = false;
    for (let i = 1; i <= 300; i++) {
      const t = 10 ** (t0 + ((t1 - t0) * i) / 300); const T = p.Tm - qq * t;
      if (T < T0) break;
      started ? ctx.lineTo(X(t), Y(T)) : (ctx.moveTo(X(t), Y(T)), (started = true));
    }
    ctx.stroke();
    // tangente da taxa crítica
    ctx.strokeStyle = alpha(pal.ink, 0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); started = false;
    for (let i = 1; i <= 300; i++) {
      const t = 10 ** (t0 + ((t1 - t0) * i) / 300); const T = p.Tm - M.Rc * t;
      if (T < T0) break;
      started ? ctx.lineTo(X(t), Y(T)) : (ctx.moveTo(X(t), Y(T)), (started = true));
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(M.tn), Y(M.Tn), 5, 0, 6.283); ctx.fill();
    label(ctx, `nariz: ${fmt(M.Tn, 0)} K, ${fmtT(M.tn)}`, X(M.tn) + 8, Y(M.Tn) - 10, { color: pal.ink, size: 11, bg: alpha(pal.bg, 0.85) });
    label(ctx, 'cristaliza (X > 10⁻⁶)', box.r - 6, box.t + 8, { color: pal.cryst, size: 11, align: 'right' });
    label(ctx, ok ? 'resfriamento escolhido: vidro' : 'resfriamento escolhido: cristal', box.l + 8, box.b - 12, { color: ok ? pal.glass : pal.liq, size: 12, bg: alpha(pal.bg, 0.85) });
    label(ctx, 'tracejado: taxa crítica', box.l + 8, box.b - 28, { color: pal.ink2, size: 11, weight: 500 });
  }

  function drawEta() {
    if (!M) return;
    const { ctx, w, h } = vE; const pal = palette(); const p = PRESETS[key];
    ctx.clearRect(0, 0, w, h);
    const [T0, T1] = Trange();
    const box = { l: 44, r: w - 12, t: 24, b: h - 28 };
    const X = (T) => box.l + ((T - T0) / (T1 - T0)) * (box.r - box.l);
    const eMin = Math.log10(M.eta(T1)), eMax = Math.min(14, Math.log10(M.eta(T0)));
    const Y = (le) => box.b - ((le - eMin) / (eMax - eMin || 1)) * (box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: ticks(T0, T1), yt: [Math.ceil(eMin), Math.round((eMin + eMax) / 2), Math.floor(eMax)], yfmt: (v) => `10${sup(v)}`, xl: 'T (K)', yl: 'η (Pa·s)', small: true });
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    ctx.strokeStyle = pal.scl; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const T = T0 + ((T1 - T0) * i) / 200; const v = Math.log10(M.eta(T)); i ? ctx.lineTo(X(T), Y(v)) : ctx.moveTo(X(T), Y(v)); }
    ctx.stroke(); ctx.restore();
    // D pela relação de Stokes–Einstein (eixo à direita, invertido)
    const D = (T) => (kB * T) / (3 * Math.PI * M.a * M.eta(T));
    label(ctx, `D(Tm) ≈ ${e10(D(p.Tm))} m²/s (Stokes–Einstein)`, box.l + 8, box.b - 28, { color: pal.glass, size: 11, bg: alpha(pal.bg, 0.85) });
    label(ctx, `η(Tm) ≈ ${e10(M.eta(p.Tm))} Pa·s`, box.l + 8, box.b - 12, { color: pal.scl, size: 11, bg: alpha(pal.bg, 0.85) });
  }
  function ticks(a, b) { const st = (b - a) > 1200 ? 400 : (b - a) > 600 ? 200 : 100; const out = []; for (let v = Math.ceil(a / st) * st; v <= b; v += st) out.push(v); return out; }
  update();
}
