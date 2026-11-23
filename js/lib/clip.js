// "Clipes": animações roteirizadas com controles de vídeo (play/pausa, barra de tempo, legendas).
// O conteúdo é desenhado ao vivo (canvas/WebGL), então cada quadro também é interativo.
import { reducedMotion, visibility } from './ui.js';

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
const ICON_REPLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>';

export class Clip {
  // host: elemento .clip contendo .canvas-box; opts: { duration (s), chapters: [{t, text}], render(t, dt), loop, autoplay }
  constructor(host, { duration, chapters = [], render, loop = false, autoplay = true, label = 'animação', onEnd } = {}) {
    this.host = host; this.duration = duration; this.chapters = chapters;
    this.render = render; this.loop = loop; this.onEnd = onEnd;
    this.t = 0; this.playing = false; this.visible = false; this.started = false;

    this.caption = document.createElement('div');
    this.caption.className = 'clip-caption';
    this.caption.innerHTML = '<span aria-live="polite"></span>';
    host.appendChild(this.caption);

    const bar = document.createElement('div');
    bar.className = 'clip-bar';
    bar.innerHTML = `
      <button class="clip-play" type="button" aria-label="Reproduzir ${label}">${ICON_PLAY}</button>
      <input class="clip-scrub" type="range" min="0" max="1000" value="0" aria-label="Posição da ${label}">
      <span class="clip-time">0,0 / ${duration.toFixed(1).replace('.', ',')} s</span>`;
    host.appendChild(bar);
    this.btn = bar.querySelector('.clip-play');
    this.scrub = bar.querySelector('.clip-scrub');
    this.timeEl = bar.querySelector('.clip-time');

    this.btn.addEventListener('click', () => (this.playing ? this.pause() : this.play()));
    this.scrub.addEventListener('input', () => {
      this.pause();
      this.seek((this.scrub.value / 1000) * this.duration);
    });

    visibility(host, (v) => {
      this.visible = v;
      if (v && autoplay && !this.started && !reducedMotion()) { this.started = true; this.play(); }
      if (v && this.playing) this.loopFrame();
    }, '0px');
    this.seek(0);
  }

  play() {
    if (this.t >= this.duration - 1e-3) this.t = 0;
    this.playing = true; this.started = true;
    this.btn.innerHTML = ICON_PAUSE; this.btn.setAttribute('aria-label', 'Pausar');
    this.last = performance.now();
    this.loopFrame();
  }
  pause() {
    this.playing = false;
    this.btn.innerHTML = this.t >= this.duration - 1e-3 ? ICON_REPLAY : ICON_PLAY;
    this.btn.setAttribute('aria-label', 'Reproduzir');
  }
  loopFrame() {
    if (this.raf) return;
    const tick = (now) => {
      this.raf = null;
      if (!this.playing || !this.visible) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      let t = this.t + dt;
      if (t >= this.duration) {
        if (this.loop) t = 0;
        else { t = this.duration; this.seek(t, dt); this.pause(); this.onEnd && this.onEnd(); return; }
      }
      this.seek(t, dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  seek(t, dt = 0) {
    this.t = t;
    this.scrub.value = Math.round((t / this.duration) * 1000);
    this.timeEl.textContent = `${t.toFixed(1).replace('.', ',')} / ${this.duration.toFixed(1).replace('.', ',')} s`;
    let cap = '';
    for (const c of this.chapters) if (t >= c.t) cap = c.text;
    const span = this.caption.firstElementChild;
    if (span.textContent !== cap) span.textContent = cap;
    this.render && this.render(t, dt);
  }
}
