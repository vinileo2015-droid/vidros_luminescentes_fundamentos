// Verificador das quatro regras de Zachariasen para um óxido AmOn.
// Coordenação do oxigênio (nº de cátions A por O) = c·m/n, em que c é a coordenação do cátion.
const LIST = [
  { f: 'SiO₂', m: 1, n: 2, c: 4, rc: 0.40, poly: 'tetraedros SiO₄', real: 'yes', realTxt: 'Forma vidro facilmente: o caso modelo.' },
  { f: 'B₂O₃', m: 2, n: 3, c: 3, rc: 0.27, poly: 'triângulos BO₃', real: 'yes', realTxt: 'Forma vidro e é quase impossível de cristalizar à pressão ambiente.' },
  { f: 'GeO₂', m: 1, n: 2, c: 4, rc: 0.53, poly: 'tetraedros GeO₄', real: 'yes', realTxt: 'Forma vidro, como a sílica.' },
  { f: 'P₂O₅', m: 2, n: 5, c: 4, rc: 0.38, poly: 'tetraedros PO₄ (um O terminal P=O)', real: 'yes', realTxt: 'Forma vidro (higroscópico).', terminal: 1 },
  { f: 'As₂O₃', m: 2, n: 3, c: 3, rc: 0.58, poly: 'pirâmides AsO₃', real: 'yes', realTxt: 'Forma vidro.' },
  { f: 'V₂O₅', m: 2, n: 5, c: 4, rc: 0.54, poly: 'tetraedros VO₄ (um O terminal V=O)', real: 'cond', realTxt: 'As regras "permitem", mas não vitrifica por meios comuns: precisa de um modificador estabilizante. Zachariasen já tinha dúvidas sobre ele.', terminal: 1 },
  { f: 'Al₂O₃', m: 2, n: 3, c: 4, rc: 0.535, poly: 'tetraedros AlO₄ (hipótese)', real: 'no', realTxt: 'Não vitrifica sozinho em condições comuns; entra em vidros como intermediário, com compensação de carga.' },
  { f: 'TiO₂', m: 1, n: 2, c: 6, rc: 0.605, poly: 'octaedros TiO₆ (rutilo)', real: 'no', realTxt: 'Não vitrifica sozinho; intermediário e agente nucleante.' },
  { f: 'MoO₃', m: 1, n: 3, c: 6, rc: 0.59, poly: 'octaedros MoO₆', real: 'cond', realTxt: 'Viola só a regra 2. Não vitrifica sozinho, mas forma vidros com P₂O₅ ou óxidos básicos: formador condicional.' },
  { f: 'MgO', m: 1, n: 1, c: 6, rc: 0.72, poly: 'octaedros MgO₆ (sal-gema)', real: 'no', realTxt: 'Não forma vidro: octaedros compartilham arestas e cada O é dividido por seis Mg.' },
  { f: 'BaO', m: 1, n: 1, c: 6, rc: 1.35, poly: 'octaedros BaO₆ (sal-gema)', real: 'no', realTxt: 'Não forma vidro (exercício 1 do cap. 3 do Varshneya).' },
  { f: 'Na₂O', m: 2, n: 1, c: 4, rc: 0.99, poly: 'tetraedros NaO₄ (antifluorita)', real: 'no', realTxt: 'Não forma vidro: cada O fica cercado por oito Na.' },
  { f: 'Cu₂O', m: 2, n: 1, c: 2, rc: 0.46, poly: 'Cu linear (O–Cu–O); O no centro de tetraedros OCu₄', real: 'no', realTxt: 'Não forma vidro (exercício 2 do Varshneya, supondo tetraedros OCu₄).' },
];

const shape = (c) => (c === 2 ? 'linear' : c === 3 ? 'triangular' : c === 4 ? 'tetraédrica' : c === 6 ? 'octaédrica' : `${c}`);
const ratioShape = (q) => (q < 0.155 ? 2 : q < 0.225 ? 3 : q < 0.414 ? 4 : q < 0.732 ? 6 : 8);

