// Prévia da próxima parte: linhas de emissão estreitas de terras-raras (esquemático).
import { reducedMotion, visibility } from '../lib/ui.js';

export function init() {
  const cv = document.getElementById('next-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  // linhas típicas: Tb³⁺ 545 nm (verde), Eu³⁺ 612 nm (vermelho), Tm³⁺ 455 nm (azul)
  const lines = [[455, '#5b8cff', 0.5], [488, '#4fd1c5', 0.35], [545, '#7ef08a', 1], [590, '#ffb347', 0.45], [612, '#ff4d5e', 0.95], [700, '#c2183a', 0.3]];
  let t = 0, visible = false, running = false;
  function draw() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height;
    ctx.clearRect(0, 0, w, h);
    const X = (nm) => 10 + ((nm - 430) / 300) * (w - 20);
    ctx.globalCompositeOperation = 'lighter';
    for (const [nm, c, a] of lines) {
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.5 + nm);
      const g = ctx.createRadialGradient(X(nm), h - 20, 0, X(nm), h - 20, h * 0.9);
      g.addColorStop(0, c); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.25 * a * pulse; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = c;
      const hh = (h - 34) * a * pulse;
      ctx.fillRect(X(nm) - 1.5, h - 20 - hh, 3, hh);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d9c6d2'; ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'center';
    [450, 550, 650].forEach((nm) => ctx.fillText(`${nm} nm`, X(nm), h - 4));
  }
  function loop() { if (!visible) { running = false; return; } t += 1 / 60; draw(); requestAnimationFrame(loop); }
  visibility(cv, (v) => { visible = v; if (v && !running && !reducedMotion()) { running = true; requestAnimationFrame(loop); } else draw(); });
  draw();
}
