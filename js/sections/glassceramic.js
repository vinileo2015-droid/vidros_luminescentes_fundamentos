// Clipe: tratamento térmico em duas etapas (nucleação em T_N, crescimento em T_C),
// com e sem agente nucleante. Esquemático, inspirado no Handbook (cap. 4) e no Varshneya (seção 3.3.2).
import { hiDPI, palette, alpha, label } from '../lib/ui.js';
import { Clip } from '../lib/clip.js';
import { mulberry32 } from '../lib/md-engine.js';

const DUR = 22;
// perfil de temperatura (fração de tempo → T normalizada 0..1)
const SCHED = [[0, 0.05], [0.12, 0.55], [0.38, 0.55], [0.46, 0.8], [0.82, 0.8], [1, 0.05]];
const Tof = (u) => { for (let i = 1; i < SCHED.length; i++) if (u <= SCHED[i][0]) { const [a, ta] = SCHED[i - 1], [b, tb] = SCHED[i]; return ta + ((tb - ta) * (u - a)) / (b - a); } return SCHED[SCHED.length - 1][1]; };
// taxas esquemáticas em função da T normalizada: I com pico em 0,55; u com pico em 0,8
const Irate = (T) => Math.exp(-(((T - 0.55) / 0.08) ** 2));
const Urate = (T) => Math.exp(-(((T - 0.82) / 0.12) ** 2));

