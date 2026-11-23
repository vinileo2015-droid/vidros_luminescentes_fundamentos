// Ponto de entrada: carrega cada módulo de seção só quando ele se aproxima da tela.
const loaders = {
  timeline: () => import('./sections/timeline.js'),
  definition: () => import('./sections/definition.js'),
  zachariasen: () => import('./sections/zachariasen.js'),
  zachrules: () => import('./sections/zachrules.js'),
  criteria: () => import('./sections/criteria.js'),
  phillips: () => import('./sections/phillips.js'),
  complab: () => import('./sections/complab.js'),
  kinetics: () => import('./sections/kinetics.js'),
  hetero: () => import('./sections/hetero.js'),
  glassceramic: () => import('./sections/glassceramic.js'),
  network2d: () => import('./sections/network2d.js'),
  deborah: () => import('./sections/deborah.js'),
  md: () => import('./sections/md.js'),
  fate: () => import('./sections/fate.js'),
  vt: () => import('./sections/vt.js'),
  families: () => import('./sections/families.js'),
  optics: () => import('./sections/optics.js'),
  heating: () => import('./sections/heating.js'),
  angell: () => import('./sections/angell.js'),
  // Parte 3
  viscref: () => import('./sections/viscref.js'),
  anharm: () => import('./sections/anharm.js'),
  expansion: () => import('./sections/expansion.js'),
  shock: () => import('./sections/shock.js'),
  radk: () => import('./sections/radk.js'),
  dispersion: () => import('./sections/dispersion.js'),
  window: () => import('./sections/window.js'),
  colors: () => import('./sections/colors.js'),
  scatter: () => import('./sections/scatter.js'),
  mobands: () => import('./sections/mobands.js'),
  density: () => import('./sections/density.js'),
  elastic: () => import('./sections/elastic.js'),
  griffith: () => import('./sections/griffith.js'),
  tempering: () => import('./sections/tempering.js'),
  leach: () => import('./sections/leach.js'),
  reactivity: () => import('./sections/reactivity.js'),
  energygap: () => import('./sections/energygap.js'),
  emission: () => import('./sections/emission.js'),
  photochromic: () => import('./sections/photochromic.js'),
};

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    const name = e.target.dataset.module;
    loaders[name]?.()
      .then((m) => m.init(e.target))
      .catch((err) => {
        console.error(`[${name}]`, err);
        const msg = document.createElement('p');
        msg.className = 'note';
        msg.style.padding = '0 20px 16px';
        msg.textContent = 'Esta figura interativa não pôde ser carregada neste navegador. O texto ao redor continua válido.';
        e.target.appendChild(msg);
      });
  }
}, { rootMargin: '400px 0px' });
document.querySelectorAll('[data-module]').forEach((el) => io.observe(el));

// Hero 3D (só nas páginas que têm a gota)
if (document.getElementById('hero-canvas')) import('./sections/hero.js').then((m) => m.init()).catch((err) => {
  console.error('[hero]', err);
  document.getElementById('hero-hint').textContent = 'A cena 3D precisa de WebGL, que não está disponível neste navegador.';
});

// Hero da Parte 2
if (document.getElementById('p2-hero-canvas')) import('./sections/p2hero.js').then((m) => m.init()).catch((e) => console.error(e));

// Hero da Parte 3
if (document.getElementById('p3-hero-canvas')) import('./sections/p3hero.js').then((m) => m.init()).catch((e) => console.error(e));

// Próxima parte: pequeno brilho luminescente
if (document.getElementById('next-canvas')) import('./sections/next.js').then((m) => m.init()).catch((e) => console.error(e));

// Navegação: destaca o capítulo atual
const links = [...document.querySelectorAll('.chapters a, .rail a')];
const sections = [...document.querySelectorAll('main .chapter, #referencias')];
const navIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const id = e.target.id;
    for (const a of links) a.setAttribute('aria-current', a.getAttribute('href') === `#${id}` ? 'true' : 'false');
    const active = document.querySelector(`.chapters a[href="#${id}"]`);
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => navIO.observe(s));
