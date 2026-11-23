// Linha do tempo das definições de vidro.
// Critérios: o que cada definição exige. "no" = exigência que não vale para todos os vidros conhecidos.
const C = {
  inorg: 'Inorgânico', fusion: 'Feito por fusão', solid: 'É um sólido', rigid: 'Rígido', nc: 'Não cristalino',
  gt: 'Transição vítrea', neq: 'Fora do equilíbrio', relax: 'Relaxa', fate: 'Destino: cristalizar', sro: 'Mesma ordem local do líquido',
  struct: 'Rede sem periodicidade',
};

const DEFS = [
  {
    yr: '1932', who: 'Zachariasen', src: 'W. H. Zachariasen, J. Am. Chem. Soc. 54, 3841 (1932)',
    pt: 'O arranjo atômico do vidro é caracterizado por uma rede tridimensional estendida, sem simetria nem periodicidade, com energia comparável à do cristal correspondente.',
    orig: 'Paráfrase da hipótese da rede aleatória contínua.',
    ok: 'Primeira definição estrutural. Explica por que óxidos como SiO₂ e B₂O₃ formam vidro e cria os conceitos de formador e modificador.',
    ko: 'Descreve só redes covalentes de óxidos. Não contempla vidros metálicos (empacotamento denso) nem diz nada sobre a transição vítrea ou a dependência com o tempo.',
    crit: [['struct', 1], ['nc', 1]],
  },
  {
    yr: '1933', who: 'Tammann', src: 'G. Tammann, Der Glaszustand (1933)',
    pt: 'Vidros são líquidos super-resfriados solidificados.',
    orig: '"Glasses are undercooled solidified melts" (tradução inglesa usual).',
    ok: 'Liga o vidro ao líquido super-resfriado, uma ideia que a definição moderna recupera.',
    ko: 'Exige origem no fundido e o trata como sólido. Não distingue o vidro do LSR, nem fala de equilíbrio.',
    crit: [['fusion', 0], ['solid', 0]],
  },
  {
    yr: '1938', who: 'Morey', src: 'G. W. Morey, The Properties of Glass (1938)',
    pt: 'Substância inorgânica em condição contínua com o estado líquido que, por uma mudança reversível de viscosidade durante o resfriamento, atingiu viscosidade tão alta que, para fins práticos, é rígida.',
    orig: '"…an inorganic substance in a condition that is continuous with the liquid state…, for all practical purposes, rigid."',
    ok: 'Muito à frente do seu tempo: fala em continuidade com o líquido e em rigidez "para fins práticos", uma ideia de escala de tempo.',
    ko: 'Restrita a materiais inorgânicos. Não menciona a ausência de cristais nem a transição vítrea.',
    crit: [['inorg', 0], ['rigid', 1]],
  },
  {
    yr: '1945', who: 'ASTM', src: 'American Society for Testing and Materials (1945); ainda presente em normas ASTM',
    pt: 'Vidro é um produto inorgânico de fusão que foi resfriado até uma condição rígida sem cristalizar.',
    orig: '"Glass is an inorganic product of fusion which has cooled to a rigid condition without crystallizing."',
    ok: 'Prática e operacional para a indústria de vidros de silicato. Captura o essencial: resfriar sem cristalizar.',
    ko: 'Exclui vidros orgânicos, poliméricos e metálicos ("inorgânico"), vidros de sol-gel e de vapor ("fusão"), e trata a rigidez como absoluta.',
    crit: [['inorg', 0], ['fusion', 0], ['rigid', 1], ['nc', 1]],
  },
  {
    yr: '1991', who: 'Zarzycki', src: 'J. Zarzycki, Glasses and the Vitreous State (1991)',
    pt: 'Um vidro é um sólido não cristalino que exibe o fenômeno de transição vítrea.',
    orig: '"A glass is a non-crystalline solid exhibiting the phenomenon of glass transition."',
    ok: 'Independe de composição e de processo. Usa a transição vítrea como critério experimental, como fará a definição moderna.',
    ko: 'Chama o vidro de "sólido", ignorando que ele está fora do equilíbrio e relaxa.',
    crit: [['solid', 0], ['nc', 1], ['gt', 1]],
  },
  {
    yr: '1994', who: 'Varshneya', src: 'A. K. Varshneya, Fundamentals of Inorganic Glasses (1994)',
    pt: 'Vidro é um sólido de estrutura não cristalina que se converte continuamente em líquido ao ser aquecido.',
    orig: '"Glass is a solid having a non-crystalline structure, which continuously converts to a liquid upon heating."',
    ok: 'A conversão contínua ao líquido é a transição vítrea vista do aquecimento. É geral quanto à composição.',
    ko: 'Ainda chama o vidro de sólido. O debate entre Zanotto e Varshneya em 2016 motivou a nova definição.',
    crit: [['solid', 0], ['nc', 1], ['gt', 1]],
  },
  {
    yr: '1996', who: 'Gupta', src: 'P. K. Gupta, J. Non-Cryst. Solids 195, 158 (1996)',
    pt: 'Sólidos não cristalinos se dividem em duas classes termodinamicamente distintas: vidros (ordem de curto alcance igual à do líquido e do cristal correspondente) e sólidos amorfos (ordem de curto alcance diferente), que se comportam de modo diferente ao serem aquecidos.',
    orig: 'Paráfrase das definições quantitativas propostas no artigo.',
    ok: 'Separa vidro de "amorfo" com um critério estrutural e prevê comportamentos diferentes no aquecimento (ver capítulo 5).',
    ko: 'Exige conhecer a ordem local do líquido, nem sempre acessível. Mantém o enquadramento de "sólido".',
    crit: [['nc', 1], ['sro', 1], ['solid', 0]],
  },
  {
    yr: '1997', who: 'Shelby', src: 'J. E. Shelby, Introduction to Glass Science and Technology (1ª ed. 1997)',
    pt: 'Um sólido amorfo completamente desprovido de estrutura atômica periódica de longo alcance, e que exibe uma região de comportamento de transformação vítrea.',
    orig: '"An amorphous solid completely lacking in long range, periodic atomic structure, and exhibiting a region of glass transformation behavior."',
    ok: 'Fala em "região" de transformação, reconhecendo que a Tg é um intervalo que depende do tempo. Muito usada no ensino.',
    ko: 'Vidro como "sólido amorfo", o que mistura vidro e sólidos amorfos no sentido de Gupta.',
    crit: [['solid', 0], ['nc', 1], ['gt', 1]],
  },
  {
    yr: '2017', who: 'Zanotto e Mauro', zm: true, src: 'E. D. Zanotto, J. C. Mauro, J. Non-Cryst. Solids 471, 490 (2017)',
    pt: 'Vidro é um estado condensado da matéria, fora do equilíbrio e não cristalino, que exibe transição vítrea. Sua estrutura é semelhante à do líquido super-resfriado de origem, ele relaxa espontaneamente em direção a esse estado e seu destino final, em tempo infinito, é cristalizar.',
    orig: '"Glass is a nonequilibrium, non-crystalline condensed state of matter that exhibits a glass transition…"',
    ok: 'Não depende de composição, processo ou isotropia. Inclui o caráter de não equilíbrio, a relaxação e o destino final, e trata o vidro como um estado próprio, nem sólido nem líquido no sentido estrito.',
    ko: 'Exige reconhecer uma transição vítrea, o que pode ser difícil de observar quando o material cristaliza ao ser aquecido. É justamente essa a linha que separa vidros de outros amorfos.',
    crit: [['nc', 1], ['gt', 1], ['neq', 1], ['relax', 1], ['fate', 1]],
  },
];

