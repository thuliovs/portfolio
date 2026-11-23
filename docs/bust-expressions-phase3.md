# Busto ASCII — fase 3: cinco expressões na variante experimental

`/?portrait=variant-bust-test` alterna **neutral → thinking → angry →
disgust → smile**; `/` continua a montar a engine head-only intacta.
Somente a variante experimental importa os novos mapas. A composição,
escala 85%, levantamento ocular 16% da viewport, grade de chuva independente,
timings, sweeps, captura e dissolução aprovados para o busto neutro não
foram modificados.

## Fonte e geração

As cinco fontes definitivas, **somente leitura**, estão em
`~/Pictures/fotosperfil/Câmera/selecionadas/editadas/com-busto/`:
`_DSC2311.png`, `_DSC2350.png`, `_DSC2347.png`, `_DSC2352.png`,
`_DSC2341.png`. O neutro aprovado, sua fixture, LODs e SVG permanecem
intactos. Os quatro novos fine são gerados com **a mesma função**
`glyph_map` de `scripts/preview-bust-aspect.py` (Pillow + NumPy), inclusive
ramp, gamma, filtro local e alpha. Nenhuma correção tonal por expressão.
O script primeiro exige que o PNG neutro reproduza a fixture exatamente.

```bash
python scripts/build-bust-expressions.py
node scripts/derive-bust-lods.mjs
python scripts/preview-bust-expressions.py
```

A geração guarda as medidas em
`scripts/fixtures/bust-expression-alignment.json`; não depende de `/tmp`.
Medição inicial: MediaPipe Face Landmarker float16/1 sobre PNGs reduzidos
uniformemente a 816 × 1232; coordenadas dos cantos externos dos olhos
(landmarks 33 e 263), não das pupilas, e ponte do nariz (168) foram
registradas em pixels originais em `build-bust-expressions.py`. Não é
necessário instalar esse detector para reproduzir os mapas. A geometria
de saída é a do neutro: recorte `(-24, 513, 3288, 5017)`, 216 × 180
fine; 108 × 90 medium; 54 × 45 coarse; célula fine 4,375 × 7,14.
As quatro fotos passam por **escala uniforme e translação ocular** antes
do mesmo recorte. Nenhuma foto original é alterada, não há escala XY
independente, rotação, correção de pupilas, warping ou IA generativa.
Rotação ficou em zero porque o ângulo aparente dos olhos varia com
expressões e cabeça e uma correção forçada inclinaria os ombros.

| Expressão | Escala uniforme | Deslocamento do centro dos olhos na foto, px (X,Y) | Erro na ponte após alinhamento, px |
| --- | ---: | ---: | ---: |
| neutral | 1 | (0, 0) | 0 |
| thinking | 1,00832 | (-194,25; +257,75) | 22,41 |
| angry | 1,00542 | (+10,05; +122,50) | 14,94 |
| disgust | 0,93346 | (-77,60; +121,35) | 17,85 |
| smile | 0,96374 | (+38,45; +92,75) | 25,76 |

**Nota:** deslocamento é medido no centro entre os cantos externos dos
olhos *antes* da escala; a transformação real é
`neutroCentroOlhos + escala × (pixelFonte - centroOlhosFonte)`. O erro
remanescente na ponte corresponde a < 1,7 célula fine horizontal / ~1
célula vertical, não a deslocamento das pupilas da expressão thinking.
Contornos de cabelo, ombros e gola não são forçados a coincidir; mudam
naturalmente entre as fotografias.

## Assets e ocupação

Os quatro novos arquivos `src/components/hero-portrait-rows-variant-bust-{thinking,angry,disgust,smile}.ts`
e seus pares `hero-portrait-lods-variant-bust-{...}.ts` ficam separados dos
arquivos neutros e de todos os mapas head-only. O downsampling tonal/
ocupacional é a **mesma função** do `scripts/derive-bust-lods.mjs`;
o script verifica o arquivo neutro, sem sobrescrevê-lo. SVGs de cada
expressão em `public/portraits/variant-bust-{...}-ascii.svg` usam
945 × 1285,2, `textLength` e `spacingAndGlyphs` da variante aprovada.
O fallback renderizado quando há reduced motion permanece o **SVG neutro
aprovado**, sem substituição.

| Expressão | fine ocupado | medium ocupado | coarse ocupado |
| --- | ---: | ---: | ---: |
| neutral | 23345 | 5952 | 1511 |
| thinking | 23084 | 5877 | 1491 |
| angry | 25581 | 6503 | 1648 |
| disgust | 24106 | 6142 | 1593 |
| smile | 24396 | 6217 | 1588 |

## Validação e limites

`/tmp/opencode/bust-expressions-phase3/` contém
`five-expressions.jpg`, `five-expressions-static.gif`, cinco previews
`<expressão>-fine.png`, `<expressão>-photo-vs-ascii.jpg`,
`<expressão>-lods.jpg`, quatro `alignment-neutral-vs-*.jpg`,
screenshots reais `hero-*-hold.png`, `hero-dissolve.png`,
`occupied-cells.json` e `browser-validation.json`.

Browser local Brave, 1440 × 900, com `PORTFOLIO_AUTH_ENABLED=false`
**somente no processo de teste**: `/` montou um motor e o fallback original;
`/?portrait=variant-bust-test&asciiDebug=1` montou um motor e o fallback
neutro proporcional. Capturou cinco holds, dissolução e retorno à chuva,
sem erros de console/página ou overflow horizontal. A geometria reportada
pelo Canvas da variante (olhos 1219,76/283,50; gola Y=842,25) coincide
com a da fase 2, portanto o enquadramento neutro não foi deslocado.
`npm run lint`, `npm run typecheck`, `npm run build` e `git diff --check`
passaram.

Limitações visíveis: o cabelo no topo continua cortado nas capturas
1440 × 900 como na variante neutra aprovada; o tom da camiseta e o
contorno dos ombros diferem nas fotografias, em particular angry,
sem normalização independente. Num ciclo de teste foram capturadas
1338/1511 células coarse neutras (955/976 destinos visíveis assentados);
essa limitação já existia na fase 2 e não foi mascarada com partículas
inventadas. Smile ocupa 1588 células coarse, **77 a mais** que neutral;
nem todas podem corresponder a partículas capturadas ao dissolver.
O motor mantém os pixels de retrato completos nos caches e solta somente
as partículas reais. A qualidade perceptiva das transições e das
diferenças tonais depende de aprovação visual antes de promover a variante.
