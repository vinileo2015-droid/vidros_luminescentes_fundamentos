// Mapa dos critérios de Dietzel (força de campo) e Sun (força de ligação simples).
// F = Z/a² com distâncias cátion–oxigênio de Dietzel (valores compilados por Vogel);
// ligação simples de Sun (1947) em kcal/mol. Zn: F estimada (NC 4).
import { hiDPI, palette, alpha, axes, label } from '../lib/ui.js';

const PTS = [
  ['Si', 4, 1.57, 106, 'former'], ['B', 3, 1.63, 119, 'former', 'NC 3'], ['B', 4, 1.34, 89, 'former', 'NC 4'], ['P', 4, 2.1, 100, 'former'], ['Ge', 4, 1.45, 108, 'former'],
  ['Al', 4, 0.96, 90, 'intermediate', 'NC 4'], ['Al', 6, 0.84, 60, 'intermediate', 'NC 6'], ['Ti', 6, 1.04, 73, 'intermediate'], ['Zr', 8, 0.77, 81, 'intermediate'],
  ['Be', 4, 0.86, 63, 'intermediate'], ['Zn', 4, 0.52, 72, 'intermediate'],
  ['Mg', 6, 0.45, 37, 'modifier'], ['Li', 6, 0.23, 36, 'modifier'], ['Ca', 8, 0.33, 32, 'modifier'], ['Ba', 8, 0.24, 33, 'modifier'],
  ['Na', 6, 0.19, 20, 'modifier'], ['K', 8, 0.13, 13, 'modifier'],
];
const COL = { former: 'glass', intermediate: 'cryst', modifier: 'scl' };

export function init(root) {
  const cv = root.querySelector('#crit-canvas'), out = root.querySelector('#crit-out');
  let hot = null, geom = null;
  const view = hiDPI(cv, () => draw());
  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const box = { l: 46, r: w - 14, t: 26, b: h - 34 };
    const X = (f) => box.l + (f / 2.25) * (box.r - box.l), Y = (s) => box.b - (s / 125) * (box.b - box.t);
    geom = { X, Y };
    // faixas de Sun
    ctx.fillStyle = alpha(pal.glass, 0.08); ctx.fillRect(box.l, Y(125), box.r - box.l, Y(80) - Y(125));
    ctx.fillStyle = alpha(pal.cryst, 0.07); ctx.fillRect(box.l, Y(80), box.r - box.l, Y(60) - Y(80));
    ctx.fillStyle = alpha(pal.scl, 0.08); ctx.fillRect(box.l, Y(60), box.r - box.l, Y(0) - Y(60));
    // faixas de Dietzel (marcas no eixo x)
    [[0.1, 0.4, 'scl'], [0.5, 1.0, 'cryst'], [1.4, 2.1, 'glass']].forEach(([a, b, c]) => { ctx.fillStyle = alpha(pal[c], 0.55); ctx.fillRect(X(a), box.b - 5, X(b) - X(a), 5); });
    axes(ctx, box, { x: X, y: Y, pal, xt: [0, 0.5, 1, 1.5, 2], yt: [0, 20, 40, 60, 80, 100, 120], xfmt: (v) => String(v).replace('.', ','), xl: 'força de campo F = Z/a² (Å⁻²)', yl: 'ligação simples, Sun (kcal/mol)' });
    label(ctx, 'formadores (> 80)', box.r - 6, Y(122), { color: pal.glass, align: 'right', size: 11 });
    label(ctx, 'intermediários (60–80)', box.r - 6, Y(70), { color: pal.cryst, align: 'right', size: 11 });
    label(ctx, 'modificadores (< 60)', box.r - 6, Y(50), { color: pal.scl, align: 'right', size: 11 });
    PTS.forEach((p, i) => {
      const [el, cn, f, s, cls, tag] = p;
      const x = X(f), y = Y(s);
      ctx.beginPath(); ctx.arc(x, y, i === hot ? 8 : 6, 0, 6.283);
      ctx.fillStyle = pal[COL[cls]]; ctx.fill();
      ctx.strokeStyle = i === hot ? pal.ink : pal.panel; ctx.lineWidth = 2; ctx.stroke();
      label(ctx, tag ? `${el} (${tag.replace('NC ', '')})` : el, x + 9, y - 1, { color: pal.ink, size: 11, weight: i === hot ? 700 : 500 });
    });
  }
  function describe(i) {
    const [el, cn, f, s, cls, tag] = PTS[i];
    const c = { former: 'formador', intermediate: 'intermediário', modifier: 'modificador' }[cls];
    out.textContent = `${el} (NC ${cn}): F ≈ ${String(f).replace('.', ',')} Å⁻², ligação simples ≈ ${s} kcal/mol. Os dois critérios apontam para ${c}.`;
  }
  cv.addEventListener('pointermove', (e) => {
    if (!geom) return;
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let best = null, bd = 18;
    PTS.forEach((p, i) => { const d = Math.hypot(geom.X(p[2]) - px, geom.Y(p[3]) - py); if (d < bd) { bd = d; best = i; } });
    if (best !== null && best !== hot) { hot = best; describe(best); draw(); }
  });
  hot = 0; describe(0);
}
