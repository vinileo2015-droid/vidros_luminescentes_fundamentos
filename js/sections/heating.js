// Aqueça e observe: viga em balanço sob peso + curvas esquemáticas de módulo (DMA) e DSC.
import { hiDPI, palette, alpha, label } from '../lib/ui.js';
import { Clip } from '../lib/clip.js';

const sig = (x) => 1 / (1 + Math.exp(-x));
const gaussPk = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

// x = T/Tg (para o sólido amorfo, T/Tx). Retornam log10 E (Pa) e fluxo de calor (u.a., endo para cima).
const MATS = [
  {
    id: 'oxide', tab: 'Vidro de óxido', ref: 'Tg',
    E: (x) => {
      const soft = 10.85 - 0.15 * sig((x - 0.97) / 0.02) - 6.5 * Math.max(0, x - 1) / 0.45;
      const c = sig((x - 1.33) / 0.012), melt = sig((x - 1.5) / 0.01);
      return (soft * (1 - c) + 10.4 * c) * (1 - melt) + 3.6 * melt;
    },
    dsc: (x) => 0.35 * sig((x - 1) / 0.012) + 0.12 * gaussPk(x, 1.02, 0.012) - 0.9 * gaussPk(x, 1.33, 0.03) + 1.1 * gaussPk(x, 1.5, 0.025),
    state: (x, E) => (x > 1.5 ? 'liq' : x > 1.33 ? 'cryst' : E < 9 ? 'liq' : x > 1 ? 'scl' : 'glass'),
    note: 'Vidro de óxido: rígido até Tg, depois amolece de forma contínua, sem platô, e escoa como um líquido viscoso. Aquecido devagar e por mais tempo, pode devitrificar (pico exotérmico) e depois fundir. Na figura, a cristalização interrompe o escoamento.',
  },
  {
    id: 'ps', tab: 'Polímero amorfo', ref: 'Tg',
    E: (x) => 9.45 - 3.3 * sig((x - 1.03) / 0.018) - 3 * sig((x - 1.33) / 0.04),
    dsc: (x) => 0.55 * sig((x - 1) / 0.015) + 0.08 * gaussPk(x, 1.02, 0.012),
    state: (x, E) => (E < 5 ? 'liq' : x > 1.02 ? 'scl' : 'glass'),
    note: 'Polímero amorfo linear (como o poliestireno): na Tg, o módulo cai cerca de mil vezes até o platô borrachoso (~1 MPa), sustentado pelos emaranhamentos. Só bem acima da Tg as cadeias desenroscam e o material escoa. A largura do platô cresce com a massa molar.',
  },
  {
    id: 'xl', tab: 'Polímero reticulado', ref: 'Tg',
    E: (x) => 9.35 - 2.9 * sig((x - 1.04) / 0.02) + 0.25 * Math.max(0, x - 1.1),
    dsc: (x) => 0.32 * sig((x - 1) / 0.02),
    state: (x) => (x > 1.03 ? 'scl' : 'glass'),
    note: 'Polímero reticulado (borracha vulcanizada, epóxi curado): as ligações químicas entre cadeias tornam o platô permanente. O módulo até sobe um pouco com T (elasticidade entrópica) e o material nunca flui: degrada antes.',
  },
  {
    id: 'semi', tab: 'Semicristalino', ref: 'Tg',
    E: (x) => 9.55 - 0.9 * sig((x - 1.02) / 0.02) + 0.2 * sig((x - 1.17) / 0.02) - 4.2 * sig((x - 1.53) / 0.012),
    dsc: (x) => 0.22 * sig((x - 1) / 0.015) - 0.5 * gaussPk(x, 1.17, 0.025) + 1.2 * gaussPk(x, 1.52, 0.018),
    state: (x) => (x > 1.54 ? 'liq' : x > 1.02 ? 'cryst' : 'glass'),
    note: 'Semicristalino (como o PET): a fração amorfa tem Tg, mas os cristalitos mantêm o material rígido acima dela. Se a amostra foi temperada, cristaliza mais ao aquecer (cristalização a frio, exotérmica) e só flui ao fundir em Tm (aqui Tm/Tg ≈ 1,5).',
  },
  {
    id: 'asi', tab: 'Sólido amorfo (a-Si)', ref: 'Tx',
    E: (x) => 11.1 + 0.08 * sig((x - 1) / 0.02),
    dsc: (x) => -1.1 * gaussPk(x, 1.0, 0.025),
    state: (x) => (x > 1.0 ? 'cryst' : 'amor'),
    note: 'Sólido amorfo (filme de silício amorfo): nenhum degrau de Cp, nenhum amolecimento. Ao aquecer, ele cristaliza de uma vez (pico exotérmico na temperatura de cristalização Tx) e continua rígido. Não há líquido super-resfriado no caminho.',
  },
];
const X0 = 0.6, X1 = 1.65;

