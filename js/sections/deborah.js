// Tempo de relaxação vs temperatura (vidro sodo-cálcico, MYEGA) e o número de Deborah.
import { hiDPI, palette, alpha, axes, label, sup, fmt } from '../lib/ui.js';
import { logEtaSLS as logEta } from '../lib/visc.js';

const LOG_G = 10.5; // log10 G∞ (Pa)
const OBS = [
  { k: '1 s', s: 1 }, { k: '1 hora', s: 3600 }, { k: '1 ano', s: 3.156e7 },
  { k: 'história humana (~10⁴ anos)', short: '10⁴ anos', s: 3.156e11 }, { k: 'idade do universo', short: 'universo', s: 4.35e17 },
];
const logTau = (Tc) => logEta(Tc + 273.15) - LOG_G;

function fmtTime(lt) {
  const s = Math.pow(10, lt);
  if (lt < -3) return `10${sup(Math.round(lt))} s`;
  if (s < 60) return `${fmt(s, s < 10 ? 2 : 0)} s`;
  if (s < 3600) return `${fmt(s / 60, 0)} min`;
  if (s < 86400) return `${fmt(s / 3600, 1)} h`;
  if (s < 3.156e7) return `${fmt(s / 86400, 0)} dias`;
  const y = s / 3.156e7;
  if (y < 1e4) return `${fmt(y, 0)} anos`;
  return `10${sup(Math.round(Math.log10(y)))} anos`;
}