export function init(root) {
  const tabs = root.querySelector('#zr-tabs'), card = root.querySelector('#zr-card');
  tabs.innerHTML = LIST.map((o, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${o.f}</button>`).join('');
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(Number(b.dataset.i)); });

  function show(i) {
    const o = LIST[i];
    [...tabs.children].forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    const oc = (o.c * o.m) / o.n;                     // cátions por oxigênio (média)
    const ocBridge = o.terminal ? ((o.c - o.terminal) * o.m) / (o.n - o.terminal * o.m) : oc; // só os O que fazem ponte
    const q = o.rc / 1.40;
    const rules = [
      { ok: ocBridge <= 2.001, t: 'Cada oxigênio liga no máximo dois cátions A', why: `Coordenação média do O: c·m/n = ${o.c}·${o.m}/${o.n} = ${oc.toFixed(2).replace('.', ',')}${o.terminal ? ` (${ocBridge.toFixed(2).replace('.', ',')} entre os O que fazem ponte)` : ''}.` },
      { ok: o.c === 3 || o.c === 4, t: 'Coordenação do cátion pequena (3 ou 4)', why: `Coordenação ${shape(o.c)} (c = ${o.c}). Goldschmidt: r_A/r_O = ${q.toFixed(2).replace('.', ',')} → preferência por c ≈ ${ratioShape(q)}.` },
      { ok: ocBridge <= 2.001, t: 'Poliedros compartilham vértices, não arestas ou faces', why: ocBridge <= 2.001 ? 'Com no máximo 2 cátions por O, os poliedros podem se unir só pelos vértices.' : 'Com mais de 2 cátions por O, os poliedros precisam dividir arestas ou faces.' },
      { ok: ocBridge <= 2.001 && Math.min(o.c, o.c - (o.terminal || 0)) >= 3, t: 'Ao menos três vértices de cada poliedro são compartilhados', why: `Cada poliedro tem ${o.c - (o.terminal || 0)} vértice(s) disponível(is) para pontes.` },
    ];
    const pass = rules.every((r) => r.ok);
    const verdict = pass ? 'As regras permitem uma rede vítrea' : `Viola ${rules.filter((r) => !r.ok).length} regra(s)`;
    card.innerHTML = `
      <div class="zr-top">
        <svg viewBox="-60 -60 120 120" class="zr-svg" aria-hidden="true">${glyph(o.c, oc)}</svg>
        <div><h5>${o.f}</h5><div class="formula">Hipótese estrutural: ${o.poly}</div>
          <div class="zr-verdict ${pass ? 'ok' : 'ko'}">${verdict}</div></div>
      </div>
      <ol class="zr-rules">${rules.map((r, k) => `<li class="${r.ok ? 'ok' : 'ko'}"><span class="zr-mark" aria-label="${r.ok ? 'satisfeita' : 'violada'}">${r.ok ? '✓' : '✗'}</span><div><b>Regra ${k + 1}: ${r.t}</b><span>${r.why}</span></div></li>`).join('')}</ol>
      <p class="zr-real"><b>Na prática:</b> ${o.realTxt}</p>`;
  }
  show(0);
}

// pequeno desenho: poliedro do cátion e número de cátions em torno do O
function glyph(c, oc) {
  const pts = (n, r, rot = -Math.PI / 2) => Array.from({ length: n }, (_, k) => [Math.cos(rot + (2 * Math.PI * k) / n) * r, Math.sin(rot + (2 * Math.PI * k) / n) * r]);
  const n = c === 2 ? 2 : c;
  const P = c === 2 ? [[-34, 0], [34, 0]] : pts(n === 8 ? 8 : n, 34);
  const poly = c === 2 ? '' : `<polygon points="${P.map((p) => p.join(',')).join(' ')}" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-opacity=".5"/>`;
  return `${poly}${P.map((p) => `<line x1="0" y1="0" x2="${p[0]}" y2="${p[1]}" stroke="currentColor" stroke-width="2"/>`).join('')}
    ${P.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="var(--panel)" stroke="currentColor" stroke-width="1.5"/>`).join('')}
    <circle cx="0" cy="0" r="6" fill="currentColor"/>
    <text x="0" y="56" text-anchor="middle" font-size="12" fill="currentColor" font-family="Schibsted Grotesk, sans-serif">${oc.toFixed(2).replace('.', ',')} A por O</text>`;
}
