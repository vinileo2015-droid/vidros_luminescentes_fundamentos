// Definição anotada de Zanotto e Mauro: cada termo tem uma explicação.
const EXPLAIN = {
  neq: ['Fora do equilíbrio', 'As propriedades de um vidro dependem de como ele foi feito (taxa de resfriamento, recozimento, pressão) e mudam com o tempo. Um sistema em equilíbrio teria propriedades definidas só por T e P. Esse é o ponto que mais separa o vidro de um "sólido" comum.'],
  nc: ['Não cristalino', 'Não há ordem periódica de longo alcance: nenhuma célula unitária, repetida, reconstrói o material. Pode haver, e há, ordem de curto e médio alcance (veja a rede 2D mais abaixo).'],
  appears: ['Parece sólido em escalas de tempo curtas', 'É uma afirmação cinética, não termodinâmica: em tempos de observação muito menores que o tempo de relaxação τ, o vidro responde elasticamente, como um sólido. O capítulo 2 explora isso com o número de Deborah.'],
  relax: ['Relaxa continuamente em direção ao líquido', 'Abaixo de Tg, a estrutura evolui lentamente em direção à do líquido super-resfriado na mesma temperatura (densifica, libera entalpia). À temperatura ambiente, isso pode levar mais que a idade do universo; perto de Tg, minutos.'],
  cond: ['Estado condensado', 'O vidro tem densidade e coesão de matéria condensada. Isso separa o vidro de gases e deixa claro que se trata de um estado da matéria, não de uma classe de composições.'],
  gt: ['Exibe transição vítrea', 'Ao aquecer, o vidro passa de forma contínua ao líquido super-resfriado, com degraus em Cp e no coeficiente de expansão. É a assinatura experimental do vidro e o critério que o separa de outros sólidos amorfos (capítulo 5).'],
  struct: ['Estrutura semelhante à do LSR de origem', 'O vidro é, estruturalmente, um instantâneo do líquido super-resfriado na temperatura fictícia Tf. Isso o distingue de sólidos amorfos cuja ordem local difere da do líquido (o silício amorfo, por exemplo).'],
  spont: ['Relaxa espontaneamente em direção ao LSR', 'Não é preciso aplicar tensão nem campo: a força motriz é a diferença de energia livre entre o vidro e o LSR. O processo é não linear e não exponencial (função de Kohlrausch).'],
  fate: ['Destino final: cristalizar', 'O LSR é metaestável em relação ao cristal. Em tempo infinito, a nucleação acaba ocorrendo e o material cristaliza. É por isso que a definição fala em "destino final" e chama o vidro de estado "congelado" só temporariamente.'],
};

export function init(root) {
  const out = root.querySelector('#hl-explain');
  const btns = [...root.querySelectorAll('.hl')];
  btns.forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
    const act = () => {
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      const [t, x] = EXPLAIN[b.dataset.k];
      out.innerHTML = `<b>${t}.</b> ${x}`;
    };
    b.addEventListener('click', act);
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });
}
