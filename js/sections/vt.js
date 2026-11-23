// Simulador H–T / V–T com histórico térmico (modelo TNM + cristalização por TTT).
import { Sample, P, Hliq, Hcrys, Vliq, Vcrys } from '../lib/tnm-engine.js';
import { hiDPI, palette, alpha, axes, label, fmt, sup } from '../lib/ui.js';
import { Clip } from '../lib/clip.js';

const T0 = 1250, TLOW = 400;
const RUN_COLORS = ['#2b7de0', '#d0457f', '#6f9a12', '#b0703a', '#7a5ce0', '#119c8a'];

export function init(root) {
  const $ = (s) => root.querySelector(s);
  const cv = $('#vt-canvas'), cpCv = $('#vt-cp');
  const rate = $('#vt-rate'), rateV = $('#vt-rate-v');
  const anT = $('#vt-anT'), anTV = $('#vt-anT-v');
  const crystBox = $('#vt-cryst'), kauzBox = $('#vt-kauz');
  const rT = $('#vt-T'), rTf = $('#vt-Tf'), rX = $('#vt-X'), msg = $('#vt-msg'), legend = $('#vt-legend');
  let axis = 'H';

  const s = new Sample();
  s.reset(T0);
  let runs = [];
  let cur = null;           // corrida em andamento
  let queue = [];
  let colorIdx = 0;
  let raf = null;

  // taxa crítica de resfriamento do material-modelo (bisseção em log q)
  const Rc = (() => {
    let lo = -3, hi = 3;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2, t = new Sample(); t.reset(T0);
      const q = 10 ** mid; let guard = 0;
      while (t.T > TLOW && guard++ < 1000) t.advance(-2, q);
      if (t.X > 0.01) lo = mid; else hi = mid;
    }
    return 10 ** hi;
  })();

  const q = () => 10 ** Number(rate.value);
  const fmtQ = (v) => (v >= 1 ? `${fmt(v, v < 10 ? 1 : 0)} K/s` : v >= 0.01 ? `${fmt(v, 2)} K/s` : `${fmt(v * 1000, 1)} mK/s`);
  function showRate() {
    const v = q(); rateV.textContent = fmtQ(v);
  }
  rate.addEventListener('input', showRate); showRate();
  anT.addEventListener('input', () => { anTV.textContent = `${anT.value} K`; });

  const setSeg = (v) => [...$('#vt-axis').children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  $('#vt-axis').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { axis = b.dataset.v; setSeg(axis); drawAll(); } });
  crystBox.addEventListener('change', () => { s.crystalEnabled = crystBox.checked; });
  kauzBox.addEventListener('change', drawAll);

  function newRun(kind, qv) {
    const c = RUN_COLORS[colorIdx++ % RUN_COLORS.length];
    cur = { kind, q: qv, color: c, to: null, pts: [{ T: s.T, H: s.H, V: s.V, Cp: null }], startTf: s.Tf, startX: s.X };
    runs.push(cur);
    if (runs.length > 7) runs.shift();
  }

  function enqueue(op) { queue.push(op); if (!raf) raf = requestAnimationFrame(tick); }
  function userOp(op) { clip?.pause(); enqueue(op); }

  $('#vt-cool').addEventListener('click', () => userOp({ type: 'ramp', to: TLOW, q: q() }));
  $('#vt-heat').addEventListener('click', () => userOp({ type: 'ramp', to: T0, q: q() }));
  $('#vt-anneal').addEventListener('click', () => userOp({ type: 'anneal', T: Number(anT.value), q: q() }));
  $('#vt-reset').addEventListener('click', () => { clip?.pause(); reset(); });

  function reset() {
    queue = []; cur = null; runs = []; colorIdx = 0;
    s.reset(T0); s.crystalEnabled = crystBox.checked;
    msg.textContent = 'Pronto: líquido a 1250 K. Escolha uma taxa e resfrie.';
    readouts(); drawAll();
  }

  function tick() {
    raf = null;
    const op = queue[0];
    if (!op) return;
    if (!op.started) {
      op.started = true;
      if (op.type === 'ramp') {
        if (Math.abs(op.to - s.T) < 0.5) { queue.shift(); if (queue.length) raf = requestAnimationFrame(tick); return; }
        newRun(op.to < s.T ? 'cool' : 'heat', op.q);
      }
      if (op.type === 'anneal') {
        if (Math.abs(op.T - s.T) > 0.5) { queue.unshift({ type: 'ramp', to: op.T, q: op.q }); raf = requestAnimationFrame(tick); op.started = false; return; }
        newRun('anneal', 0); op.lt = -1; op.elapsed = 0;
      }
    }
    if (op.type === 'ramp') {
      const dir = Math.sign(op.to - s.T);
      for (let k = 0; k < 4 && (op.to - s.T) * dir > 1e-6; k++) {
        const dT = dir * Math.min(2, Math.abs(op.to - s.T));
        const H0 = s.H;
        s.advance(dT, op.q);
        cur.pts.push({ T: s.T, H: s.H, V: s.V, Cp: (s.H - H0) / dT });
      }
      if ((op.to - s.T) * dir <= 1e-6) finish(op);
    } else if (op.type === 'anneal') {
      const nl = op.lt + 0.08;
      const dt = 10 ** nl - (op.lt < -0.99 ? 0 : 10 ** op.lt);
      for (let k = 0; k < 8; k++) s.relax(dt / 8);
      op.elapsed = 10 ** nl; op.lt = nl;
      cur.pts.push({ T: s.T, H: s.H, V: s.V, Cp: null });
      if (op.lt >= 5) finish(op);
    }
    readouts(); drawAll();
    if (queue.length) raf = requestAnimationFrame(tick);
  }

  function finish(op) {
    queue.shift();
    cur.endTf = s.Tf; cur.endX = s.X;
    if (op.type === 'ramp' && cur.kind === 'cool') {
      cur.label = `Resfriamento até ${fmt(op.to, 0)} K a ${fmtQ(op.q)}`;
      if (s.X > 0.5) msg.textContent = `Cristalizou (${fmt(s.X * 100, 0)} % cristal): ${fmtQ(op.q)} está abaixo da taxa crítica deste material (≈ ${fmtQ(Rc)}).`;
      else if (s.X > 0.01) msg.textContent = `Vitrificou parcialmente, com ${fmt(s.X * 100, 0)} % de cristais: a taxa está perto da crítica (≈ ${fmtQ(Rc)}).`;
      else msg.textContent = `Vitrificou. A estrutura congelou com Tf ≈ ${fmt(s.Tf, 0)} K: essa é a Tg para ${fmtQ(op.q)}.`;
      cur.tg = s.X < 0.5 ? s.Tf : null;
    } else if (op.type === 'ramp') {
      cur.label = `Aquecimento até ${fmt(op.to, 0)} K a ${fmtQ(op.q)}`;
      const peak = Math.max(...cur.pts.map((p) => (p.T > 650 && p.T < 1050 ? p.Cp ?? 0 : 0)));
      const crystMax = Math.max(...cur.pts.map(() => 0), cur.startX);
      msg.textContent = cur.pts.some((p, i) => i && p.Cp < 0.6 && p.T > 800 && p.T < P.Tm)
        ? 'No reaquecimento lento o vidro cristalizou (devitrificação, pico exotérmico) e depois fundiu em Tm.'
        : peak > P.CpL * 1.08
          ? `Pico de recuperação de entalpia logo acima de Tg (Cp chega a ${fmt(peak, 2)}): a memória da história térmica.`
          : 'Reaquecido: o vidro voltou ao líquido passando pela transição vítrea.';
      void crystMax;
    } else if (op.type === 'anneal') {
      cur.label = `Recozimento a ${fmt(s.T, 0)} K por 10${sup(5)} s`;
      msg.textContent = `Recozido por ~28 h a ${fmt(s.T, 0)} K: Tf caiu de ${fmt(cur.startTf, 0)} K para ${fmt(s.Tf, 0)} K, rumo ao LSR. Reaqueça para ver o pico no DSC.`;
    }
    buildLegend();
  }

  function readouts() {
    rT.textContent = `${fmt(s.T, 0)} K`;
    const amorphous = s.X < 0.999;
    rTf.textContent = !amorphous ? '–' : s.T > s.Tf + 2 || Math.abs(s.T - s.Tf) < 2 ? 'em equilíbrio' : `${fmt(s.Tf, 0)} K`;
    rX.textContent = `${fmt(s.X * 100, 0)} %`;
  }

  function buildLegend() {
    legend.innerHTML = `<span style="color:var(--liq)"><i></i>Líquido estável</span><span style="color:var(--scl)"><i></i>LSR (equilíbrio metaestável)</span><span style="color:var(--cryst)"><i></i>Cristal</span>`
      + runs.filter((r) => r.label).map((r) => `<span style="color:${r.color}"><i style="height:4px"></i>${r.label}</span>`).join('');
  }
  buildLegend();

  // ---------- desenho ----------
  const view = hiDPI(cv, () => draw());
  const cpView = hiDPI(cpCv, () => drawCp());
  function drawAll() { draw(); drawCp(); }

  const rangeY = () => (axis === 'H' ? [Hcrys(TLOW) - 40, Hliq(T0) + 60] : [Vcrys(TLOW) - 0.01, Vliq(T0) + 0.012]);
  const val = (p) => (axis === 'H' ? p.H : p.V);
  const eqL = (T) => (axis === 'H' ? Hliq(T) : Vliq(T));
  const eqC = (T) => (axis === 'H' ? Hcrys(T) : Vcrys(T));

  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const small = w < 460;
    const box = { l: 40, r: w - 14, t: 24, b: h - 30 };
    const [y0, y1] = rangeY();
    const X = (T) => box.l + ((T - TLOW + 20) / (T0 - TLOW + 40)) * (box.r - box.l);
    const Y = (v) => box.b - ((v - y0) / (y1 - y0)) * (box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: small ? [400, 700, 1000] : [400, 500, 600, 700, 800, 900, 1000, 1100, 1200], yt: [], xl: 'T (K)', yl: axis === 'H' ? 'Entalpia H (u.a.)' : 'Volume específico V (u.a.)' });
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t - 4, box.r - box.l, box.b - box.t + 4); ctx.clip();
    // Kauzmann: extrapolação do LSR
    const line = (f, a, b, col, wdt, dash = []) => {
      ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.setLineDash(dash); ctx.beginPath();
      for (let T = a; T <= b; T += 5) T === a ? ctx.moveTo(X(T), Y(f(T))) : ctx.lineTo(X(T), Y(f(T)));
      ctx.stroke(); ctx.setLineDash([]);
    };
    if (kauzBox.checked) {
      line(eqL, TLOW - 20, 700, alpha(pal.scl, 0.8), 1.5, [5, 5]);
      const TK = P.Tm - P.dHm / (P.CpL - P.CpC);
      if (axis === 'H') {
        ctx.fillStyle = pal.scl; ctx.beginPath(); ctx.arc(X(TK), Y(eqL(TK)), 4, 0, 6.283); ctx.fill();
        label(ctx, `T_K ≈ ${TK} K: LSR extrapolado cruza o cristal`, X(TK) + 8, Y(eqL(TK)) + 14, { color: pal.scl, size: 11, bg: alpha(pal.panel, 0.85) });
      }
    }
    // linhas de referência
    line(eqL, 700, P.Tm, pal.scl, 2.4);
    line(eqL, P.Tm, T0 + 20, pal.liq, 2.4);
    line(eqC, TLOW - 20, P.Tm, alpha(pal.cryst, 0.9), 2.4);
    // Tm
    ctx.strokeStyle = alpha(pal.ink2, 0.6); ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(P.Tm), box.t); ctx.lineTo(X(P.Tm), box.b); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'Tm', X(P.Tm) + 4, box.b - 10, { color: pal.ink2, size: 12 });
    // corridas
    for (const r of runs) {
      if (r.pts.length < 2) continue;
      ctx.strokeStyle = r.color; ctx.lineWidth = r === cur ? 3 : 2.2; ctx.lineJoin = 'round';
      ctx.beginPath(); r.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.T), Y(val(p))) : ctx.moveTo(X(p.T), Y(val(p))))); ctx.stroke();
      if (r.tg && r.endX < 0.5) {
        const tg = r.tg, yv = eqL(tg);
        ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(X(tg), Y(yv), 4, 0, 6.283); ctx.fill();
        // projeção da reta do vidro até a linha de equilíbrio
        ctx.strokeStyle = r.color + '99'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(tg), Y(yv)); ctx.lineTo(X(tg), box.b); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
    // rótulos de regiões
    const lab = (t, T, v, c, dy = -12) => label(ctx, t, X(T), Y(v) + dy, { color: c, size: small ? 11 : 13, weight: 700, align: 'center', bg: alpha(pal.panel, 0.75) });
    lab('Líquido', 1190, eqL(1190), pal.liq);
    lab('LSR', 930, eqL(930), pal.scl);
    lab('Cristal', 660, eqC(660), pal.cryst, 16);
    const glassRun = [...runs].reverse().find((r) => r.tg);
    if (glassRun) {
      const p = glassRun.pts.find((pp) => pp.T < 520) || glassRun.pts[glassRun.pts.length - 1];
      lab('Vidro', Math.max(470, p.T), val(p), glassRun.color, -14);
      label(ctx, `Tg ≈ ${fmt(glassRun.tg, 0)} K`, X(glassRun.tg) + 6, box.b - 10, { color: glassRun.color, size: 12 });
    }
    // ponto atual
    ctx.fillStyle = pal.ink; ctx.strokeStyle = pal.panel; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(X(s.T), Y(axis === 'H' ? s.H : s.V), 6.5, 0, 6.283); ctx.fill(); ctx.stroke();
  }

  function drawCp() {
    const { ctx, w, h } = cpView; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const box = { l: 40, r: w - 14, t: 22, b: h - 26 };
    const X = (T) => box.l + ((T - TLOW + 20) / (T0 - TLOW + 40)) * (box.r - box.l);
    const cmin = -0.5, cmax = 4;
    const Y = (c) => box.b - ((Math.max(cmin, Math.min(cmax, c)) - cmin) / (cmax - cmin)) * (box.b - box.t);
    axes(ctx, box, { x: X, y: Y, pal, xt: [], yt: [1, 2], yfmt: (v) => String(v), xl: '', yl: 'Cp aparente (dH/dT, DSC)' });
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    for (const r of runs) {
      if (r.kind === 'anneal') continue;
      const pts = r.pts.filter((p) => p.Cp !== null);
      if (pts.length < 3) continue;
      ctx.strokeStyle = r.color; ctx.lineWidth = r === cur ? 2.4 : 1.6; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(X(p.T), Y(p.Cp)) : ctx.moveTo(X(p.T), Y(p.Cp))));
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, 'líquido', X(1200), Y(P.CpL) - 9, { color: pal.ink2, size: 11, weight: 500, align: 'center' });
    label(ctx, 'vidro / cristal', X(470), Y(P.CpG) - 9, { color: pal.ink2, size: 11, weight: 500, align: 'center' });
    label(ctx, '↓ exotérmico (cristalização)', box.r - 4, box.b - 8, { color: pal.ink2, size: 11, weight: 500, align: 'right' });
  }

  // ---------- clipe guiado ----------
  let lastStep = -1;
  const script = [
    { t: 0.2, run: () => { reset(); rate.value = -2; showRate(); enqueue({ type: 'ramp', to: TLOW, q: 0.01 }); } },
    { t: 5, run: () => { s.reset(T0); rate.value = 3; showRate(); enqueue({ type: 'ramp', to: TLOW, q: 1000 }); } },
    { t: 9, run: () => { s.reset(T0); rate.value = 1; showRate(); enqueue({ type: 'ramp', to: TLOW, q: 10 }); } },
    { t: 13, run: () => { enqueue({ type: 'anneal', T: 720, q: 10 }); } },
    { t: 19, run: () => { enqueue({ type: 'ramp', to: T0, q: 10 }); } },
  ];
  let clip = null;
  clip = new Clip($('#vt-clip'), {
    duration: 26, label: 'experimento guiado',
    chapters: [
      { t: 0, text: 'Resfriamento lento (0,01 K/s): o líquido cristaliza perto do nariz da curva TTT.' },
      { t: 5, text: 'Têmpera a 1000 K/s: sem tempo para cristalizar, o LSR vitrifica cedo (Tg alta).' },
      { t: 9, text: 'A 10 K/s, a Tg é menor e o vidro fica mais denso e com menor entalpia.' },
      { t: 13, text: 'Recozimento a 720 K: Tf desce e o vidro relaxa rumo ao LSR.' },
      { t: 19, text: 'Reaquecimento: o pico de Cp logo acima de Tg é a memória do recozimento.' },
    ],
    render: (t) => {
      let k = -1; script.forEach((st, i) => { if (t >= st.t) k = i; });
      if (k < lastStep) lastStep = -1;
      while (lastStep < k) { lastStep++; if (clip?.playing) script[lastStep].run(); }
    },
  });
  // o clipe é só um roteiro: ao arrastar a barra, não refazemos experimentos
  clip.scrub.addEventListener('input', () => { lastStep = script.findLastIndex((st) => st.t <= clip.t); });
  readouts(); drawAll();
}
