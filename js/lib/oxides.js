// Banco de dados dos compostos do laboratório de composição.
// F (força de campo de Dietzel) = Z / (r_c + r_O)², calculada com raios iônicos de Shannon e r_O = 1,38 Å.
// sun = força de ligação simples de Sun (1947), kcal/mol, como reproduzida em textos clássicos; null se não usada aqui.
// lam = basicidade óptica do óxido (compilação da Tab. 13.3 do Springer Handbook of Glass); null se não tabelada.
// role: como o cátion entra na rede-modelo do laboratório.

const RO = 1.38;
const F = (z, r) => +(z / (r + RO) ** 2).toFixed(2);

export const CLASSES = {
  former: { name: 'Formadores de rede', short: 'Formador', color: '--glass' },
  modifier: { name: 'Modificadores', short: 'Modificador', color: '--scl' },
  intermediate: { name: 'Intermediários', short: 'Intermediário', color: '--cryst' },
  conditional: { name: 'Formadores condicionais', short: 'Condicional', color: '--cond' },
  nucleant: { name: 'Agentes nucleantes', short: 'Nucleante', color: '--nuc' },
  polyvalent: { name: 'Cátions polivalentes', short: 'Polivalente', color: '--liq' },
};

// ox = oxigênios por fórmula; cat = cátions por fórmula; z = carga do cátion
export const OXIDES = [
  // ---------------- formadores ----------------
  {
    id: 'SiO2', f: 'SiO₂', cls: 'former', el: 'Si', z: 4, cat: 1, ox: 2, def: 74, max: 100, cn: '4', r: 0.26, sun: 106, lam: 0.48,
    color: '#0b7f82', role: 'T',
    how: 'Cada Si⁴⁺ fica no centro de um tetraedro SiO₄, e os tetraedros se ligam pelos quatro vértices: cada oxigênio é uma ponte Si–O–Si (oxigênio ponteante, BO). A sílica pura é feita só de unidades Q⁴.',
    effect: 'É o esqueleto da rede. Quanto mais SiO₂, mais conectada a rede: maiores a viscosidade, a Tg e a durabilidade química, e menor a expansão térmica.',
    props: { tg: '↑', alpha: '↓', dur: '↑', n: '↓' },
    example: 'Sílica vítrea (Tg ≈ 1200 °C); base de quase todos os vidros comerciais.',
  },
  {
    id: 'B2O3', f: 'B₂O₃', cls: 'former', el: 'B', z: 3, cat: 2, ox: 3, def: 15, max: 80, cn: '3 ou 4', r: 0.01, r4: 0.11, sun: 119, sun4: 89, lam: 0.42,
    color: '#b7791f', role: 'B',
    how: 'O B³⁺ forma triângulos BO₃ (no B₂O₃ puro, muitos organizados em anéis boroxol). Com modificador disponível, parte dos boros passa a tetraedros BO₄⁻: o cátion modificador compensa a carga do tetraedro em vez de criar NBO.',
    effect: 'A conversão BO₃ → BO₄ aumenta a conectividade enquanto há pouco modificador; depois de certo teor, os NBOs voltam a aparecer. Essa inversão de tendência é a "anomalia do boro". Reduz a temperatura de fusão e, em borossilicatos, a expansão térmica.',
    props: { tg: '↓/↑', alpha: '↓', dur: '↑/↓', n: '≈' },
    example: 'Borossilicato de laboratório (~80 SiO₂, 13 B₂O₃, 4 Na₂O, 2 Al₂O₃ em massa): baixa expansão.',
  },
  {
    id: 'GeO2', f: 'GeO₂', cls: 'former', el: 'Ge', z: 4, cat: 1, ox: 2, def: 20, max: 100, cn: '4 (→ 6)', r: 0.39, sun: 108, lam: null,
    color: '#2b7de0', role: 'T',
    how: 'Análogo estrutural da sílica: tetraedros GeO₄ ligados pelos vértices. O Ge⁴⁺ é maior, as ligações são mais longas e o ângulo Ge–O–Ge é menor.',
    effect: 'Rede mais "pesada" e polarizável: índice de refração mais alto, energia de fônon menor (~800–900 cm⁻¹) e Tg menor que a da sílica. Com muito álcali, parte do Ge passa a coordenação 5–6 (anomalia do germanato).',
    props: { tg: '↓', alpha: '↑', dur: '≈', n: '↑' },
    example: 'Núcleo dopado de fibras ópticas de telecomunicação (SiO₂–GeO₂).',
  },
  {
    id: 'P2O5', f: 'P₂O₅', cls: 'former', el: 'P', z: 5, cat: 2, ox: 5, def: 20, max: 80, cn: '4', r: 0.17, sun: 100, lam: 0.40,
    color: '#7a5ce0', role: 'P', nucleant: true,
    how: 'Tetraedros PO₄ em que um dos oxigênios faz dupla ligação P=O e não serve de ponte. Por isso o fósforo tem no máximo três pontes (Q³) mesmo no P₂O₅ puro.',
    effect: 'Rede mais aberta e menos conectada que a do silicato: Tg baixa, fusão fácil, boa solubilidade para terras-raras, mas durabilidade química baixa. Com modificadores, forma cadeias (metafosfatos, Q²). Em silicatos, separa fase e atua como agente nucleante.',
    props: { tg: '↓', alpha: '↑', dur: '↓', n: '≈' },
    example: 'Vidros fosfato para lasers de Nd³⁺ e Er³⁺; vidros bioativos.',
  },
  {
    id: 'As2O3', f: 'As₂O₃', cls: 'former', el: 'As', z: 3, cat: 2, ox: 3, def: 20, max: 100, cn: '3', r: 0.58, sun: null, lam: null,
    color: '#8f6f9e', role: 'T3',
    how: 'Pirâmides AsO₃ com um par eletrônico isolado no vértice, ligadas pelos três oxigênios. Satisfaz as regras de Zachariasen para óxidos A₂O₃ com coordenação 3.',
    effect: 'Forma vidro sozinho (está na lista clássica de formadores da Tab. 3.1 do Varshneya). Na prática é mais usado como agente de refino em pequenas quantidades e como componente de vidros calcogenetos (na forma de sulfeto/seleneto).',
    props: { tg: '↓', alpha: '↑', dur: '↓', n: '↑' },
    example: 'Agente de refino (eliminação de bolhas); As₂S₃ e As₂Se₃ em ópticas de infravermelho.',
  },
  // ---------------- modificadores ----------------
  {
    id: 'Li2O', f: 'Li₂O', cls: 'modifier', el: 'Li', z: 1, cat: 2, ox: 1, def: 15, max: 40, cn: '4–6', r: 0.76, sun: 36, lam: 1.0,
    color: '#c9a227', role: 'M',
    how: 'Cada Li₂O quebra uma ponte Si–O–Si e gera dois NBOs; os dois Li⁺ ficam junto a esses NBOs. É o menor dos álcalis, com a maior força de campo entre eles.',
    effect: 'O Li⁺ tende a se agrupar perto de unidades Q², o que desloca o equilíbrio 2Q³ ⇌ Q² + Q⁴ para a direita. Os vidros de lítio cristalizam com facilidade (às vezes por nucleação homogênea), o que é aproveitado em vitrocerâmicas de dissilicato de lítio.',
    props: { tg: '↓', alpha: '↑', dur: '↓', n: '↑' },
    example: 'Vitrocerâmicas de Li₂Si₂O₅ (odontologia); vitrocerâmicas LAS de baixa expansão (cooktops).',
  },
  {
    id: 'Na2O', f: 'Na₂O', cls: 'modifier', el: 'Na', z: 1, cat: 2, ox: 1, def: 16, max: 50, cn: '5–7', r: 1.02, sun: 20, lam: 1.15,
    color: '#d08a1f', role: 'M',
    how: 'O modificador clássico: cada Na₂O traz um O²⁻ extra que rompe uma ponte Si–O–Si, gerando dois oxigênios não ponteantes (Si–O⁻). Os dois Na⁺ compensam essas cargas, com ligações quase iônicas.',
    effect: 'Despolimeriza a rede (Q⁴ → Q³ → Q²): reduz muito a viscosidade e a Tg (é o "fundente" do vidro sodo-cálcico), aumenta a expansão térmica e a condutividade iônica e piora a durabilidade química, porque o Na⁺ é lixiviado com facilidade.',
    props: { tg: '↓↓', alpha: '↑↑', dur: '↓↓', n: '↑' },
    example: 'Vidro de janela e de embalagem (~13–16 % em massa de Na₂O).',
  },
  {
    id: 'K2O', f: 'K₂O', cls: 'modifier', el: 'K', z: 1, cat: 2, ox: 1, def: 15, max: 45, cn: '8–9', r: 1.51, sun: 13, lam: 1.40,
    color: '#e09a52', role: 'M',
    how: 'Mesmo mecanismo do Na₂O (uma ponte rompida, dois NBOs), mas o K⁺ é grande e ocupa sítios com 8–9 oxigênios ao redor.',
    effect: 'Força de campo muito baixa: favorece distribuições de Qⁿ mais próximas do modelo binário. Misturar Na⁺ e K⁺ reduz a mobilidade iônica de forma não linear (efeito de álcali misto). Usado em troca iônica: o K⁺ substitui o Na⁺ na superfície e gera compressão.',
    props: { tg: '↓↓', alpha: '↑↑', dur: '↓', n: '≈' },
    example: 'Vidros de cristal "sem chumbo"; banhos de KNO₃ na têmpera química.',
  },
  {
    id: 'MgO', f: 'MgO', cls: 'modifier', el: 'Mg', z: 2, cat: 1, ox: 1, def: 6, max: 30, cn: '4–6', r: 0.72, sun: 37, lam: 0.78,
    color: '#b38f3a', role: 'M',
    how: 'Cada MgO gera dois NBOs, e um único Mg²⁺ fica entre eles. Pela alta força de campo, uma fração do Mg pode ficar em coordenação 4, e alguns autores o tratam como intermediário.',
    effect: 'Estabiliza o vidro, como o Ca²⁺, mas com maior força de campo: Tg relativamente alta, menor tendência à devitrificação nas composições float. Ordena mais os NBOs ao seu redor.',
    props: { tg: '↑', alpha: '↓', dur: '↑', n: '↑' },
    example: 'Vidro float (~4 % de MgO, vindo da dolomita); fibras de vidro E.',
  },
  {
    id: 'CaO', f: 'CaO', cls: 'modifier', el: 'Ca', z: 2, cat: 1, ox: 1, def: 10, max: 40, cn: '6–8', r: 1.00, sun: 32, lam: 1.0,
    color: '#c27c0e', role: 'M',
    how: 'Cada CaO quebra uma ponte e gera dois NBOs; o Ca²⁺, bivalente, fica coordenado a esses dois NBOs (e a outros oxigênios vizinhos), como uma "ponte iônica" entre os dois tetraedros.',
    effect: 'Também despolimeriza, mas o Ca²⁺ amarra os NBOs entre si e é pouco móvel. Por isso é chamado de estabilizador: devolve a durabilidade química que o Na₂O tira e mantém a viscosidade alta o bastante para conformar o vidro.',
    props: { tg: '↑', alpha: '↑', dur: '↑↑', n: '↑' },
    example: 'O "cálcico" do sodo-cálcico (~10 % de CaO); vidros bioativos (CaO–P₂O₅–SiO₂).',
  },
  {
    id: 'BaO', f: 'BaO', cls: 'modifier', el: 'Ba', z: 2, cat: 1, ox: 1, def: 10, max: 40, cn: '8–10', r: 1.42, sun: 33, lam: 1.15,
    color: '#a86a2a', role: 'M',
    how: 'Mesmo papel do CaO (dois NBOs por BaO), com um cátion grande e pesado em sítios de alta coordenação.',
    effect: 'Aumenta a densidade e o índice de refração sem tanta dispersão; baixa força de campo, portanto efeito estabilizador menor que o do Ca²⁺. Absorve raios X.',
    props: { tg: '↓', alpha: '↑', dur: '≈', n: '↑↑' },
    example: 'Vidros ópticos "crown" de bário; vidros para telas de tubos de raios catódicos.',
  },
  // ---------------- intermediários ----------------
  {
    id: 'Al2O3', f: 'Al₂O₃', cls: 'intermediate', el: 'Al', z: 3, cat: 2, ox: 3, def: 5, max: 40, cn: '4 (5, 6)', r: 0.39, r6: 0.535, sun: 90, sun6: 60, lam: 0.60,
    color: '#5146c8', role: 'Al',
    how: 'O Al³⁺ entra em tetraedros AlO₄⁻, substituindo o Si⁴⁺, desde que um cátion modificador fique ao lado para compensar a carga negativa. Esse cátion deixa de criar NBO. Se faltar modificador (Al/M > 1, composição peraluminosa), surgem Al em coordenação 5 e 6.',
    effect: 'Repolimeriza a rede: cada Al₂O₃ "consome" modificadores e remove NBOs. Aumenta fortemente a viscosidade, a Tg, a dureza e a durabilidade química, e abre caminhos para a troca iônica (Gorilla® Glass). Sozinho não forma vidro: precisa da estabilização por modificadores.',
    props: { tg: '↑↑', alpha: '↓', dur: '↑↑', n: '↑' },
    example: 'Vidros aluminossilicatos para telas (ex.: ~60 SiO₂, 15 Al₂O₃, 13 Na₂O…); fibras E.',
  },
  {
    id: 'TiO2', f: 'TiO₂', cls: 'intermediate', el: 'Ti', z: 4, cat: 1, ox: 2, def: 4, max: 20, cn: '4, 5, 6', r: 0.42, sun: 73, lam: 0.61, nucleant: true,
    color: '#6b7f99', role: 'Ti',
    how: 'O Ti⁴⁺ pode ocupar sítios tetraédricos (substituindo Si), piramidais de base quadrada (TiO₅, com uma ligação curta Ti=O) ou octaédricos. A proporção depende do teor de TiO₂ e dos modificadores.',
    effect: 'Aumenta o índice de refração e a absorção no UV. Em teores de alguns %, separa fase e precipita cristais (ou ZrTiO₄, com ZrO₂) após tratamento térmico: é um dos agentes nucleantes mais usados.',
    props: { tg: '↑', alpha: '↓', dur: '↑', n: '↑↑' },
    example: 'Vitrocerâmicas LAS transparentes (TiO₂ + ZrO₂ como nucleantes).',
  },
  {
    id: 'ZnO', f: 'ZnO', cls: 'intermediate', el: 'Zn', z: 2, cat: 1, ox: 1, def: 6, max: 40, cn: '4 ou 6', r: 0.60, sun: 72, lam: 0.82,
    color: '#7a8f6a', role: 'Zn',
    how: 'Com modificadores disponíveis, o Zn²⁺ forma tetraedros ZnO₄²⁻ ligados à rede, compensados por dois cátions vizinhos. Sem compensação, comporta-se como modificador octaédrico e gera NBOs.',
    effect: 'Melhora a durabilidade química, reduz a expansão e a temperatura de fusão em esmaltes e vidros de baixo ponto de amolecimento. Hospedeiro comum em vidros teluritos e germanatos.',
    props: { tg: '↓', alpha: '↓', dur: '↑', n: '↑' },
    example: 'Vidros de selagem; vidros TeO₂–ZnO–Na₂O (TZN) para fotônica.',
  },
  {
    id: 'PbO', f: 'PbO', cls: 'intermediate', el: 'Pb', z: 2, cat: 1, ox: 1, def: 20, max: 80, cn: '3–4 (pirâmide) ou 6–8', r: 1.19, sun: 73, sun6: 39, lam: null,
    color: '#5e6a73', role: 'Pb',
    how: 'Em teores baixos, o Pb²⁺ age como modificador (gera NBOs). Em teores altos, forma pirâmides PbO₃/PbO₄ com o par isolado 6s² apontando para fora, que se ligam entre si e passam a sustentar a rede: vidros com até ~80 % de PbO se formam com ajuda de pouca SiO₂.',
    effect: 'Íon muito polarizável: índice de refração e dispersão altos (brilho do "cristal"), baixa temperatura de trabalho, alta densidade e blindagem de radiação. Uso hoje restrito por toxicidade.',
    props: { tg: '↓', alpha: '↑', dur: '↓', n: '↑↑' },
    example: 'Cristal de chumbo (≥ 24 % PbO em massa); vidros de blindagem.',
  },
  {
    id: 'ZrO2', f: 'ZrO₂', cls: 'intermediate', el: 'Zr', z: 4, cat: 1, ox: 2, def: 3, max: 10, cn: '6–8', r: 0.72, sun: 81, lam: null, nucleant: true,
    color: '#4f6fb3', role: 'Zr',
    how: 'O Zr⁴⁺ fica em octaedros ZrO₆ ligados pelos vértices aos tetraedros de silício. Os octaedros ficam com carga 2⁻, compensada por dois cátions modificadores, e por isso consomem NBOs.',
    effect: 'Aumenta muito a resistência a álcalis e a viscosidade, mas tem solubilidade limitada (poucos %). Acima dela, ou após tratamento térmico, precipita ZrO₂/ZrTiO₄: é um nucleante clássico.',
    props: { tg: '↑↑', alpha: '↓', dur: '↑↑', n: '↑' },
    example: 'Fibras de vidro álcali-resistentes (AR) para concreto; vitrocerâmicas LAS.',
  },
  {
    id: 'BeO', f: 'BeO', cls: 'intermediate', el: 'Be', z: 2, cat: 1, ox: 1, def: 5, max: 20, cn: '4', r: 0.27, sun: 63, lam: null,
    color: '#5d8aa8', role: 'Zn',
    how: 'Tetraedros BeO₄²⁻ ligados à rede quando há modificador para compensar a carga, de modo análogo ao Zn²⁺.',
    effect: 'Cátion pequeno e de alta força de campo, na fronteira entre formador e modificador. O BeF₂ é o análogo estrutural da sílica entre os haletos. Pouco usado por ser tóxico.',
    props: { tg: '↑', alpha: '↓', dur: '↑', n: '↓' },
    example: 'Vidros de BeF₂ (baixíssimo índice de refração), de interesse histórico.',
  },
  // ---------------- formadores condicionais ----------------
  {
    id: 'TeO2', f: 'TeO₂', cls: 'conditional', el: 'Te', z: 4, cat: 1, ox: 2, def: 70, max: 100, cn: '3–4', r: 0.66, sun: null, lam: null,
    color: '#b5532d', role: 'C', lp: true,
    how: 'Unidades TeO₄ (bipirâmide trigonal com o par isolado 5s² ocupando um vértice) que, com modificadores, se convertem em pirâmides TeO₃. Sozinho cristaliza facilmente; com ~10–20 % de um parceiro (ZnO, Na₂O, WO₃…) forma vidro.',
    effect: 'Vidros teluritos: índice de refração ~2, energia de fônon baixa (~750 cm⁻¹), alta não linearidade e boa solubilidade para terras-raras. Interessam diretamente à luminescência no infravermelho.',
    props: { tg: '↓', alpha: '↑', dur: '≈', n: '↑↑' },
    example: 'TeO₂–ZnO–Na₂O (TZN); amplificadores ópticos dopados com Er³⁺.',
  },
  {
    id: 'Bi2O3', f: 'Bi₂O₃', cls: 'conditional', el: 'Bi', z: 3, cat: 2, ox: 3, def: 40, max: 80, cn: '3 ou 6', r: 1.03, sun: null, lam: null,
    color: '#9c4f6b', role: 'C', lp: true,
    how: 'Pirâmides BiO₃ (par isolado 6s²) e octaedros BiO₆. Não vitrifica sozinho em condições comuns, mas forma vidro com B₂O₃, SiO₂ ou GeO₂, mesmo em teores altíssimos de Bi₂O₃.',
    effect: 'Vidros de óxidos de metais pesados: densidade e índice de refração muito altos, transmissão estendida no infravermelho, baixa temperatura de fusão. Alternativa ao PbO.',
    props: { tg: '↓', alpha: '↑', dur: '≈', n: '↑↑' },
    example: 'Vidros Bi₂O₃–B₂O₃ de baixa fusão; fibras não lineares.',
  },
  {
    id: 'V2O5', f: 'V₂O₅', cls: 'conditional', el: 'V', z: 5, cat: 2, ox: 5, def: 40, max: 80, cn: '4–5', r: 0.355, sun: null, lam: null,
    color: '#7f8f2b', role: 'C',
    how: 'Unidades VO₄ e VO₅ com uma ligação curta V=O. Forma vidro com P₂O₅, TeO₂ ou modificadores; parte do vanádio fica como V⁴⁺.',
    effect: 'O salto de elétrons entre V⁴⁺ e V⁵⁺ torna esses vidros semicondutores (condução por "hopping" de pequenos polarons). Também é um óxido polivalente.',
    props: { tg: '↓', alpha: '↑', dur: '↓', n: '↑' },
    example: 'Vidros V₂O₅–P₂O₅ semicondutores; vidros de selagem de baixa temperatura.',
  },
  {
    id: 'MoO3', f: 'MoO₃', cls: 'conditional', el: 'Mo', z: 6, cat: 1, ox: 3, def: 30, max: 70, cn: '4 ou 6', r: 0.41, sun: null, lam: null,
    color: '#8a6f3a', role: 'C', nucleant: true,
    how: 'Octaedros MoO₆ no óxido puro (que viola a regra de coordenação baixa de Zachariasen); com modificadores ou P₂O₅, o Mo passa a tetraedros MoO₄²⁻ e octaedros ligados à rede. O Varshneya cita vidros com alto teor de MoO₃ fundidos com P₂O₅ ou óxidos básicos.',
    effect: 'Amplia a família de formadores para além das regras clássicas. Polivalente (Mo⁶⁺/Mo⁵⁺); também aparece como agente nucleante.',
    props: { tg: '↓', alpha: '↑', dur: '↓', n: '↑' },
    example: 'Vidros MoO₃–P₂O₅ e molibdatos alcalinos.',
  },
  {
    id: 'WO3', f: 'WO₃', cls: 'conditional', el: 'W', z: 6, cat: 1, ox: 3, def: 25, max: 60, cn: '4 ou 6', r: 0.42, sun: null, lam: null,
    color: '#6f6f8a', role: 'C', nucleant: true,
    how: 'Como o MoO₃: octaedros WO₆ que, com parceiros (P₂O₅, TeO₂, álcalis), se ligam à rede ou viram tetraedros WO₄²⁻.',
    effect: 'Aumenta o índice de refração e a estabilidade térmica de teluritos e fosfatos. Fotocromismo e eletrocromismo ligados ao par W⁶⁺/W⁵⁺.',
    props: { tg: '↑', alpha: '↓', dur: '↑', n: '↑' },
    example: 'Vidros TeO₂–WO₃ para fotônica; fosfatos de tungstênio.',
  },
  // ---------------- agentes nucleantes (metais coloidais) ----------------
  {
    id: 'Pt', f: 'Pt', cls: 'nucleant', el: 'Pt', z: 0, cat: 1, ox: 0, def: 0.05, max: 1, cn: '–', r: null, sun: null, lam: null,
    color: '#9aa4ad', role: 'X',
    how: 'Dissolvida no fundido, precipita como nanopartículas metálicas ao resfriar ou em um tratamento térmico. Não participa da rede.',
    effect: 'As partículas são substratos para nucleação heterogênea: reduzem o ângulo de contato e, com ele, a barreira de nucleação. Basta muito pouco (< 1 % molar).',
    props: { tg: '≈', alpha: '≈', dur: '≈', n: '≈' },
    example: 'Vitrocerâmicas de dissilicato de lítio nucleadas com P₂O₅ ou Pt.',
  },
  {
    id: 'Ag', f: 'Ag', cls: 'nucleant', el: 'Ag', z: 0, cat: 1, ox: 0, def: 0.05, max: 1, cn: '–', r: null, sun: null, lam: null,
    color: '#b9c2c9', role: 'X',
    how: 'Entra como Ag⁺ e, por redução (térmica ou fotoinduzida), forma aglomerados metálicos coloidais.',
    effect: 'Foi com partículas de prata que Stookey cristalizou um vidro de silicato de lítio, dando origem às vitrocerâmicas. Também gera cor amarela por ressonância de plasmon.',
    props: { tg: '≈', alpha: '≈', dur: '≈', n: '≈' },
    example: 'Vidros fotossensíveis e as primeiras vitrocerâmicas (Stookey, anos 1950).',
  },
  {
    id: 'Au', f: 'Au', cls: 'nucleant', el: 'Au', z: 0, cat: 1, ox: 0, def: 0.02, max: 0.5, cn: '–', r: null, sun: null, lam: null,
    color: '#d4a017', role: 'X',
    how: 'Dissolve-se em pequena quantidade; ao reaquecer ("striking"), precipita nanopartículas de ouro.',
    effect: 'Cor vermelho-rubi por ressonância de plasmon e núcleos para cristalização. É o exemplo clássico de cor por precipitação, citado no Varshneya.',
    props: { tg: '≈', alpha: '≈', dur: '≈', n: '≈' },
    example: 'Vidro rubi de ouro.',
  },
  // ---------------- polivalentes ----------------
  {
    id: 'Fe', f: 'Fe₂O₃/FeO', cls: 'polyvalent', el: 'Fe', z: 3, zr: 2, cat: 2, ox: 3, def: 2, max: 15, cn: 'Fe³⁺: 4 (5, 6) · Fe²⁺: 5–6', r: 0.49, rr: 0.78, sun: null, lam: 0.77, lamr: 1.0,
    color: '#a0522d', role: 'Fe', redox: { b: 0.54, ox: 'Fe³⁺', red: 'Fe²⁺' },
    how: 'O ferro existe como Fe³⁺ e Fe²⁺, em proporção fixada pela atmosfera e pela temperatura de fusão. O Fe³⁺ tende a formar tetraedros FeO₄⁻ compensados por um modificador, como o Al³⁺ (papel de intermediário). O Fe²⁺ fica em sítios de coordenação 5–6 e age como modificador, gerando NBOs.',
    effect: 'Reduzir o ferro (Fe³⁺ → Fe²⁺) despolimeriza a rede e diminui a viscosidade do fundido. Na cor: Fe²⁺ absorve no infravermelho próximo (azul), Fe³⁺ no UV e azul (amarelo); juntos dão o verde das garrafas. Fe³⁺ com S²⁻ dá o âmbar.',
    props: { tg: 'red ↓', alpha: '≈', dur: '≈', n: '↑' },
    example: 'Vidro verde de garrafa; vidros "extra clear" com pouquíssimo Fe²⁺ para painéis solares.',
  },
  {
    id: 'Eu', f: 'Eu₂O₃/EuO', cls: 'polyvalent', el: 'Eu', z: 3, zr: 2, cat: 2, ox: 3, def: 1, max: 5, cn: 'Eu³⁺: 6–8 · Eu²⁺: 7–9', r: 0.947, rr: 1.25, sun: null, lam: null,
    color: '#c2417a', role: 'Eu', redox: { b: 1.45, ox: 'Eu³⁺', red: 'Eu²⁺' },
    how: 'Terra-rara sempre modificadora, em sítios de alta coordenação, cercada preferencialmente por NBOs. O Eu³⁺ é menor e de maior força de campo que o Eu²⁺, e "puxa" mais NBOs para sua esfera de coordenação. A razão Eu²⁺/Eu³⁺ depende da atmosfera de fusão e da basicidade óptica da matriz.',
    effect: 'Pouco efeito na rede (teores de dopante), mas enorme efeito óptico: o Eu³⁺ emite linhas estreitas no vermelho (transições 4f–4f), e o Eu²⁺ emite uma banda larga no azul (transição 5d–4f), muito sensível à matriz. Controlar o redox é controlar a cor da luz emitida.',
    props: { tg: '≈', alpha: '≈', dur: '≈', n: '↑' },
    example: 'Vidros fosfato com Eu²⁺/Eu³⁺ para luz branca; fósforos de lâmpadas.',
  },
  {
    id: 'Ce', f: 'Ce₂O₃/CeO₂', cls: 'polyvalent', el: 'Ce', z: 3, zr: 4, cat: 1, ox: 1.5, def: 1, max: 5, cn: '7–8', r: 1.143, rr: 0.97, sun: null, lam: null,
    color: '#8d6e63', role: 'Ce', redox: { b: 0, ox: 'Ce⁴⁺', red: 'Ce³⁺', invert: true },
    how: 'Ce³⁺ e Ce⁴⁺ coexistem, ambos como modificadores de alta coordenação. Aqui o estado reduzido é o trivalente, e o oxidado, o tetravalente.',
    effect: 'O Ce⁴⁺ absorve fortemente no UV (protetor UV, descolorante químico ao oxidar o Fe²⁺). O Ce³⁺ tem emissão 5d–4f no UV/azul, usada em cintiladores. Também atua como "esponja" de oxigênio no redox do fundido.',
    props: { tg: '≈', alpha: '≈', dur: '≈', n: '↑' },
    example: 'Vidros de proteção UV e anti-escurecimento por radiação; cintiladores dopados com Ce³⁺.',
  },
  {
    id: 'Cu', f: 'CuO/Cu₂O', cls: 'polyvalent', el: 'Cu', z: 2, zr: 1, cat: 1, ox: 1, def: 1, max: 5, cn: 'Cu²⁺: 6 (Jahn–Teller) · Cu⁺: 2–4', r: 0.73, rr: 0.46, sun: null, lam: null,
    color: '#2f8f83', role: 'Cu', redox: { b: 0.77, ox: 'Cu²⁺', red: 'Cu⁺' },
    how: 'Cu²⁺ (octaedros distorcidos por efeito Jahn–Teller) e Cu⁺ (coordenação baixa, linear ou tetraédrica), ambos como modificadores. Em condições muito redutoras, pode chegar a Cu⁰ coloidal.',
    effect: 'Cu²⁺ dá cor azul-turquesa; Cu⁺ é incolor (d¹⁰). Fundido em atmosfera redutora e reaquecido, precipita Cu metálico: o vidro "rubi de cobre", exemplo de cor por precipitação citado no Varshneya.',
    props: { tg: '≈', alpha: '≈', dur: '≈', n: '↑' },
    example: 'Vidros azuis de cobre; rubi de cobre.',
  },
];

export const BY_ID = Object.fromEntries(OXIDES.map((o) => [o.id, o]));

// força de campo para exibição
export function fieldStrength(o, reduced = false) {
  if (o.r == null) return null;
  if (reduced && o.rr) return F(o.zr, o.rr);
  return F(o.z, o.r);
}
export const fieldStrengthOf = (z, r) => F(z, r);

// fração oxidada a partir de log fO2 (atmosfera): log(ox/red) = ¼·log fO2 + b  (n = 1 elétron; Handbook eq. 13.24)
export function oxFraction(o, logfO2) {
  const ratio = 10 ** (0.25 * logfO2 + o.redox.b);
  return ratio / (1 + ratio);
}
