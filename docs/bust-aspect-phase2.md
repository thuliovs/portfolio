# Busto ASCII — fase 2 (integração experimental; não aprovado visualmente)

`/` permanece head-only (neutral → thinking → angry → disgust → smile).
`/?portrait=variant-bust-test` monta apenas o busto neutro, com motor, três
mapas LOD e SVG próprios. Nenhum arquivo da versão aprovada foi modificado.

## Fonte e reprodução

- PNG manual do GIMP: `~/Pictures/fotosperfil/Câmera/selecionadas/editadas/_DSC2311.png`;
  RGBA 3264 × 4928; recorte isotrópico `(-24, 513, 3288, 5017)`.
- O script estático `scripts/preview-bust-aspect.py` define a conversão tonal
  e a geometria; **não** usar `prepare-bust-variant.py`, rembg ou as fotos
  automáticas em `com-busto/`.
- A fonte exata aprovada `candidate-rows.json` da fase 1 foi preservada em
  `scripts/fixtures/bust-aspect-approved-rows.json`, permitindo reprodução
  sem `/tmp`. Nesta execução, o PNG original **não estava presente** no caminho
  indicado. Se voltar a estar disponível, `build-bust-variant.py` recomputa
  o mapa a partir do PNG e exige igualdade exata com a fixture, sem editá-lo.
- Execute `python scripts/build-bust-variant.py && node scripts/derive-bust-lods.mjs`.
  A primeira etapa escreve apenas o fine e SVG experimentais; a segunda
  aplica o mesmo limiar de ocupação e média tonal 2 × 2 / 4 × 4 do projeto.
  O fine gerado foi comparado, caractere a caractere, com o candidato aprovado.
- Fine **216 × 180**, medium **108 × 90**, coarse **54 × 45**; células fine
  físicas **4,375 × 7,14** (mapa **945 × 1285,2**); o SVG usa esse viewBox
  e `textLength`/`spacingAndGlyphs` para igualar o avanço horizontal no Canvas.
  O fade inferior não altera nenhuma das linhas fonte.

## Posição e sistemas independentes

- Olhos medidos no fine: colunas **74,288917** e **125,488917**; ponto médio
  **99,888917**, linha **70**. O alvo do ponto médio é o centro ocular do
  head-only: `referenceX + 80 × 4,375 × referenceScale`. O alvo vertical é
  `referenceY + 70 × 7,14 × referenceScale`, menos **16% da altura do viewport**.
  `portraitX/Y` subtraem a coluna/linha ocular *real* multiplicada pela
  célula fine escalada. Não se centraliza o retângulo do busto.
- Escala facial adotada: **85%** da escala head-only; uma única escala física
  nos eixos X e Y. Em 1440 × 900: `referenceScale = 1,109244`,
  `scale = 0,942857`, olhos no canvas `(1219,76; 283,50)`;
  retrato `(807,72; -187,74)` com **891 × 1211,76 px**.
  Em relação ao head-only, olho X sem deslocamento e olho Y **144 px acima**
  (`0,16 × 900`). Gola estimada em Y **842,25**;
  clipping do hero em **883,80**. Nos screenshots, a gola aparece, mas
  parte da camiseta permanece abaixo da borda.
- O rain grid continua a usar exclusivamente a referência head-only:
  **160 × 140 fine / 40 × 35 coarse**, com escala base, origem, intervalos,
  fluxos, densidade, velocidades, trails e timings originais. Em 1440 × 900,
  `rainX = 1009,75`, `rainY = 27,90`, passo `15,756 × 25,714 px`.
  A geometria do busto é separada (54 × 45 coarse); captura por coordenadas
  físicas da partícula, nunca pelo número da coluna emissora. Os flows usam
  intervalos normais também nas áreas físicas que cobrem os ombros.
- Caches e sweeps usam os mesmos retângulos físicos em coarse/medium/fine.
  Um fade inferior não destrutivo atua apenas nos glifos dos seis caches,
  nos últimos **5% da altura da viewport** até o clipping do hero.
  A sequência, a duração (~15,05 s), a chuva, o loop, a oclusão e a
  continuidade das partículas são mantidos.

## Evidências e limitações

Artefatos: `/tmp/opencode/bust-aspect-integration/`. Capturas comparáveis
`head-only-hold-1440x900.png`, `bust-hold-1440x900.png` e
`head-vs-bust-1440x900.png`; 1366 × 768, 1920 × 1080, 1440 × 1100, tablet,
mobile, reduced motion e 10 fases em `bust-*.png`. Um ciclo em
`bust-one-cycle.webm` (16,68 s com abertura/fecho de gravação).
`validation.json` contém posições de todas as células ausentes. A captura
preliminar `variant-first-1440x900.png` registra **90% / lift 12%**: face
maior, gola quase invisível; 85% / 16% mostra a gola, mas a face é menor e
mais alta. Escolher o compromisso visual definitivo depende do usuário.

Uma formação 1440 × 900 apresentou **1511** células coarse ocupadas,
**976** visíveis; ao terminar a formação, **1308** capturadas, **930**
visíveis ocupadas, **915** visíveis assentadas. Após assentamento,
**1315/1511** capturadas no total; **935/976** destinos visíveis assentados,
**41** ausentes visíveis, todos nos ombros/camiseta (linhas coarse ≥ 34),
nenhum no rosto, cabelo ou pescoço; os demais **155** ausentes ficam fora
da região visível nesta viewport. O hold fine apresenta o mapa completo,
mas isso **não corrige** as lacunas físicas da formação; a dissolução não
cria partículas nos 196 destinos nunca capturados. Na volta à chuva havia
**1067 partículas liberadas ainda caindo**, **248 recicladas**; o array de
partículas não é reiniciado. Captura incompleta nas regiões inferiores
visíveis é limitação para posterior refinamento, sem ajuste silencioso
de timings ou emissão. Chuva original visualmente preservada; face
proporcional, mas a parte superior do cabelo é cortada nos desktops e
o busto usa mais área vertical: ambos exigem avaliação visual.

Playwright em produção: sem erros de página/console nem overflow horizontal
nas seis viewports; um só motor por URL; reduced motion mostra o fine estático.
Em `resize-two-cycles.json`, resize durante a formação preservou as
**715** capturas existentes, o primeiro retorno à chuva manteve **1134**
partículas liberadas, o ciclo seguinte capturou novamente, e outro resize
durante o refinamento não produziu erros de página. Os números variam com
o andamento real da animação.
`npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check` passaram.
