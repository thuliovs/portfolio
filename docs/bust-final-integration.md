# Fase 4 — promoção do busto (acabamento em avaliação visual)

**Rotas:** `/` = busto com cinco expressões e novo fade;
`/?portrait=head-only` = versão anterior aprovada;
`/?portrait=variant-bust-test` = motor anterior do busto, **sem fade**.
A seleção acontece no servidor em `src/app/page.tsx`; o pequeno seletor
cliente `src/components/hero-ascii-variant-selector.tsx` usa importações
dinâmicas condicionais. Uma única engine/um único Canvas/um único loop por
rota. Um rollback da promoção requer somente mudar a opção padrão
`"bust"` para `"head-only"` em `PortraitSelection` no `page.tsx`;
**não** substituir nem editar o motor original. Para restaurar o busto
sem acabamento, a URL experimental já seleciona o snapshot anterior.

## Preservação

Antes de qualquer alteração, os hashes SHA-256 dos motores, mapas, LODs,
SVGs e scripts existentes foram registrados em
`/tmp/opencode/bust-phase4-integrity-before.sha256`. Ao final,
`sha256sum -c` passou para **todos** esses arquivos. Em particular:

- `src/components/hero-ascii-engine.tsx` (head-only): `d9bb26bb55ad5a834c3acd77252d8b32f4c4fdc3e7837e0dcdb3067df4a5e78c`;
- `src/components/hero-ascii-engine-variant-bust-test.tsx` e seu snapshot
  idêntico `hero-ascii-engine-bust-baseline.tsx`:
  `faa9fabd24bd64a4f9e4ff6e3854d78053c367e4b0561e89289c57688d01f2b6`.

Os mapas/LODs/SVGs de ambas as versões e todas as cinco fotografias
permanecem intocados. Para reproduzir os assets do busto quando necessário
(**não** foi executado nesta fase), consulte `bust-expressions-phase3.md`.
O novo motor `hero-ascii-engine-bust.tsx` compartilha os mapas do snapshot
do busto sem duplicá-los.

## Máscara espacial

Na função `spatialOpacity(x,y)` do **novo motor**, `x,y` são coordenadas
físicas do mesmo Canvas usadas por coarse, medium, fine e chuva. Uma máscara
alpha de baixa resolução é calculada somente em `resize` e aplicada via
`destination-in` aos caches **normais e iluminados** de cada expressão/LOD.
O Canvas de saída não recebe preenchimento opaco ou camada independente:
apenas os glifos perdem opacidade. A máscara preserva o fade direito
anterior (`portraitRightFade: .12`) e o fade central inferior original
(`bustBottomFade: .05` da viewport).

Parâmetros adicionais (frações, **não** redimensionamentos do retrato):

- `bustLeftShoulderFadeWidth: .22` da largura física do busto;
- `bustLeftShoulderFadeStart: .36`, `bustLeftShoulderFadeEnd: .16`:
  início/término da ativação vertical, medidos **acima** da borda visível;
- `bustBottomShoulderExtraFade: .10` da altura da viewport, acrescentado
  progressivamente nas bordas da camiseta (não no centro da gola).

O canto esquerdo inferior desaparece progressivamente; o fade lateral
**não** atinge o cabelo, rosto ou região alta do pescoço. A mesma função
modula a oclusão da chuva: onde a máscara reduz o retrato, a chuva torna
a aparecer proporcionalmente, sem faixa vazia. Os glifos em captura
aproximam-se da opacidade mascarada; partículas em dissolução recuperam
gradualmente a opacidade natural da chuva. Não há mudança no número,
posição, velocidade ou ciclo de vida das partículas. O fade se aplica
igualmente aos sweeps e aos cinco holds, inclusive reduced motion.
Escala facial 85%, lift ocular 16%, grade 216 × 180 / 108 × 90 / 54 × 45,
células 4,375 × 7,14 e altura do hero permanecem iguais.

## Evidências

Pasta exclusiva: `/tmp/opencode/bust-final-integration/`.

- `head-vs-bust-before-after.jpg`: head-only, busto pré-fade e busto
  pós-fade lado a lado, 1440 × 900, hold neutro, mesmo scroll/fase;
  a chuva varia naturalmente entre capturas.
- `before-bust-neutral-1440x900.png`, `after-bust-neutral-1440x900.png`;
  `after-bust-{thinking,angry,disgust,smile}-1440x900.png`;
  `after-dissolve-1440x900.png`, `after-rain-return-1440x900.png`;
  `after-head-only-neutral-1440x900.png`.
- `after-bust-neutral-{1366x768,1920x1080,1440x1100,3440x1440}.png`;
  `after-{tablet,mobile,reduced}.png` (reduced registrado **após** o
  Canvas sinalizar `asciiReady`).
- `bust-main-one-cycle.webm`: **46,4 s**, cobrindo ciclo de ~41,45 s
  mais início/fim da gravação.
- `before-validation.json`, `after-validation.json`, `interactions.json`,
  `network-splits.json`, `*-performance.json` e
  `performance-interleaved.json` (scripts locais de browser na mesma pasta).

Brave headless em servidor de produção, 1440 × 900, com
`PORTFOLIO_AUTH_ENABLED=false` **apenas no processo local de teste**.
As rotas principal, head-only e experimental montaram um motor cada.
Foram observados os cinco holds, dissolução, retorno à chuva, resize
com **1326 capturas preservadas**, pausa fora da viewport e retomada,
reduced motion e ausência de erros de console/página ou overflow nas
cinco viewports desktop mais tablet/mobile verificadas. A geometria
antes/depois foi idêntica:
olhos `(1219,76; 283,50)`, busto `(807,72; -187,74)`,
`891 × 1211,76 px`, gola Y=842,25 em 1440 × 900.
No ciclo final amostrado: **1311/1511** destinos coarse capturados,
**938/976** visíveis assentados; **1035** partículas em liberação no
retorno à chuva. O baseline independente teve **1315/1511** capturados
e **930/976** visíveis assentados. A variação é esperada com chuva
temporal real, não uma mudança da lógica de captura.

Em amostras **indicativas**, sem gravação/debug, `TaskDuration` do
Chromium em janelas de 12 s foi 7,98/7,99 s para o busto anterior e
8,62/8,76 s para o novo em alternância (cerca de **9%** a mais).
Outras duas amostras do novo variaram 7,83–9,27 s. Isso indica
**possível custo** da máscara/oclusão, não demonstra um benchmark
estatístico ou uma regressão conclusiva; revisar em hardware alvo após
avaliação visual. A rota head-only baixou chunks separados dos do busto;
nenhuma das variantes não selecionadas é montada, mas há módulos
compartilhados normais do Next.

`npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`
e a verificação de hashes passaram. O recorte superior do cabelo, algumas
lacunas de captura nos ombros/camiseta e as **1588 células coarse do smile
versus 1511 do neutral** continuam limitações já documentadas; não foram
mascaradas com novas partículas. O acabamento visual **ainda precisa da
aprovação do usuário**. Nenhum push ou deploy foi realizado.