export function init(root) {
  const host = root.querySelector('#tl');
  host.innerHTML = `
    <div class="tl-list" role="tablist" aria-label="Definições por ano">
      ${DEFS.map((d, i) => `<button class="tl-item${d.zm ? ' zm' : ''}" role="tab" id="tl-${i}" aria-selected="false" aria-controls="tl-card" data-i="${i}">
        <span class="yr">${d.yr}</span><span class="pin"></span><span class="who">${d.who}</span></button>`).join('')}
    </div>
    <div class="tl-card" id="tl-card" role="tabpanel" aria-live="polite"></div>`;
  const card = host.querySelector('#tl-card');
  const items = [...host.querySelectorAll('.tl-item')];

  function show(i) {
    const d = DEFS[i];
    items.forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
    card.setAttribute('aria-labelledby', `tl-${i}`);
    card.innerHTML = `
      <blockquote>${d.pt}</blockquote>
      <div class="orig">${d.orig}</div>
      <div class="src">${d.src}</div>
      <div class="verdict">
        <div class="ok"><b>O que acerta</b>${d.ok}</div>
        <div class="ko"><b>Onde falha</b>${d.ko}</div>
      </div>
      <div class="criteria" aria-label="Exigências da definição">
        ${d.crit.map(([k, v]) => `<span class="${v ? 'yes' : 'no'}" title="${v ? 'Válido para todos os vidros' : 'Não vale para todos os vidros'}">${C[k]}</span>`).join('')}
      </div>`;
  }
  items.forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.i))));
  host.querySelector('.tl-list').addEventListener('keydown', (e) => {
    const cur = items.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    let n = cur;
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) n = Math.min(items.length - 1, cur + 1);
    else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) n = Math.max(0, cur - 1);
    else return;
    e.preventDefault(); show(n); items[n].focus();
  });
  show(DEFS.length - 1);
}