export function init(root) {
  const canvas = root.querySelector('#deb-canvas');
  const obsHost = root.querySelector('#deb-obs');
  const obsV = root.querySelector('#deb-obs-v');
  const Ts = root.querySelector('#deb-T');
  const TsV = root.querySelector('#deb-T-v');
  const tauEl = root.querySelector('#deb-tau');
  const deEl = root.querySelector('#deb-De');
  const verdict = root.querySelector('#deb-verdict');
  let sel = 1;

  obsHost.innerHTML = OBS.map((o, i) => `<button class="btn" type="button" data-i="${i}" aria-pressed="${i === sel}">${o.short || o.k}</button>`).join('');
  obsHost.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sel = Number(b.dataset.i);
    [...obsHost.children].forEach((c, i) => c.setAttribute('aria-pressed', String(i === sel)));
    update();
  });
  Ts.addEventListener('input', update);

  const view = hiDPI(canvas, () => draw());

  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const small = w < 480;
    const box = { l: 44, r: w - 12, t: 30, b: h - 30 };
    const x = (T) => box.l + ((T - 400) / 1100) * (box.r - box.l);
    const y = (lt) => box.b - ((lt + 10) / 32) * (box.b - box.t);
    const lobs = Math.log10(OBS[sel].s);
    // região "sólido aparente": τ > t_obs
    ctx.save();
    ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    ctx.fillStyle = alpha(pal.glass, 0.12);
    ctx.fillRect(box.l, box.t, box.r - box.l, y(lobs) - box.t);
    ctx.fillStyle = alpha(pal.liq, 0.07);
    ctx.fillRect(box.l, y(lobs), box.r - box.l, box.b - y(lobs));
    ctx.restore();
    axes(ctx, box, {
      x, y, pal, xt: small ? [400, 800, 1200] : [400, 600, 800, 1000, 1200, 1400], yt: [-10, -5, 0, 5, 10, 15, 20],
      xl: 'T (°C)', yl: 'log τ (s)', yfmt: (v) => String(v).replace('-', '−'),
    });
    // linhas de observação
    OBS.forEach((o, i) => {
      const yy = y(Math.log10(o.s));
      ctx.strokeStyle = i === sel ? pal.ink : alpha(pal.ink2, 0.5);
      ctx.lineWidth = i === sel ? 1.6 : 1; ctx.setLineDash(i === sel ? [] : [3, 4]);
      ctx.beginPath(); ctx.moveTo(box.l, yy); ctx.lineTo(box.r, yy); ctx.stroke(); ctx.setLineDash([]);
      if (i === sel || !small) label(ctx, o.short || o.k, box.r - 4, yy - 3, { color: i === sel ? pal.ink : pal.ink2, align: 'right', base: 'bottom', size: 11, weight: i === sel ? 700 : 500 });
    });
    // curva τ(T)
    const Tg = 550;
    const path = (a0, a1) => { ctx.beginPath(); for (let T = a0; T <= a1; T += 2) { const v = logTau(T); T === a0 ? ctx.moveTo(x(T), y(v)) : ctx.lineTo(x(T), y(v)); } };
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t - 2, box.r - box.l, box.b - box.t + 2); ctx.clip();
    ctx.lineWidth = 2.5; ctx.strokeStyle = pal.scl; path(Tg, 1500); ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = alpha(pal.scl, 0.7); path(400, Tg); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // Tg
    ctx.strokeStyle = pal.glass; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x(Tg), box.t); ctx.lineTo(x(Tg), box.b); ctx.stroke();
    label(ctx, 'Tg ≈ 550 °C', x(Tg) + 8, box.t + 10, { color: pal.glass, size: 12, bg: alpha(pal.bg, 0.85) });
    if (!small) label(ctx, 'tracejado: equilíbrio extrapolado', box.l + 6, y(17.5), { color: pal.ink2, align: 'left', size: 11, weight: 500, bg: alpha(pal.bg, 0.85) });
    // cruzamento τ = t_obs
    let Tx = null;
    for (let T = 400; T < 1500; T += 1) if (logTau(T) > lobs && logTau(T + 1) <= lobs) { Tx = T; break; }
    if (Tx) {
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(x(Tx), y(lobs), 4.5, 0, 6.283); ctx.fill();
      label(ctx, `τ = t_obs em ~${Tx} °C`, x(Tx) + 10, y(lobs) - 12, { color: pal.ink, size: 12, bg: alpha(pal.bg, 0.85) });
    }
    label(ctx, 'responde como sólido (De ≫ 1)', x(Tg) + 8, box.t + 30, { color: pal.glass, size: 12, bg: alpha(pal.bg, 0.8) });
    label(ctx, 'escoa como líquido (De ≪ 1)', box.l + 8, box.b - 12, { color: pal.liq, size: 12, bg: alpha(pal.bg, 0.8) });
    // marcador de T
    const Tc = Number(Ts.value), lt = logTau(Tc);
    ctx.strokeStyle = alpha(pal.ink, 0.35); ctx.beginPath(); ctx.moveTo(x(Tc), box.t); ctx.lineTo(x(Tc), box.b); ctx.stroke();
    if (lt < 22) { ctx.fillStyle = pal.scl; ctx.strokeStyle = pal.bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x(Tc), y(lt), 6, 0, 6.283); ctx.fill(); ctx.stroke(); }
  }

  function update() {
    const Tc = Number(Ts.value), lt = logTau(Tc), lobs = Math.log10(OBS[sel].s);
    TsV.textContent = `${Tc} °C`;
    obsV.textContent = OBS[sel].k;
    tauEl.textContent = fmtTime(lt);
    const lde = lt - lobs;
    deEl.textContent = Math.abs(lde) < 2 ? fmt(Math.pow(10, lde), Math.abs(lde) < 1 ? 2 : 0) : `10${sup(Math.round(lde))}`;
    verdict.textContent = lde > 2
      ? `Em ${OBS[sel].k}, o material a ${Tc} °C responde como sólido: os átomos não têm tempo de trocar de vizinhos.`
      : lde < -2
        ? `Em ${OBS[sel].k}, o material a ${Tc} °C escoa: a estrutura se rearranja muitas vezes durante a observação.`
        : `Zona viscoelástica: τ e o tempo de observação são comparáveis. É aqui que se mede a transição vítrea.`;
    draw();
  }
  update();
}
