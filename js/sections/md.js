// Laboratório de partículas: dinâmica molecular 2D ao vivo.
import { MD } from '../lib/md-engine.js';
import { hiDPI, palette, alpha, visibility, label, fmt } from '../lib/ui.js';
import { Clip } from '../lib/clip.js';

export function init(root) {
  const canvas = root.querySelector('#md-canvas');
  const histC = root.querySelector('#md-hist');
  const Ts = root.querySelector('#md-T'), TsV = root.querySelector('#md-T-v');
  const kindSeg = root.querySelector('#md-kind'), colorSeg = root.querySelector('#md-color');
  const rTm = root.querySelector('#md-Tm'), rPsi = root.querySelector('#md-psi'), rMob = root.querySelector('#md-mob');

  let kind = 'binary', colorBy = 'mob';
  let md = new MD({ n: 400, kind, T: 1.5 });
  let ramp = null;       // {from, to, dur, t}
  let hist = [];
  let visible = false, frameN = 0;
  let manual = false;

  const setSeg = (seg, v) => [...seg.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  function setKind(k) { kind = k; setSeg(kindSeg, k); md = new MD({ n: 400, kind, T: md.T0 }); md.T0 = target(); hist = []; }
  function setColor(c) { colorBy = c; setSeg(colorSeg, c); }
  const target = () => Number(Ts.value) / 100;
  function setTarget(T, quick = false) {
    Ts.value = Math.round(T * 100); TsV.textContent = fmt(T, 2);
    md.T0 = T; md.tau = quick ? 0.01 : 0.05;
  }

  kindSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { takeOver(); setKind(b.dataset.v); } });
  colorSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setColor(b.dataset.v); });
  Ts.addEventListener('input', () => { takeOver(); ramp = null; setTarget(target()); });
  root.querySelector('#md-quench').addEventListener('click', () => { takeOver(); ramp = null; setTarget(0.1, true); });
  root.querySelector('#md-melt').addEventListener('click', () => { takeOver(); ramp = null; setTarget(1.8); });
  root.querySelector('#md-slow').addEventListener('click', () => { takeOver(); ramp = { from: md.T0, to: 0.1, dur: 30, t: 0 }; });
  function takeOver() { manual = true; clip.pause(); }

  const view = hiDPI(canvas, () => draw());
  const hv = hiDPI(histC, () => drawHist());

  function draw() {
    const { ctx, w, h } = view; const pal = palette();
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, w, h);
    const s = Math.min(w, h) / md.L;
    const ox = (w - md.L * s) / 2, oy = (h - md.L * s) / 2;
    const mobMax = 0.9;
    for (let i = 0; i < md.n; i++) {
      const r = (md.sig[md.type[i]][md.type[i]] / 2) * s * 0.96;
      let c;
      if (colorBy === 'type') c = md.type[i] ? pal.scl : pal.glass;
      else if (colorBy === 'psi') { const p = md.psi[i]; c = p > 0.8 ? pal.cryst : alpha(pal.cryst, 0.12 + 0.6 * Math.max(0, (p - 0.3) / 0.5)); }
      else { const m = Math.min(1, md.mob[i] / mobMax); c = m > 0.35 ? alpha(pal.liq, 0.35 + 0.65 * m) : alpha(pal.glass, 0.55 + 0.45 * (1 - m / 0.35)); }
      const x = ox + md.x[i] * s, y = oy + md.y[i] * s;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      // imagens periódicas nas bordas
      if (x - r < ox || x + r > ox + md.L * s || y - r < oy || y + r > oy + md.L * s) {
        for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
          if (!dx && !dy) continue;
          ctx.beginPath(); ctx.arc(x + dx * md.L * s, y + dy * md.L * s, r, 0, 6.283); ctx.fill();
        }
      }
    }
    ctx.strokeStyle = pal.rule; ctx.strokeRect(ox + 0.5, oy + 0.5, md.L * s - 1, md.L * s - 1);
  }

  function drawHist() {
    const { ctx, w, h } = hv; const pal = palette();
    ctx.clearRect(0, 0, w, h);
    const l = 8, r = w - 8, t = 26, b = h - 10;
    ctx.strokeStyle = pal.rule; ctx.strokeRect(l + 0.5, t + 0.5, r - l - 1, b - t - 1);
    const n = 240;
    const series = [
      ['T medida', (p) => Math.min(1, p.T / 2), pal.ink],
      ['Ordem', (p) => p.psi, pal.cryst],
      ['Mobilidade', (p) => Math.min(1, p.mob / 0.9), pal.liq],
    ];
    series.forEach(([name, f, col], k) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      hist.forEach((p, i) => { const x = l + ((i + n - hist.length) / (n - 1)) * (r - l), y = b - f(p) * (b - t - 4) - 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      label(ctx, name, l + k * Math.max(84, (r - l) / 3), 10, { color: col, size: 12 });
    });
  }

  function frame() {
    if (!visible) { running = false; return; }
    const dtReal = 1 / 60;
    if (ramp) {
      ramp.t += dtReal;
      const u = Math.min(1, ramp.t / ramp.dur);
      setTarget(ramp.from + (ramp.to - ramp.from) * u);
      if (u >= 1) ramp = null;
    }
    md.step(8);
    if (md.updateMobility(200)) {
      md.order();
      hist.push({ T: md.T, psi: md.psi6, mob: Math.sqrt(md.msd) });
      if (hist.length > 240) hist.shift();
      rTm.textContent = fmt(md.T, 2);
      rPsi.textContent = fmt(md.psi6, 2);
      rMob.textContent = fmt(Math.sqrt(md.msd), 2);
      drawHist();
    }
    draw();
    frameN++;
    requestAnimationFrame(frame);
  }
  let running = false;
  visibility(canvas, (v) => { visible = v; if (v && !running) { running = true; requestAnimationFrame(frame); } }, '0px');

  // Clipe guiado: monoatômico cristaliza mesmo com têmpera; binário vitrifica.
  let phase = -1;
  const steps = [
    { t: 0, do: () => { setKind('mono'); setColor('psi'); setTarget(1.8); } },
    { t: 4, do: () => setTarget(0.1, true) },
    { t: 13, do: () => { setKind('binary'); setColor('mob'); setTarget(1.8); } },
    { t: 17, do: () => setTarget(0.1, true) },
  ];
  const clip = new Clip(root.querySelector('#md-clip'), {
    duration: 28, label: 'simulação guiada',
    chapters: [
      { t: 0, text: 'Monoatômico fundido: sem ordem hexagonal (cor = |ψ₆|).' },
      { t: 4, text: 'Têmpera brusca para T = 0,1.' },
      { t: 6.5, text: 'Mesmo assim, ele cristaliza: surgem grãos hexagonais.' },
      { t: 13, text: 'Agora a mistura binária fundida (cor = mobilidade).' },
      { t: 17, text: 'Mesma têmpera brusca.' },
      { t: 19.5, text: 'A mobilidade despenca e não aparece ordem: um vidro.' },
      { t: 25, text: 'Experimente: resfriamento lento, ou o monoatômico à mão.' },
    ],
    render: (t) => {
      if (manual) return;
      let k = -1; steps.forEach((s, i) => { if (t >= s.t) k = i; });
      if (k !== phase && k >= 0) { phase = k; steps[k].do(); }
    },
    onEnd: () => { manual = true; },
  });
  // o clipe só dirige o protocolo enquanto toca; ao tocar de novo, retoma o roteiro
  clip.btn.addEventListener('click', () => { if (clip.playing) { manual = false; if (clip.t < 0.05) phase = -1; } });
  clip.scrub.addEventListener('input', () => { manual = true; });
  draw(); drawHist();
}
