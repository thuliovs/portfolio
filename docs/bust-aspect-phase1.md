# Busto ASCII — fase 1 (geometria estática aprovada)

**Este documento registra a geração estática anterior à integração.**
O candidato estático foi aprovado geometricamente; a integração experimental
do hero está documentada em [bust-aspect-phase2.md](bust-aspect-phase2.md).
`/` continua com o retrato head-only aprovado (cinco expressões).

## Diagnóstico medido

- PNG GIMP upright: 3264 × 4928; bbox real do alpha ≥ 128:
  `(0, 674, 3264, 4907)`. Os ombros chegam às bordas esquerda e direita.
- O recorte anterior herdado da cabeça era `(281, 513, 2734, 5019)`,
  **2453 × 4506**, proporção **0,5444**. Ele corta ambos os ombros. A etapa
  intermediária o forçava para **640 × 720** (proporção **0,8889**): 63% mais
  largo em termos relativos. A imagem final do mapa 160 × 180 em células
  4,375 × 7,14 tem proporção **0,5447**, então o redimensionamento final
  *reverte quase todo* esse squeeze geométrico; não há evidência de um
  `scaleY` exclusivo no Canvas ou CSS. Porém o filtro de contraste/desfoque
  trabalhava sobre a imagem temporariamente deformada, e o recorte estreito
  dos ombros + o enquadramento/clipping no hero tornam o busto visualmente
  tubular e comprido. Não seria correto atribuir todo o efeito a um stretch
  de CSS nem corrigi-lo achatando o resultado no browser.
- O Canvas anterior mede o próprio mapa 160 × 180 e usa a mesma escala
  física X/Y por célula. O preview anterior também redimensionava primeiro
  a foto para 640 × 720, depois a foto para 1280 × 2340. A geometria deve
  partir de um recorte mais amplo **antes** da amostragem tonal.

## Candidato estático aprovado, originalmente fora do hero

`python scripts/preview-bust-aspect.py` lê somente o PNG do GIMP, usa a
distância entre olhos para preservar o tamanho facial original e cria
216 × 180 células (216/160 vezes mais espaço horizontal para os ombros).
O recorte é `(-24, 513, 3288, 5017)`, **3312 × 4504** (inclui uma faixa
transparente mínima fora da foto). A grade física tem proporção
`216 × 4,375 / (180 × 7,14) = 0,735294`, contra `3312/4504 = 0,735346`
da foto: erro relativo de aproximadamente **0,007%**. Cada célula cobre
15,332 × 25,022 pixels originais, na mesma proporção das células ASCII.
A primeira redução intermediária é isotrópica, 3312 × 4504 →
864 × 1175 (proporção 0,7353), sem fit retangular forçado. No preview,
os caracteres são desenhados diretamente em fonte mono, sem redimensionar
o bitmap de glifos. A foto de comparação é reduzida com uma **única escala
uniforme**. Os olhos continuam na linha 70, separados por 51,2 células.

- [Foto recortada proporcional](/tmp/opencode/bust-aspect/foto-recortada-proporcional.png)
  ([PNG com transparência](/tmp/opencode/bust-aspect/foto-recortada-transparente.png))
- [ASCII estático proporcional](/tmp/opencode/bust-aspect/ascii-busto-estatico-proporcional.png)
- [Foto vs. ASCII](/tmp/opencode/bust-aspect/foto-vs-ascii.png)
- [Head-only aprovado vs. busto candidato](/tmp/opencode/bust-aspect/ascii-antigo-vs-busto.png)
- Métricas e candidato **não integrado**: `/tmp/opencode/bust-aspect/geometry.json`
  e `/tmp/opencode/bust-aspect/candidate-rows.json`.

O mapa foi integrado somente na variante experimental na fase 2; a avaliação
da composição e da animação ainda é necessária.
