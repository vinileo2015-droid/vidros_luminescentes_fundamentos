// Hero da Parte 2: curvas de resfriamento correndo contra o "nariz" da curva TTT (modelo de Na₂O·2SiO₂).
import { PRESETS, model } from '../lib/cnt-engine.js';
import { reducedMotion, visibility } from '../lib/ui.js';
import { mulberry32 } from '../lib/md-engine.js';

export function init() {
  const cv = document.getElementById('p2-hero-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const p = PRESETS.ns2, M = model(p);
  const T0 = p.Tg * 0.95, T1 = p.Tm;
  const lt0 = Math.log10(M.tn) - 5, lt1 = Math.log10(M.tn) + 6;
  const nose = [];
  for (let i = 0; i <= 300; i++) { const T = T0 + ((T1 - T0) * i) / 300, t = M.tX(T); if (isFinite(t)) nose.push([Math.log10(t), T]); }
  const rand = mulberry32(7);
  let curves = [], visible = true, w = 0, h = 0, dpr = 1, last = performance.now();
  const spawn = () => {
    const lq = Math.log10(M.Rc) + (rand() * 4 - 2);
    return { q: 10 ** lq, s: 0, speed: 0.12 + rand() * 0.1, dead: false, hit: null, fade: 1 };
  };
  for (let i = 0; i < 7; i++) { const c = spawn(); c.s = rand(); curves.push(c); }

  function resize() {
    const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(() => { resize(); draw(); }).observe(cv); resize();
  const X = (lt) => w * 0.06 + ((lt - lt0) / (lt1 - lt0)) * w * 0.9;
  const Y = (T) => h * 0.08 + (1 - (T - T0) / (T1 - T0)) * h * 0.84;
  // instante (log t) em que a curva cruza a TTT, se cruzar
  function crossing(q) {
    for (let i = 0; i <= 400; i++) {
      const lt = lt0 + ((lt1 - lt0) * i) / 400, T = p.Tm - q * 10 ** lt;
      if (T < T0) return null;
      const tx = M.tX(T);
      if (isFinite(tx) && 10 ** lt >= tx) return lt;
    }
    return null;
  }
  curves.forEach((c) => { c.hit = crossing(c.q); });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    // eixos discretos
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(lt0), Y(T1)); ctx.lineTo(X(lt0), Y(T0)); ctx.lineTo(X(lt1), Y(T0)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '12px "Schibsted Grotesk", system-ui';
    ctx.fillText('T', X(lt0) - 14, Y(T1) + 4); ctx.fillText('log t', X(lt1) - 30, Y(T0) + 18);
    ctx.fillText('Tm', X(lt0) + 6, Y(T1) - 6);
    // nariz (recortado à área do gráfico)
    ctx.save(); ctx.beginPath(); ctx.rect(X(lt0), Y(T1) - 2, X(lt1) - X(lt0), Y(T0) - Y(T1) + 4); ctx.clip();
    ctx.beginPath(); nose.forEach(([lt, T], i) => (i ? ctx.lineTo(X(lt), Y(T)) : ctx.moveTo(X(lt), Y(T))));
    ctx.lineTo(X(lt1), Y(nose[nose.length - 1][1])); ctx.lineTo(X(lt1), Y(nose[0][1])); ctx.closePath();
    const g = ctx.createLinearGradient(X(Math.log10(M.tn)), 0, w, 0);
    g.addColorStop(0, 'rgba(143,138,242,.55)'); g.addColorStop(1, 'rgba(143,138,242,.08)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#a9a5ff'; ctx.lineWidth = 2.5; ctx.beginPath(); nose.forEach(([lt, T], i) => (i ? ctx.lineTo(X(lt), Y(T)) : ctx.moveTo(X(lt), Y(T)))); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(233,231,255,.9)'; ctx.font = '600 13px "Schibsted Grotesk", system-ui';
    ctx.fillText('cristaliza', X(Math.log10(M.tn)) + 30, Y(M.Tn) + 4);
    // curvas
    curves.forEach((c) => {
      const end = c.hit ?? lt1;
      const ltNow = lt0 + (end - lt0) * Math.min(1, c.s);
      const ok = c.hit == null;
      ctx.strokeStyle = ok ? `rgba(55,194,196,${0.85 * c.fade})` : `rgba(255,154,92,${0.85 * c.fade})`;
      ctx.lineWidth = 2; ctx.beginPath();
      let first = true;
      for (let i = 0; i <= 200; i++) {
        const lt = lt0 + ((ltNow - lt0) * i) / 200, T = p.Tm - c.q * 10 ** lt;
        if (T < T0) break;
        first ? (ctx.moveTo(X(lt), Y(T)), (first = false)) : ctx.lineTo(X(lt), Y(T));
      }
      ctx.stroke();
      const Tn = Math.max(T0, p.Tm - c.q * 10 ** ltNow);
      if (c.s >= 1 && !ok) {
        // faísca de cristalização
        const x = X(c.hit), y = Y(p.Tm - c.q * 10 ** c.hit);
        ctx.strokeStyle = `rgba(233,231,255,${c.fade})`; ctx.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); ctx.stroke(); }
      } else {
        ctx.fillStyle = ok ? `rgba(160,240,240,${c.fade})` : `rgba(255,190,150,${c.fade})`;
        ctx.beginPath(); ctx.arc(X(ltNow), Y(Tn), 3.5, 0, 6.283); ctx.fill();
      }
      if (c.s >= 1 && ok && Tn <= T0 + 1) { ctx.fillStyle = `rgba(160,240,240,${c.fade})`; ctx.font = '600 12px "Schibsted Grotesk", system-ui'; }
    });
    ctx.fillStyle = 'rgba(160,240,240,.85)'; ctx.font = '600 13px "Schibsted Grotesk", system-ui';
    ctx.fillText('vidro', X(lt0) + 8, Y(T0) - 10);
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    curves.forEach((c) => { c.s += dt * c.speed; if (c.s > 1.6) c.fade -= dt * 1.2; });
    curves = curves.filter((c) => c.fade > 0);
    while (curves.length < 7) { const c = spawn(); c.hit = crossing(c.q); curves.push(c); }
    draw();
    if (visible) requestAnimationFrame(frame);
  }
  if (reducedMotion()) { curves.forEach((c) => { c.s = 1; }); draw(); return; }
  visibility(cv, (v) => { const was = visible; visible = v; if (v && !was) { last = performance.now(); requestAnimationFrame(frame); } }, '0px');
  requestAnimationFrame(frame);
}
