// Nucleação heterogênea: calota esférica sobre um substrato (Varshneya eqs. 3.11–3.17; Handbook eq. 4.14).
// W*het = W*hom · f(θ), f(θ) = (2 + cos θ)(1 − cos θ)²/4 ; r* é o mesmo da nucleação homogênea.
import { hiDPI, palette, alpha, label, fmt } from '../lib/ui.js';
import { fTheta } from '../lib/cnt-engine.js';

export function init(root) {
  const cv = root.querySelector('#het-canvas'), s = root.querySelector('#het-theta'), sv = root.querySelector('#het-theta-v');
  const rf = root.querySelector('#het-f'), rv = root.querySelector('#het-v'), rt = root.querySelector('#het-txt');
  const view = hiDPI(cv, () => draw());
  s.addEventListener('input', () => { show(); draw(); });
  function show() {
    const t = Number(s.value), f = fTheta(t);
    sv.textContent = `${t}°`;
    rf.textContent = fmt(f, 3);
    rv.textContent = `${fmt(f * 100, 1)} %`;
    rt.textContent = t >= 175 ? 'Sem molhamento: o substrato não ajuda, é como se não existisse (nucleação homogênea).'
      : t > 90 ? 'Molhamento parcial: a barreira cai, mas o núcleo ainda é quase uma esfera.'
        : t > 20 ? 'Bom molhamento: o núcleo é uma calota achatada, com poucos átomos, e a barreira despenca. É o que um bom agente nucleante faz.'
          : 'Molhamento quase perfeito: praticamente sem barreira termodinâmica; resta só a barreira cinética (difusão).';
  }
  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const t = (Number(s.value) * Math.PI) / 180;
    const split = w > 560;
    const pw = split ? w * 0.52 : w, ph = split ? h : h * 0.55;
    // desenho da calota
    const R = Math.min(pw * 0.28, ph * 0.33);
    const cx = pw / 2, base = ph * 0.72;
    ctx.fillStyle = alpha(pal.scl, 0.08); ctx.fillRect(0, 0, pw, base);
    label(ctx, 'líquido super-resfriado', 12, 16, { color: pal.scl, size: 12 });
    ctx.fillStyle = alpha(pal.ink2, 0.25); ctx.fillRect(0, base, pw, ph - base);
    label(ctx, 'substrato (agente nucleante)', 12, base + 18, { color: pal.ink, size: 12 });
    // centro do círculo: abaixo da base por R·cos θ
    const cy = base + R * Math.cos(t);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, pw, base); ctx.clip();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283);
    ctx.fillStyle = alpha(pal.cryst, 0.45); ctx.fill(); ctx.strokeStyle = pal.cryst; ctx.lineWidth = 2; ctx.stroke();
    // padrão cristalino
    ctx.clip();
    ctx.fillStyle = alpha(pal.panel, 0.7);
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) { const x = cx + (i + (j & 1) * 0.5) * 12, y = cy + j * 10.4; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill(); }
    ctx.restore();
    // ângulo de contato
    const half = Math.sqrt(Math.max(0, R * R - (cy - base) ** 2));
    const px = cx + half;
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5;
    // tangente à calota no ponto de contato (perpendicular ao raio, apontando para cima)
    const L = 46;
    ctx.beginPath(); ctx.moveTo(px, base); ctx.lineTo(px + ((base - cy) / R) * L, base - (half / R) * L); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, base); ctx.lineTo(px - L, base); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, base, 24, Math.PI, Math.PI + t, false); ctx.stroke();
    label(ctx, 'θ', px - 34 * Math.cos(t / 2), base - 34 * Math.sin(t / 2), { color: pal.ink, size: 14, align: 'center', weight: 700 });
    // gráfico f(θ)
    const ox = split ? pw + 10 : 0, oy = split ? 0 : ph;
    const gw = split ? w - pw - 10 : w, gh = split ? h : h - ph;
    const box = { l: ox + 40, r: ox + gw - 12, t: oy + 26, b: oy + gh - 30 };
    const X = (d) => box.l + (d / 180) * (box.r - box.l), Y = (v) => box.b - v * (box.b - box.t);
    ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(box.l, box.t); ctx.lineTo(box.l, box.b); ctx.lineTo(box.r, box.b); ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0, 45, 90, 135, 180].forEach((d) => ctx.fillText(`${d}°`, X(d), box.b + 5));
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; [0, 0.5, 1].forEach((v) => ctx.fillText(fmt(v, 1), box.l - 5, Y(v)));
    label(ctx, 'f(θ) = W*het / W*hom', box.l + 6, box.t - 12, { color: pal.ink, size: 12 });
    ctx.strokeStyle = pal.cryst; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let d = 0; d <= 180; d += 2) { const y = Y(fTheta(d)); d ? ctx.lineTo(X(d), y) : ctx.moveTo(X(d), y); }
    ctx.stroke();
    const d0 = Number(s.value);
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(d0), Y(fTheta(d0)), 5, 0, 6.283); ctx.fill();
    label(ctx, '90° → ½', X(90) + 6, Y(0.5) + 12, { color: pal.ink2, size: 11, weight: 500 });
  }
  show();
}
