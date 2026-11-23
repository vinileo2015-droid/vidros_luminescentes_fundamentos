// Gráfico de Angell (log η × Tg/T) com curvas MYEGA para valores típicos de fragilidade m.
import { hiDPI, palette, alpha, axes, label } from '../lib/ui.js';
import { myega } from '../lib/visc.js';

const LIQ = [
  { n: 'SiO₂ (sílica)', m: 20, k: 'Óxido forte, rede tetraédrica 3D' },
  { n: 'GeO₂', m: 22, k: 'Óxido forte' },
  { n: 'Vidro sodo-cálcico', m: 38, k: 'Óxido modificado: a rede quebrada fica mais frágil' },
  { n: 'Vitreloy 1 (Zr)', m: 44, k: 'Vidro metálico massivo relativamente forte' },
  { n: 'Glicerol', m: 53, k: 'Líquido molecular com ligações de H' },
  { n: 'o-Terfenil', m: 81, k: 'Líquido molecular de van der Waals, frágil clássico' },
  { n: 'Poliestireno', m: 140, k: 'Polímero: relaxação segmental' },
  { n: 'PVC', m: 190, k: 'Polímero muito frágil' },
];

export function init(root) {
  const cv = root.querySelector('#ang-canvas');
  const list = root.querySelector('#ang-list');
  let hot = 0;
  const colorFor = (pal, m) => {
    // de forte (azul-petróleo) a frágil (laranja)
    const u = Math.min(1, Math.log(m / 18) / Math.log(200 / 18));
    return u < 0.5 ? mix(pal.glass, pal.scl, u * 2) : mix(pal.scl, pal.liq, (u - 0.5) * 2);
  };
  function mix(a, b, u) {
    const A = a.match(/[\d.]+/g).map(Number), B = b.match(/[\d.]+/g).map(Number);
    return `rgb(${A.slice(0, 3).map((v, i) => Math.round(v + (B[i] - v) * u)).join(',')})`;
  }

  list.innerHTML = `<div class="btns" style="flex-direction:column;align-items:stretch">${LIQ.map((l, i) =>
    `<button class="btn" type="button" data-i="${i}" aria-pressed="${i === hot}" style="justify-content:space-between"><span>${l.n}</span><span class="val">m ≈ ${l.m}</span></button>`).join('')}</div>
    <p class="note" id="ang-k"></p>`;
  const kEl = list.querySelector('#ang-k');
  list.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setHot(Number(b.dataset.i)); });
  list.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b) setHot(Number(b.dataset.i)); });
  function setHot(i) {
    hot = i;
    [...list.querySelectorAll('button')].forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    kEl.textContent = `${LIQ[i].n}: ${LIQ[i].k}. Fragilidade m ≈ ${LIQ[i].m}.`;
    draw();
  }

  const view = hiDPI(cv, () => draw());
  let geom = null;
  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const box = { l: 40, r: w - 14, t: 24, b: h - 30 };
    const X = (r) => box.l + r * (box.r - box.l), Y = (v) => box.b - ((v + 4) / 17) * (box.b - box.t);
    geom = { X, Y, box };
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 0.2, 0.4, 0.6, 0.8, 1], yt: [-3, 0, 3, 6, 9, 12], xfmt: (v) => String(v).replace('.', ','), yfmt: (v) => String(v).replace('-', '−'), xl: 'Tg / T', yl: 'log η (Pa·s)' });
    LIQ.forEach((l, i) => {
      if (i === hot) return;
      ctx.strokeStyle = alpha(colorFor(pal, l.m), 0.45); ctx.lineWidth = 1.6;
      ctx.beginPath(); for (let r = 0.02; r <= 1.0001; r += 0.01) { const v = myega(1, r, l.m); r < 0.025 ? ctx.moveTo(X(r), Y(v)) : ctx.lineTo(X(r), Y(v)); } ctx.stroke();
    });
    const l = LIQ[hot];
    ctx.strokeStyle = colorFor(pal, l.m); ctx.lineWidth = 3.2;
    ctx.beginPath(); for (let r = 0.02; r <= 1.0001; r += 0.005) { const v = myega(1, r, l.m); r < 0.025 ? ctx.moveTo(X(r), Y(v)) : ctx.lineTo(X(r), Y(v)); } ctx.stroke();
    // tangente em Tg: inclinação = m
    ctx.strokeStyle = alpha(pal.ink, 0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    const r0 = 1 - 9 / l.m;
    ctx.beginPath(); ctx.moveTo(X(Math.max(0, r0)), Y(12 - l.m * (1 - Math.max(0, r0)))); ctx.lineTo(X(1), Y(12)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, `inclinação em Tg = m ≈ ${l.m}`, X(Math.max(0.05, r0)) - 8, Y(12 - l.m * (1 - Math.max(0, r0))), { color: pal.ink, size: 12, align: 'right', bg: alpha(pal.bg, 0.85) });
    label(ctx, 'forte (Arrhenius)', X(0.12), Y(-3 + 15 * 0.12) - 18, { color: pal.glass, size: 12, bg: alpha(pal.bg, 0.8) });
    label(ctx, 'frágil', X(0.78), Y(myega(1, 0.78, 140)) + 16, { color: pal.liq, size: 12, bg: alpha(pal.bg, 0.8) });
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(1), Y(12), 4, 0, 6.283); ctx.fill();
  }
  cv.addEventListener('pointermove', (e) => {
    if (!geom) return;
    const rect = cv.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top;
    const r = (px - geom.box.l) / (geom.box.r - geom.box.l);
    if (r < 0.03 || r > 1) return;
    let best = -1, bd = 22;
    LIQ.forEach((l, i) => { const d = Math.abs(geom.Y(myega(1, r, l.m)) - py); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && best !== hot) setHot(best);
  });
  setHot(2);
}
