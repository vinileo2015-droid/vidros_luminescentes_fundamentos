// Hero da Parte 3: três ondas atravessam uma placa de vidro. O UV é absorvido pelos elétrons (gap),
// o IV pelas vibrações da rede, e o visível passa, mais lento (λ/n) dentro do vidro.
import { hiDPI, reducedMotion, visibility } from '../lib/ui.js';

export function init() {
  const cv = document.getElementById('p3-hero-canvas');
  let t = 0, last = 0, vis = true, raf = null;
  const view = hiDPI(cv, () => draw());
  const WAVES = [
    { name: 'UV', lam: 16, col: '#a78bfa', kill: 0.06, who: 'elétrons atravessam o gap' },
    { name: 'visível', lam: 34, col: '#5eead4', kill: 0, who: 'passa' },
    { name: 'IV', lam: 70, col: '#fb923c', kill: 0.035, who: 'vibrações Si–O absorvem' },
  ];
  function draw() {
    const { ctx, w, h } = view; ctx.clearRect(0, 0, w, h);
    const x0 = w * 0.36, x1 = w * 0.7, n = 1.5;
    // placa
    const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(94,234,212,0.16)'); g.addColorStop(1, 'rgba(94,234,212,0.08)');
    ctx.fillStyle = g; ctx.fillRect(x0, h * 0.06, x1 - x0, h * 0.88);
    ctx.strokeStyle = 'rgba(160,240,230,0.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 0.5, h * 0.06, x1 - x0, h * 0.88);
    // rede desordenada desenhada de leve dentro da placa
    ctx.fillStyle = 'rgba(200,250,245,0.18)';
    for (let i = 0; i < 70; i++) { const x = x0 + 8 + ((i * 47.3) % (x1 - x0 - 16)), y = h * 0.1 + ((i * 83.7) % (h * 0.8)); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill(); }
    WAVES.forEach((wv, k) => {
      const yc = h * (0.24 + 0.26 * k), A = Math.min(26, h * 0.075);
      ctx.beginPath();
      let phase = 0, amp = A, prevX = 0;
      for (let x = 0; x <= w; x += 1.5) {
        const inside = x > x0 && x < x1;
        const lam = inside ? wv.lam / n : wv.lam;
        phase += (2 * Math.PI * (x - prevX)) / lam; prevX = x;
        if (inside && wv.kill) amp *= Math.exp(-wv.kill * 1.5);
        if (x >= x1 && wv.kill) amp = Math.max(amp, 0);
        const y = yc + Math.sin(phase - t * 5) * amp;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = wv.col; ctx.lineWidth = 2.4; ctx.shadowColor = wv.col; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      // efeitos da absorção
      if (wv.name === 'UV') for (let i = 0; i < 5; i++) { const f = ((t * 0.7 + i / 5) % 1); const x = x0 + 6 + i * 7, y = yc - f * 34; ctx.fillStyle = `rgba(196,181,253,${1 - f})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); }
      if (wv.name === 'IV') for (let i = 0; i < 4; i++) { const x = x0 + 14 + i * 16, d = Math.sin(t * 9 + i) * 3; ctx.strokeStyle = 'rgba(253,186,116,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 5 - d, yc + 20); ctx.lineTo(x + 5 + d, yc + 20); ctx.stroke(); ctx.fillStyle = 'rgba(253,186,116,0.9)'; [x - 5 - d, x + 5 + d].forEach((xx) => { ctx.beginPath(); ctx.arc(xx, yc + 20, 2.4, 0, 6.283); ctx.fill(); }); }
      ctx.font = '600 13px "Schibsted Grotesk", system-ui'; ctx.fillStyle = wv.col; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(wv.name, 8, yc - A - 4);
      ctx.font = '12px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(230,240,238,0.85)';
      ctx.fillText(wv.who, w - 8, yc - A - 4);
    });
    ctx.font = '12px "Schibsted Grotesk", system-ui'; ctx.fillStyle = 'rgba(200,240,235,0.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.textBaseline = 'bottom'; ctx.fillText('vidro: λ dentro = λ/n', (x0 + x1) / 2, h * 0.94 - 6);
  }
  const loop = (now) => { raf = null; if (!vis) return; t += Math.min(0.05, (now - last) / 1000); last = now; draw(); raf = requestAnimationFrame(loop); };
  if (!reducedMotion()) visibility(cv, (v) => { vis = v; if (v && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } });
}
