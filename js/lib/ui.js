// Utilidades de interface: cores do tema, canvas em alta resolução, visibilidade, eixos.

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function cssVar(name, el = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

// Lê a paleta resolvida (light-dark() é resolvido pelo navegador via getComputedStyle em um elemento de teste)
let probe;
export function color(name) {
  if (!probe) {
    probe = document.createElement('span');
    probe.style.display = 'none';
    document.body.appendChild(probe);
  }
  probe.style.color = `var(${name})`;
  return getComputedStyle(probe).color;
}
export function palette() {
  return {
    bg: color('--bg'), bg2: color('--bg-2'), panel: color('--panel'), ink: color('--ink'), ink2: color('--ink-2'),
    rule: color('--rule'), liq: color('--liq'), scl: color('--scl'), glass: color('--glass'), cryst: color('--cryst'),
  };
}
export function alpha(rgb, a) {
  const m = rgb.match(/[\d.]+/g);
  if (!m) return rgb;
  return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
}

// Dispara 'themechange' quando o tema muda (preferência do sistema ou data-theme).
const themeListeners = new Set();
export function onTheme(fn) { themeListeners.add(fn); return () => themeListeners.delete(fn); }
const fire = () => themeListeners.forEach((f) => f());
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fire);
new MutationObserver(fire).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// Canvas com DPR e ResizeObserver. draw(ctx, w, h) chamado ao redimensionar.
export function hiDPI(canvas, draw) {
  const ctx = canvas.getContext('2d');
  const state = { w: 0, h: 0, ctx };
  let ready = false;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(10, r.width), h = Math.max(10, r.height);
    if (ready && w === state.w && h === state.h && canvas.width === Math.round(w * dpr)) return;
    state.w = w; state.h = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ready && draw) draw(ctx, state.w, state.h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  // o primeiro desenho fica para depois que o chamador recebe o objeto
  queueMicrotask(() => { ready = true; draw && draw(ctx, state.w, state.h); });
  onTheme(() => draw && draw(ctx, state.w, state.h));
  state.redraw = () => draw && draw(ctx, state.w, state.h);
  return state;
}

// Observa se o elemento está na tela (para pausar animações fora de vista)
export function visibility(el, cb, margin = '100px') {
  const io = new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), { rootMargin: margin });
  io.observe(el);
  return io;
}

// Mapas lineares / logarítmicos
export const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
export const lg = (d0, d1, r0, r1) => {
  const a = Math.log10(d0), b = Math.log10(d1);
  return (v) => r0 + ((Math.log10(v) - a) / (b - a)) * (r1 - r0);
};

// Desenha eixos simples com ticks
export function axes(ctx, box, { x, y, xt = [], yt = [], xl = '', yl = '', pal, xfmt = String, yfmt = String, small = false }) {
  const { l, r, t, b } = box;
  ctx.save();
  ctx.strokeStyle = pal.rule; ctx.lineWidth = 1;
  ctx.fillStyle = pal.ink2;
  ctx.font = `${small ? 11 : 12}px "Schibsted Grotesk", system-ui, sans-serif`;
  // grade
  ctx.globalAlpha = 0.6;
  for (const v of yt) { const yy = Math.round(y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, yy); ctx.lineTo(r, yy); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l, b); ctx.lineTo(r, b); ctx.strokeStyle = pal.ink2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const v of xt) { const xx = x(v); ctx.fillText(xfmt(v), xx, b + 6); ctx.beginPath(); ctx.moveTo(xx, b); ctx.lineTo(xx, b + 4); ctx.stroke(); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const v of yt) { ctx.fillText(yfmt(v), l - 6, y(v)); }
  ctx.fillStyle = pal.ink;
  ctx.font = `600 12px "Schibsted Grotesk", system-ui, sans-serif`;
  if (xl) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(xl, r, b - 6); }
  if (yl) { ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(yl, Math.max(2, l - 30), t - 6); }
  ctx.restore();
}

export function label(ctx, text, x, y, { color, align = 'left', base = 'middle', size = 12, weight = 600, bg = null, pad = 3 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px "Schibsted Grotesk", system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (bg) {
    const w = ctx.measureText(text).width;
    let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    let y0 = base === 'middle' ? y - size / 2 - 1 : base === 'bottom' ? y - size - 2 : y;
    ctx.fillStyle = bg; ctx.fillRect(x0 - pad, y0 - pad + 1, w + 2 * pad, size + 2 * pad);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
export const pow10 = (e) => `10${sup(e)}`;
export const fmt = (v, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
