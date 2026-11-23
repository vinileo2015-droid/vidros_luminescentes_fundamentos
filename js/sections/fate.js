// Clipe: destino final de um cristal, de um sólido amorfo e de um vidro em tempo "infinito".
// Esquemático: os tempos absolutos dependem enormemente do material e da temperatura.
import { hiDPI, palette, alpha, label, sup } from '../lib/ui.js';
import { Clip } from '../lib/clip.js';
import { mulberry32 } from '../lib/md-engine.js';

const LMAX = 40; // log10(t/s) máximo mostrado

export function init(root) {
  const canvas = root.querySelector('#fate-canvas');
  const rand = mulberry32(5);
  const cols = 11, rows = 9;
  const P = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    P.push({ lx: i + (j % 2) * 0.5, ly: j * 0.866, dx: (rand() - 0.5) * 0.9, dy: (rand() - 0.5) * 0.9, ph: rand() * 6.28 });
  }
  const nuc = { amor: [2.2, 2.0], glass: [7.5, 5.0] };
  let lt = 0, time = 0;

  const view = hiDPI(canvas, () => draw());

  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  function panel(ctx, x0, y0, pw, ph, kind, pal) {
    const s = Math.min(pw / (cols + 0.5), ph / (rows * 0.866 + 0.6));
    const ox = x0 + (pw - s * (cols - 0.5)) / 2, oy = y0 + (ph - s * (rows - 1) * 0.866) / 2;
    ctx.fillStyle = pal.bg2; ctx.beginPath(); ctx.roundRect(x0, y0, pw, ph, 10); ctx.fill();
    // progresso
    let front = 0, relax = 0;
    if (kind === 'amor') front = (lt - 24) * 1.6;
    if (kind === 'glass') { relax = smooth((lt - 6) / 14); front = (lt - 31) * 1.6; }
    let nCr = 0;
    for (const p of P) {
      let f = 0;
      if (kind === 'cryst') f = 1;
      else {
        const [cx, cy] = nuc[kind];
        const d = Math.hypot(p.lx - cx, p.ly - cy);
        f = smooth((front - d) / 1.2);
      }
      if (f > 0.5) nCr++;
      const amp = 1 - f;
      // rearranjos locais raros durante a relaxação do vidro
      const flick = kind === 'glass' && relax > 0 && relax < 1 ? 0.06 * Math.sin(time * 2 + p.ph * 7) * (1 - relax) : 0;
      const comp = kind === 'glass' ? 1 - 0.03 * relax * (1 - f) : 1;
      const x = ox + ((p.lx + p.dx * amp + flick - cols / 2) * comp + cols / 2) * s;
      const y = oy + ((p.ly + p.dy * amp - rows * 0.433) * comp + rows * 0.433) * s;
      ctx.fillStyle = f > 0.5 ? pal.cryst : kind === 'glass' ? pal.glass : pal.ink2;
      ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, 6.283); ctx.fill();
    }
    return { cryst: nCr / P.length, relax };
  }

  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560;
    const pad = narrow ? 10 : 18, gap = narrow ? 8 : 16;
    const top = 30, axisH = 64;
    const pw = (w - 2 * pad - 2 * gap) / 3, ph = h - top - axisH - 34;
    const kinds = [['cryst', 'Cristal', pal.cryst], ['amor', 'Sólido amorfo', pal.ink2], ['glass', 'Vidro', pal.glass]];
    kinds.forEach(([k, name, col], i) => {
      const x0 = pad + i * (pw + gap);
      label(ctx, name, x0, top - 12, { color: col, size: narrow ? 13 : 15, weight: 700 });
      const st = panel(ctx, x0, top, pw, ph, k, pal);
      let txt;
      const N = narrow;
      if (k === 'cryst') txt = N ? 'Estável.' : 'Estável: nada muda.';
      else if (k === 'amor') txt = st.cryst > 0.98 ? 'Cristalizou.' : st.cryst > 0.02 ? 'Cristalizando…' : N ? 'Sem LSR.' : 'Sem caminho para o LSR.';
      else txt = st.cryst > 0.98 ? 'Cristalizou.' : st.cryst > 0.02 ? (N ? 'Nucleia.' : 'Do LSR, nucleia o cristal.') : st.relax > 0.99 ? (N ? 'É LSR.' : 'Relaxou: agora é LSR.') : st.relax > 0.01 ? (N ? 'Relaxando…' : 'Relaxando rumo ao LSR…') : N ? 'Parece sólido.' : 'Parece sólido.';
      label(ctx, txt, x0 + 2, top + ph + 14, { color: pal.ink, size: narrow ? 11 : 13, weight: 500 });
      if (k === 'glass') {
        // barra de afastamento do equilíbrio (Tf − T)
        const bw = Math.min(pw * 0.5, 120), bx = x0 + pw - bw - 6, by = top + 8;
        ctx.fillStyle = alpha(pal.panel, 0.9); ctx.beginPath(); ctx.roundRect(bx - 6, by - 4, bw + 12, 30, 6); ctx.fill();
        label(ctx, 'Tf − T', bx, by + 5, { color: pal.ink2, size: 10, weight: 600 });
        ctx.fillStyle = pal.rule; ctx.fillRect(bx, by + 14, bw, 6);
        ctx.fillStyle = pal.scl; ctx.fillRect(bx, by + 14, bw * (1 - st.relax), 6);
      }
    });
    // eixo de tempo log
    const l = pad + 4, r = w - pad - 4, y = h - 34;
    const X = (v) => l + (v / LMAX) * (r - l);
    ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke();
    const marks = [[0, '1 s'], [7.5, '1 ano'], [17.6, 'idade do universo'], [30, `10${sup(30)} s`], [40, `10${sup(40)} s`]];
    marks.forEach(([v, t]) => {
      ctx.beginPath(); ctx.moveTo(X(v), y - 4); ctx.lineTo(X(v), y + 4); ctx.stroke();
      if (!narrow || v === 0 || v === 17.6 || v === 40) label(ctx, t, X(v), y + 8, { color: pal.ink2, size: 11, weight: 500, align: v === 0 ? 'left' : v === 40 ? 'right' : 'center', base: 'top' });
    });
    ctx.fillStyle = alpha(pal.glass, 0.25); ctx.fillRect(l, y - 3, X(lt) - l, 6);
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(lt), y, 6, 0, 6.283); ctx.fill();
    label(ctx, `t ≈ 10${sup(Math.round(lt))} s`, Math.min(X(lt), r - 60), y - 14, { color: pal.ink, size: 12, align: 'center' });
  }

  new Clip(root.querySelector('#fate-clip'), {
    duration: 16, label: 'animação do destino final',
    chapters: [
      { t: 0, text: 'No tempo humano, os três parecem igualmente sólidos.' },
      { t: 3, text: 'O vidro relaxa: sua estrutura caminha para a do líquido super-resfriado.' },
      { t: 8.5, text: 'O sólido amorfo não tem um LSR "de origem": ele cristaliza direto.' },
      { t: 12, text: 'Do LSR, o vidro também nucleia e cristaliza: o destino final de ambos.' },
    ],
    render: (t, dt) => { time += dt; lt = (t / 16) * LMAX; draw(); },
  });
}
