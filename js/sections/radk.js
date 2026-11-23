// Condutividade térmica: fônons × radiação (K_R = 16 n² σ T³ / 3α).
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';
import { segmented } from '../lib/props-data.js';

const SB = 5.670e-8;
export function init(root) {
  const cv = root.querySelector('#rk-canvas'), sA = root.querySelector('#rk-a'), sT = root.querySelector('#rk-T');
  const pre = { flint: 0.25, sl: 1.2, green: 8 };
  segmented(root.querySelector('#rk-pre'), [['flint', 'Baixo ferro (extra-claro)'], ['sl', 'Sodo-cálcico comum'], ['green', 'Verde / âmbar (muito Fe²⁺)']], (k) => { sA.value = Math.log10(pre[k]); upd(); }, 'sl');
  const view = hiDPI(cv, () => draw());
  const n = 1.5;
  const Kph = (Tc) => 1.0 + 0.0006 * Tc;
  const KR = (Tc, a) => (16 * n * n * SB * (Tc + 273.15) ** 3) / (3 * a * 100);
  function draw() {
    const { ctx, w, h } = view; const pal = palette(); ctx.clearRect(0, 0, w, h);
    const a = 10 ** +sA.value, Tsel = +sT.value;
    const box = { l: 50, r: w - 14, t: 28, b: h - 32 };
    const X = (T) => box.l + (T / 1500) * (box.r - box.l), Y = (k) => box.b - ((Math.log10(k) + 2) / 5) * (box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 300, 600, 900, 1200, 1500], yt: [0.01, 0.1, 1, 10, 100, 1000], yfmt: (v) => fmt(v, v < 1 ? 2 : 0), xl: 'T (°C)', yl: 'K (W m⁻¹ K⁻¹), log' });
    const line = (f, col, lw) => { ctx.beginPath(); for (let T = 0; T <= 1500; T += 10) { const y = Y(Math.max(0.01, f(T))); T ? ctx.lineTo(X(T), y) : ctx.moveTo(X(T), y); } ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); };
    line(Kph, pal.cryst, 2.5); line((T) => KR(T, a), pal.liq, 2.5); line((T) => Kph(T) + KR(T, a), pal.ink, 1.5);
    // cruzamento
    let Tx = null; for (let T = 0; T <= 1500; T += 2) if (KR(T, a) >= Kph(T)) { Tx = T; break; }
    if (Tx != null) { ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(Tx), Y(Kph(Tx)), 4, 0, 6.283); ctx.fill(); label(ctx, `radiação = fônons em ${fmt(Tx)} °C`, X(Tx) + 8, Y(Kph(Tx)) + 14, { color: pal.ink, size: 11, bg: alpha(pal.panel, 0.85) }); }
    label(ctx, 'fônons', X(1480), Y(Kph(1480)) - 10, { color: pal.cryst, align: 'right', size: 12 });
    label(ctx, 'radiação', X(1480), Y(KR(1480, a)) + (KR(1480, a) > 400 ? 14 : -10), { color: pal.liq, align: 'right', size: 12 });
    ctx.strokeStyle = alpha(pal.ink, 0.5); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(Tsel), box.t); ctx.lineTo(X(Tsel), box.b); ctx.stroke(); ctx.setLineDash([]);
    const kp = Kph(Tsel), kr = KR(Tsel, a);
    root.querySelector('#rk-a-v').textContent = `${fmt(a, a < 1 ? 2 : 1)} cm⁻¹`;
    root.querySelector('#rk-T-v').textContent = `${fmt(Tsel)} °C`;
    root.querySelector('#rk-kp').textContent = fmt(kp, 2);
    root.querySelector('#rk-kr').textContent = fmt(kr, kr < 1 ? 2 : 1);
    root.querySelector('#rk-f').textContent = `${fmt((100 * kr) / (kp + kr), 0)} %`;
    root.querySelector('#rk-d').textContent = `${fmt(10 / a, 1)} mm`;
  }
  function upd() { draw(); }
  [sA, sT].forEach((s) => s.addEventListener('input', upd));
}
