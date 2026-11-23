# Vidros & Luminescência

Site didático e interativo sobre ciência do vidro e luminescência em vidros, com simulações físicas rodando no navegador, cenas 3D e animações com controles de vídeo. O projeto é dividido em partes: a capa (`index.html`) lista todas elas, e cada parte fica na sua própria pasta.

| Parte | Pasta | Estado |
|---|---|---|
| 1. Fundamentos do vidro | `parte-1-fundamentos/` | publicada |
| 2. Luminescência em vidros | `parte-2-luminescencia/` | em preparação |

**Parte 1: Fundamentos do vidro**

1. **O que é vidro.** Linha do tempo das definições (Zachariasen, Tammann, Morey, ASTM, Zarzycki, Varshneya, Gupta, Shelby) até a de Zanotto e Mauro (2017), com a definição anotada termo a termo. Rede 2D de Zachariasen com desordem ajustável e g(r) calculada ao vivo.
2. **Sólido, líquido, líquido super-resfriado e vidro.** Número de Deborah sobre o tempo de relaxação de um vidro sodo-cálcico (modelo MYEGA), os quatro estados da vitrificação, dinâmica molecular 2D (Lennard-Jones) comparando um sistema monoatômico e uma mistura binária, e um clipe do "destino final".
3. **Diagrama V–T / H–T e Tg.** Simulador com o modelo de relaxação Tool–Narayanaswamy–Moynihan e cristalização por curva TTT: taxa de resfriamento, Tg dependente da taxa, temperatura fictícia, recozimento, overshoot no DSC, devitrificação e extrapolação de Kauzmann.
4. **Famílias de vidros.** Modelos 3D esquemáticos (óxido, metálico, fluoreto, calcogeneto), tabela de propriedades, janelas de transparência e energias de fônon.
5. **Vidro × outros amorfos × polímeros.** Viga aquecida sob carga com curvas de módulo e DSC (vidro de óxido, polímero amorfo, reticulado, semicristalino e a-Si), gráfico de Angell e diferenças menos triviais.

Cada capítulo traz um texto técnico seguido de uma versão simplificada, com analogias.

## Como rodar

Publicado em: https://vinileo2015-droid.github.io/vidros_luminescentes_fundamentos/

O site é estático (HTML, CSS e módulos ES), sem etapa de build e sem dependência de CDN: Three.js e d3-delaunay estão em `vendor/`.

Como os módulos ES não carregam via `file://`, sirva a pasta com qualquer servidor local:

```bash
python3 -m http.server 8000
# abra http://localhost:8000 (capa) ou http://localhost:8000/parte-1-fundamentos/
```

## Publicar no GitHub Pages

1. Crie o repositório e envie estes arquivos para a branch `main`.
2. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O site fica em `https://vinileo2015-droid.github.io/vidros_luminescentes_fundamentos/`.

O arquivo `.nojekyll` evita que o GitHub Pages processe o site com Jekyll.

## Estrutura

```
index.html              capa do projeto, com a lista de partes
parte-1-fundamentos/
  index.html            conteúdo e estrutura dos capítulos da Parte 1
css/style.css           tema (claro/escuro), layout e componentes (compartilhado)
js/main.js              carrega cada módulo quando ele se aproxima da tela
js/lib/
  ui.js                 canvas em alta resolução, cores do tema, eixos
  clip.js               "clipes": animações com play/pausa, barra de tempo e legendas
  md-engine.js          dinâmica molecular 2D (Lennard-Jones, células, termostato)
  tnm-engine.js         relaxação estrutural TNM + cristalização (TTT, Avrami)
  visc.js               viscosidade pelo modelo MYEGA
js/sections/            um módulo por figura interativa
vendor/                 three.module.js, OrbitControls, RoomEnvironment, d3-delaunay
assets/                 favicon
```

Para adicionar uma figura nova: crie `js/sections/minha-figura.js` exportando `init(root)`, registre-a em `loaders` no `js/main.js` e marque o contêiner no HTML com `data-module="minha-figura"`. O `main.js` é compartilhado: cada página só carrega os módulos das figuras que ela contém.

## Como adicionar uma nova parte

1. Crie a pasta `parte-N-nome/` com um `index.html` baseado no da Parte 1 (os caminhos para `../css`, `../js` e `../assets` já estão prontos).
2. Mantenha o padrão de cada capítulo: texto técnico, figura(s) interativa(s) e o bloco "Em poucas palavras", com analogias.
3. Coloque as figuras novas em `js/sections/` e registre-as no `js/main.js`.
4. Na capa (`index.html`), troque o cartão "em preparação" da parte por um link, e acrescente a parte na barra de navegação.
5. Atualize a tabela de partes deste README.

## Sobre os modelos

As simulações são didáticas. Os números de propriedades são típicos de literatura, e o simulador H–T usa um material-modelo (Tm = 1100 K, Tg ≈ 750 K a ~10 K/min), não uma composição real. As estruturas 3D são geradas proceduralmente e são esquemáticas, não estruturas refinadas.

## Próximas partes

- Parte 2: luminescência em vidros (terras-raras, níveis de energia, fônons, eficiência quântica)
- Parte 3: …

## Referência principal

Zanotto, E. D.; Mauro, J. C. The glassy state of matter: its definition and ultimate fate. *J. Non-Cryst. Solids* 471, 490–495 (2017). doi:10.1016/j.jnoncrysol.2017.05.019

A lista completa de referências está no final da página.