export function init(root) {
  const cv = root.querySelector('#gc-canvas');
  const rand = mulberry32(31);
  // locais potenciais de núcleos
  const bulk = Array.from({ length: 160 }, () => ({ x: rand(), y: rand(), th: rand() }));
  let u = 0;
  const view = hiDPI(cv, () => draw());

  function stats(uu) {
    // integra nucleação e crescimento até a fração uu
    let N = 0, n = 40, nuc = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * uu; N += Irate(Tof(t)) * (uu / n); }
    let grow = 0; for (let i = 0; i < n; i++) { const t = (i / n) * uu; grow += Urate(Tof(t)) * (uu / n); }
    return { N, grow };
  }

  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560;
    // gráfico do tratamento térmico
    const gh = narrow ? h * 0.36 : h * 0.4;
    const box = { l: 40, r: w - 14, t: 22, b: gh - 18 };
    const X = (uu) => box.l + uu * (box.r - box.l), Y = (T) => box.b - T * (box.b - box.t);
    ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(box.l, box.t); ctx.lineTo(box.l, box.b); ctx.lineTo(box.r, box.b); ctx.stroke();
    label(ctx, 'T', box.l - 14, box.t + 2, { color: pal.ink, size: 12 });
    label(ctx, 'tempo', box.r, box.b + 10, { color: pal.ink2, size: 11, align: 'right' });
    // faixas de I e u (como "mapas de calor" no eixo T)
    for (let i = 0; i < 60; i++) {
      const T = i / 60;
      ctx.fillStyle = alpha(pal.cryst, Irate(T) * 0.2); ctx.fillRect(box.l + 1, Y(T + 1 / 60), box.r - box.l, Y(T) - Y(T + 1 / 60) + 0.5);
      ctx.fillStyle = alpha(pal.glass, Urate(T) * 0.2); ctx.fillRect(box.l + 1, Y(T + 1 / 60), box.r - box.l, Y(T) - Y(T + 1 / 60) + 0.5);
    }
    label(ctx, 'faixa de nucleação (I alto)', box.r - 6, Y(0.47), { color: pal.cryst, size: 11, align: 'right' });
    label(ctx, 'faixa de crescimento (u alto)', box.r - 6, Y(0.8) - 12, { color: pal.glass, size: 11, align: 'right' });
    ctx.strokeStyle = alpha(pal.ink, 0.3); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const uu = i / 200; i ? ctx.lineTo(X(uu), Y(Tof(uu))) : ctx.moveTo(X(uu), Y(Tof(uu))); }
    ctx.stroke();
    ctx.strokeStyle = pal.liq; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 200 * u; i++) { const uu = i / 200; i ? ctx.lineTo(X(uu), Y(Tof(uu))) : ctx.moveTo(X(uu), Y(Tof(uu))); }
    ctx.stroke();
    ctx.fillStyle = pal.liq; ctx.beginPath(); ctx.arc(X(u), Y(Tof(u)), 5, 0, 6.283); ctx.fill();
    label(ctx, 'T_N', X(0.25), Y(0.55) + 12, { color: pal.ink, size: 12, align: 'center' });
    label(ctx, 'T_C', X(0.64), Y(0.8) + 12, { color: pal.ink, size: 12, align: 'center' });

    // duas amostras
    const { N, grow } = stats(u);
    const gap = 14, top = gh + 22;
    const pw = narrow ? w - 28 : (w - 28 - gap) / 2, ph = narrow ? (h - top - 30 - gap) / 2 : h - top - 14;
    const panels = narrow ? [[14, top], [14, top + ph + gap + 16]] : [[14, top], [14 + pw + gap, top]];
    [['Com agente nucleante (TiO₂/ZrO₂)', true], ['Sem agente nucleante', false]].forEach(([title, nucleant], k) => {
      const [x0, y0] = panels[k];
      label(ctx, title, x0, y0 - 10, { color: pal.ink, size: 13 });
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x0, y0, pw, ph, 10); ctx.clip();
      ctx.fillStyle = alpha(pal.glass, 0.12); ctx.fillRect(x0, y0, pw, ph);
      const S = Math.min(pw, ph);
      if (nucleant) {
        const count = Math.min(bulk.length, Math.round(N * 900));
        for (let i = 0; i < count; i++) {
          const b = bulk[i];
          const born = (i / 900) / (N || 1); // fração do N total quando nasceu
          const r = Math.max(1.6, grow * S * 0.22 * (1 - 0.3 * born));
          drawGrain(ctx, x0 + b.x * pw, y0 + b.y * ph, r, b.th, pal);
        }
      } else {
        // cristalização a partir das superfícies + poucos núcleos em impurezas
        const d = grow * S * 0.22;
        if (d > 0.5) {
          ctx.fillStyle = alpha(pal.cryst, 0.55);
          ctx.fillRect(x0, y0, pw, d); ctx.fillRect(x0, y0 + ph - d, pw, d); ctx.fillRect(x0, y0, d, ph); ctx.fillRect(x0 + pw - d, y0, d, ph);
          // cristais colunares
          ctx.strokeStyle = alpha(pal.panel, 0.6); ctx.lineWidth = 1;
          for (let i = 0; i < pw; i += 9) { ctx.beginPath(); ctx.moveTo(x0 + i, y0); ctx.lineTo(x0 + i + 3, y0 + d); ctx.moveTo(x0 + i, y0 + ph); ctx.lineTo(x0 + i + 3, y0 + ph - d); ctx.stroke(); }
        }
        const few = Math.min(3, Math.round(N * 4));
        for (let i = 0; i < few; i++) { const b = bulk[i * 37]; drawGrain(ctx, x0 + b.x * pw, y0 + b.y * ph, Math.max(1.5, grow * S * 0.22), b.th, pal); }
      }
      ctx.restore();
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x0, y0, pw, ph, 10); ctx.stroke();
    });
  }
  function drawGrain(ctx, x, y, r, th, pal) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = th * 6 + (k * Math.PI) / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = alpha(pal.cryst, 0.7); ctx.fill();
    ctx.strokeStyle = alpha(pal.panel, 0.8); ctx.lineWidth = 0.8; ctx.stroke();
  }

  new Clip(root.querySelector('#gc-clip'), {
    duration: DUR, label: 'tratamento térmico',
    chapters: [
      { t: 0, text: 'Vidro-base transparente, já com o nucleante dissolvido.' },
      { t: 2.6, text: 'Patamar em T_N, perto do máximo da nucleação: surgem muitos núcleos, ainda invisíveis.' },
      { t: 8.6, text: 'Subida para T_C, onde o crescimento é rápido.' },
      { t: 10.2, text: 'Patamar em T_C: os núcleos crescem e se tocam. Com nucleante: microestrutura fina e uniforme.' },
      { t: 15, text: 'Sem nucleante: os cristais crescem das superfícies, grossos e orientados; o interior continua vítreo.' },
      { t: 18.2, text: 'Resfriamento: uma vitrocerâmica (com nucleante) e um vidro com crosta cristalina (sem).' },
    ],
    render: (t) => { u = t / DUR; draw(); },
  });
}