export function init(root) {
  const tabs = root.querySelector('#heat-tabs');
  const beam = root.querySelector('#heat-beam'), cE = root.querySelector('#heat-E'), cD = root.querySelector('#heat-dsc');
  const note = root.querySelector('#heat-note');
  let mi = 0, x = X0, creep = 0, lastX = X0;

  tabs.innerHTML = MATS.map((m, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${m.tab}</button>`).join('');
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    mi = Number(b.dataset.i);
    [...tabs.children].forEach((c, i) => c.setAttribute('aria-pressed', String(i === mi)));
    note.textContent = MATS[mi].note; creep = 0;
    clip.seek(0); clip.play();
  });
  note.textContent = MATS[0].note;

  const vb = hiDPI(beam, () => drawBeam());
  const ve = hiDPI(cE, () => drawCurve(ve, 'E'));
  const vd = hiDPI(cD, () => drawCurve(vd, 'dsc'));

  function stateCol(pal, st) { return st === 'liq' ? pal.liq : st === 'scl' ? pal.scl : st === 'cryst' ? pal.cryst : st === 'amor' ? pal.ink2 : pal.glass; }

  function drawBeam() {
    const { ctx, w, h } = vb; const pal = palette(); const m = MATS[mi];
    ctx.clearRect(0, 0, w, h);
    const E = m.E(x), st = m.state(x, E);
    // deflexão: elástica (1/E) + fluência acumulada quando E é baixo
    const elastic = Math.min(0.55, 10 ** (6.3 - E) * 0.55);
    const d = Math.min(1, elastic + creep);
    const cx = w * 0.14, cy = h * 0.32, L = w * 0.62, th = Math.max(10, h * 0.07);
    // suporte
    ctx.fillStyle = pal.ink2; ctx.fillRect(cx - 26, cy - 50, 26, 120);
    // viga como curva (deflexão de viga em balanço ∝ s²(3L − s))
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40, yv = d * h * 0.42 * (s * s * (3 - s)) / 2;
      const sag = d > 0.85 ? (d - 0.85) * 6 * s ** 4 * h * 0.12 : 0;
      pts.push([cx + s * L * (1 - 0.12 * d * s), cy + yv + sag]);
    }
    ctx.fillStyle = stateCol(pal, st);
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py - th / 2) : ctx.moveTo(px, py - th / 2)));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + th / 2);
    ctx.closePath(); ctx.fill();
    // gota escorrendo quando há fluxo viscoso
    const tip = pts[pts.length - 1];
    if (creep > 0.7 && st === 'liq') {
      const drop = Math.min(1, (creep - 0.7) / 0.3);
      ctx.beginPath(); ctx.moveTo(tip[0] - 6, tip[1]); ctx.quadraticCurveTo(tip[0], tip[1] + 30 * drop, tip[0] + 6, tip[1]); ctx.fill();
      ctx.beginPath(); ctx.arc(tip[0], tip[1] + 34 * drop + 6, 7 * drop, 0, 6.283); ctx.fill();
    }
    // peso
    const wy = tip[1] + th / 2;
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tip[0] - 2, wy); ctx.lineTo(tip[0] - 2, wy + 16); ctx.stroke();
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.roundRect(tip[0] - 18, wy + 16, 32, 22, 4); ctx.fill();
    // forno: termômetro
    const tx = w - 34, ty0 = 20, ty1 = h - 30;
    ctx.fillStyle = pal.bg2; ctx.beginPath(); ctx.roundRect(tx - 7, ty0, 14, ty1 - ty0, 7); ctx.fill();
    const fr = (x - X0) / (X1 - X0);
    ctx.fillStyle = pal.liq; ctx.beginPath(); ctx.roundRect(tx - 4, ty1 - 4 - fr * (ty1 - ty0 - 8), 8, fr * (ty1 - ty0 - 8), 4); ctx.fill();
    label(ctx, `T/${m.ref} = ${x.toFixed(2).replace('.', ',')}`, tx - 14, ty0 + 4, { color: pal.ink, size: 13, align: 'right', base: 'top' });
    const stName = { glass: 'vítreo', scl: E < 7 ? 'borrachoso / viscoso' : 'acima de Tg', liq: 'escoa', cryst: 'cristalino', amor: 'amorfo (sem Tg)' }[st];
    label(ctx, stName, tx - 14, ty0 + 24, { color: stateCol(pal, st), size: 13, align: 'right', base: 'top' });
  }

  function drawCurve(v, which) {
    const { ctx, w, h } = v; const pal = palette(); const m = MATS[mi];
    ctx.clearRect(0, 0, w, h);
    const l = 56, r = w - 10, t = 24, b = h - 24;
    const [y0, y1] = which === 'E' ? [3.5, 11.5] : [-1.3, 1.4];
    const X = (xx) => l + ((xx - X0) / (X1 - X0)) * (r - l), Y = (yy) => b - ((yy - y0) / (y1 - y0)) * (b - t);
    ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l, b); ctx.lineTo(r, b); ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.font = '11px "Schibsted Grotesk", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0.6, 0.8, 1.0, 1.2, 1.4, 1.6].forEach((xx) => ctx.fillText(xx.toFixed(1).replace('.', ','), X(xx), b + 5));
    if (which === 'E') {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      [[6, '1 MPa'], [9, '1 GPa'], [11, '100 GPa']].forEach(([yy, s]) => { ctx.fillText(s, l - 4, Y(yy)); ctx.strokeStyle = alpha(pal.rule, 0.8); ctx.beginPath(); ctx.moveTo(l, Y(yy)); ctx.lineTo(r, Y(yy)); ctx.stroke(); });
    }
    ctx.strokeStyle = pal.glass; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(1), t); ctx.lineTo(X(1), b); ctx.stroke(); ctx.setLineDash([]);
    // curva até o x atual (sólida) e o resto (fantasma)
    const f = which === 'E' ? m.E : m.dsc;
    const path = (a, c) => { ctx.beginPath(); for (let xx = a; xx <= c + 1e-9; xx += 0.004) { const yy = Math.max(y0, Math.min(y1, f(xx))); xx === a ? ctx.moveTo(X(xx), Y(yy)) : ctx.lineTo(X(xx), Y(yy)); } };
    ctx.lineWidth = 1.5; ctx.strokeStyle = alpha(pal.ink2, 0.35); path(X0, X1); ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = pal.ink; path(X0, Math.max(X0 + 0.004, x)); ctx.stroke();
    const yy = Math.max(y0, Math.min(y1, f(x)));
    ctx.fillStyle = pal.liq; ctx.beginPath(); ctx.arc(X(x), Y(yy), 4.5, 0, 6.283); ctx.fill();
    label(ctx, which === 'E' ? 'Módulo E (escala log)' : 'DSC: fluxo de calor (endo ↑)', l + 6, t - 12, { color: pal.ink, size: 12 });
    label(ctx, `T/${m.ref}`, r, b - 8, { color: pal.ink2, size: 11, align: 'right', weight: 500 });
  }

  const clip = new Clip(root.querySelector('#heat-clip'), {
    duration: 12, label: 'aquecimento da viga',
    chapters: [{ t: 0, text: '' }],
    render: (t) => {
      x = X0 + (t / 12) * (X1 - X0);
      if (x < lastX) creep = 0;
      const m = MATS[mi], E = m.E(x), st = m.state(x, E);
      // fluência acumulada só quando o material flui
      if (st === 'liq' || (st === 'scl' && E < 5.5)) creep = Math.min(1, creep + Math.max(0, x - lastX) * 10 ** (6 - E) * 2.5);
      lastX = x;
      drawBeam(); drawCurve(ve, 'E'); drawCurve(vd, 'dsc');
    },
  });
}
