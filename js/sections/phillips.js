// Teoria de restrições topológicas de Phillips–Thorpe (Varshneya, eqs. 3.1–3.6).
// Por átomo: restrições de estiramento m/2 e de flexão 2m − 3 (para m ≥ 2).
// N_c = 5⟨m⟩/2 − 3 ; graus de liberdade N_d = 3 ; isostático em ⟨m⟩ = 2,4.
import { hiDPI, palette, alpha, axes, label, fmt } from '../lib/ui.js';

const SYS = {
  gese: { name: 'GeₓSe₁₋ₓ', A: 'Ge', mA: 4, max: 0.45, x0: 0.2, stoich: [0.333, 'GeSe₂'] },
  asse: { name: 'AsₓSe₁₋ₓ', A: 'As', mA: 3, max: 0.6, x0: 0.4, stoich: [0.4, 'As₂Se₃'] },
};
const cons = (m) => (m >= 2 ? m / 2 + (2 * m - 3) : m / 2); // por átomo

export function init(root) {
  const cv = root.querySelector('#ph-canvas');
  const seg = root.querySelector('#ph-sys'), xs = root.querySelector('#ph-x'), xv = root.querySelector('#ph-x-v');
  const rM = root.querySelector('#ph-m'), rN = root.querySelector('#ph-nc'), rF = root.querySelector('#ph-f'), rS = root.querySelector('#ph-state');
  const tbl = root.querySelector('#ph-table');
  let sys = 'gese';
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sys = b.dataset.v; [...seg.children].forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    xs.max = SYS[sys].max * 100; xs.value = SYS[sys].x0 * 100; update();
  });
  xs.addEventListener('input', update);
  const view = hiDPI(cv, () => draw());

  function state() {
    const S = SYS[sys], x = Number(xs.value) / 100;
    const m = x * S.mA + (1 - x) * 2;
    const Nc = x * cons(S.mA) + (1 - x) * cons(2);
    return { S, x, m, Nc, f: 3 - Nc };
  }
  function update() {
    const { S, x, m, Nc, f } = state();
    xv.textContent = `x = ${fmt(x, 2)}`;
    rM.textContent = fmt(m, 2); rN.textContent = fmt(Nc, 2);
    rF.textContent = f > 0 ? fmt(f, 2) : '0';
    const st = Math.abs(Nc - 3) < 0.04 ? ['isostático', 'glass'] : Nc < 3 ? ['flexível (subrestrito)', 'scl'] : ['rígido (sobrerrestrito)', 'cryst'];
    rS.textContent = st[0]; rS.style.color = `var(--${st[1]})`;
    const sA = cons(S.mA);
    tbl.innerHTML = `<table><thead><tr><th>Átomo</th><th class="num">m</th><th class="num">estiramento m/2</th><th class="num">flexão 2m − 3</th><th class="num">total</th><th class="num">fração</th></tr></thead><tbody>
      <tr><td>${S.A}</td><td class="num">${S.mA}</td><td class="num">${fmt(S.mA / 2, 1)}</td><td class="num">${2 * S.mA - 3}</td><td class="num">${fmt(sA, 1)}</td><td class="num">${fmt(x, 2)}</td></tr>
      <tr><td>Se</td><td class="num">2</td><td class="num">1</td><td class="num">1</td><td class="num">2</td><td class="num">${fmt(1 - x, 2)}</td></tr>
      <tr><td colspan="4"><b>N_c = ${fmt(x, 2)}·${fmt(sA, 1)} + ${fmt(1 - x, 2)}·2</b></td><td class="num"><b>${fmt(Nc, 2)}</b></td><td></td></tr></tbody></table>`;
    draw();
  }
  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    const { S, x, m, Nc } = state();
    ctx.clearRect(0, 0, w, h);
    const split = w > 560;
    const pw = split ? (w - 20) / 2 : w;
    const ph = split ? h : h / 2;
    // painel 1: N_c × ⟨m⟩
    {
      const box = { l: 44, r: pw - 12, t: 26, b: ph - 30 };
      const X = (mm) => box.l + ((mm - 2) / 1.2) * (box.r - box.l), Y = (n) => box.b - ((n - 1.5) / 3) * (box.b - box.t);
      ctx.fillStyle = alpha(pal.scl, 0.08); ctx.fillRect(box.l, box.t, X(2.4) - box.l, box.b - box.t);
      ctx.fillStyle = alpha(pal.cryst, 0.08); ctx.fillRect(X(2.4), box.t, box.r - X(2.4), box.b - box.t);
      axes(ctx, box, { x: X, y: Y, pal, xt: [2, 2.2, 2.4, 2.6, 2.8, 3, 3.2], yt: [2, 3, 4], xfmt: (v) => fmt(v, 1), xl: '⟨m⟩', yl: 'N_c por átomo' });
      ctx.strokeStyle = pal.ink2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(box.l, Y(3)); ctx.lineTo(box.r, Y(3)); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, 'N_d = 3 graus de liberdade', box.r - 4, Y(3) - 9, { color: pal.ink2, align: 'right', size: 11 });
      ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip(); ctx.strokeStyle = pal.glass; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(2), Y(2)); ctx.lineTo(X(3.2), Y(5)); ctx.stroke(); ctx.restore();
      label(ctx, 'flexível', box.l + 6, box.b - 12, { color: pal.scl, size: 12 });
      label(ctx, 'rígido', box.r - 6, box.t + 26, { color: pal.cryst, size: 12, align: 'right' });
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(m), Y(Nc), 6, 0, 6.283); ctx.fill();
      label(ctx, `⟨m⟩c = 2,4`, X(2.4) + 4, box.t + 8, { color: pal.glass, size: 11 });
    }
    // painel 2: dificuldade de formação (esquema de Phillips)
    {
      const ox = split ? pw + 20 : 0, oy = split ? 0 : ph;
      const box = { l: ox + 44, r: ox + pw - 12, t: oy + 26, b: oy + ph - 30 };
      const X = (xx) => box.l + (xx / S.max) * (box.r - box.l);
      const xc = 2 / (S.mA - 2) * 0.2 * (S.mA === 4 ? 1 : 2); // composição isostática: 0,2 (Ge) ou 0,4 (As)
      const diff = (xx) => { const mm = xx * S.mA + (1 - xx) * 2; return (5 / 2 * mm - 3 - 3) ** 2; };
      const dmax = Math.max(diff(0), diff(S.max));
      const Y = (d) => box.b - (Math.min(d, dmax) / dmax) * (box.b - box.t) * 0.9;
      axes(ctx, box, { x: X, y: Y, pal, xt: [0, 0.1, 0.2, 0.3, 0.4].filter((v) => v <= S.max + 1e-9), yt: [], xfmt: (v) => fmt(v, 1), xl: `x em ${S.name}`, yl: 'dificuldade de formar vidro (esquema)' });
      ctx.strokeStyle = pal.liq; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]); ctx.beginPath();
      for (let xx = 0; xx <= S.max + 1e-9; xx += S.max / 120) { const y = Y(diff(xx)); xx === 0 ? ctx.moveTo(X(xx), y) : ctx.lineTo(X(xx), y); }
      ctx.stroke(); ctx.setLineDash([]);
      // picos secundários (ordem química) — Ge–Se, como na Fig. 3.3
      if (sys === 'gese') {
        [[0, 'Se'], [S.stoich[0], S.stoich[1]]].forEach(([xx, t]) => {
          ctx.fillStyle = alpha(pal.liq, 0.25); const y = Y(diff(xx) + dmax * 0.25);
          ctx.beginPath(); ctx.moveTo(X(xx) - 10, Y(diff(xx))); ctx.lineTo(X(xx), y); ctx.lineTo(X(xx) + 10, Y(diff(xx))); ctx.fill();
          label(ctx, t, X(xx) + 12, y + 6, { color: pal.ink2, size: 11, weight: 500 });
        });
      }
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(X(x), Y(diff(x)), 6, 0, 6.283); ctx.fill();
      label(ctx, 'mínimo em ⟨m⟩ = 2,4', X(sys === 'gese' ? 0.2 : 0.4) + 8, box.b - 30, { color: pal.glass, size: 11 });
      void xc;
    }
  }
  update();
}
