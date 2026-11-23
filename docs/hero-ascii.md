# Hero ASCII

## Principal: busto com cinco expressões (fase 4; acabamento aguardando aprovação)

`/` monta apenas `hero-ascii-engine-bust.tsx`. Para ver a versão head-only
aprovada, use `/?portrait=head-only` (motor `hero-ascii-engine.tsx` **intacto**).
`/?portrait=variant-bust-test` continua a montar o motor experimental original,
preservado byte a byte; há ainda um snapshot idêntico em
`hero-ascii-engine-bust-baseline.tsx`. A escolha é feita no servidor, e
`hero-ascii-variant-selector.tsx` importa dinamicamente apenas a variante
selecionada no cliente. Nenhuma das três instâncias é montada em paralelo.

O fade espacial suaviza **somente os glifos** da região dos ombros e da
camiseta, sem modificar mapas, células, chuva, geometria ou timings. Detalhes,
parâmetros, comparação visual, vídeo e procedimento de reversão em
[bust-final-integration.md](bust-final-integration.md). **A aprovação dos
cinco mapas é definitiva; a aprovação visual do novo fade ainda não.**

## Registro histórico da fase 3: `variant-bust-test`

**Na fase 3**, `/` mantinha a versão head-only e as cinco expressões,
sem alterar seu motor nem seus assets. Acesse `/?portrait=variant-bust-test`
para ver **cinco expressões com busto** no motor experimental; cada URL monta
um único motor. A geometria/composição/animação do busto neutro foram
aprovadas visualmente depois da fase 2. A integração de cinco expressões
aguarda avaliação visual: veja [bust-expressions-phase3.md](bust-expressions-phase3.md)
e [bust-aspect-phase2.md](bust-aspect-phase2.md) para geometria e limitações.
O antigo
`scripts/prepare-bust-variant.py` e seus assets 160 × 180 são tentativas
históricas; **não** executá-lo para regenerar esta variante.

## D2 — five-expression sequence (head-only preserved)

Historically, the homepage mounted only `src/components/hero-ascii-engine.tsx`
by default. In phase 4, use `/?portrait=head-only` for this exact engine.
The fully functional, approved three-expression D engine was preserved
**before editing** at `src/components/hero-ascii-engine-d1.tsx`. To restore D,
change only the import in `src/app/page.tsx` from
`@/components/hero-ascii-engine` to
`@/components/hero-ascii-engine-d1`. Never mount both engines. The D1 snapshot
uses the same unmodified CSS, neutral/thinking/smile LOD files, SVG fallback,
and assets; C7 and all earlier snapshots remain available below.

The active `expressionSequence` is now **neutral → thinking → angry → disgust
→ smile**. The original fine maps are respectively `_DSC2311.JPG`,
`_DSC2350.JPG`, `_DSC2347.JPG`, `_DSC2352.JPG` and `_DSC2341.JPG`.
Their original SVGs and 160 × 140 fine TypeScript maps are unchanged. Only
`hero-portrait-lods-angry.ts` and `hero-portrait-lods-disgust.ts` were
generated from the existing fine maps with the same 2 × 2 / 4 × 4 tonal
reduction as D1/C7. Run
`node scripts/derive-expression-lods.mjs angry disgust` to generate *missing*
LODs only; the script now skips files that already exist and never processes
photos or replaces existing maps. No JPEGs are served publicly.

The original timeline builder adds two expression transitions without
duplicating rendering logic: each incoming expression replaces the previous
fine face with its own medium face **at the moving reverse sweep frontier**,
then refines that same face to fine. After the smile hold, only the smile
returns to medium, then coarse and releases into rain; the next cycle captures
neutral. Existing rain, capture, release, map-derived occlusion, glyph-only
specular illumination, and expression/LOD cache keys remain unchanged.
Default durations still live in the active component's `settings.timing`;
`expressionTiming` immediately below it optionally overrides individual
holds and *incoming* simplify/refine sweeps without changing their current
defaults. No rhythm calibration occurred. The current cycle is **41.45 s**.

All five source maps use 160 × 140 cells of 4.375 × 7.14, the same crop
method, measured eye centering and spacing, and the same canvas coordinates.
The existing ASCII previews were checked for eye/nose/mouth and silhouette
alignment; no geometric warping or facial edits were made. The slight
differences in silhouette and tonal distribution belong to the source
expressions. D1's known limitation at smile dissolution (more coarse smile
cells than physically captured neutral cells) remains unchanged.

D2 validation: Playwright captured `d2-{neutral,thinking,angry,disgust,smile}-fine.png`,
`d2-{thinking-angry,angry-disgust}-sweep.png`, medium checkpoints for angry
and disgust, smile destruction/release and the first return to rain, all
under `/tmp/opencode/`. `/tmp/opencode/d2-two-cycles.webm` (92.84 s) contains
two full **41.45 s** cycles and a partial third. `d2-validation.json`
records both returns to rain, including 874 released characters still
falling at the first return; both initial formations captured 946/953
neutral coarse cells. No page/console errors or horizontal overflow were
observed at 1440 × 900, tablet (768 × 1024), mobile (390 × 844), or
reduced motion. `/tmp/opencode/d2-interactions.json` verifies pause/resume
in anger and disgust, plus resize during the thinking-to-anger sweep. The
indicative headless Chromium CDP sample without recording/debug
(`d2-performance.json`) measured **3.11 s TaskDuration / 12.01 s wall time**;
D1's earlier 3.13 s / 12.01 s sample is not a controlled comparison.
`npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`
passed. `/tmp/opencode/d2-one-cycle.webm` (42 s) is the one-cycle viewing
cut, per the preferred video format; the two-cycle source remains available
for regression review.

## D — multi-expression portrait (preserved D1 baseline)

The D1 homepage mounted one `src/components/hero-ascii-engine.tsx`, with one
visible Canvas, one loop, and continuous rain particles. The **approved C7**
engine was copied unchanged to `src/components/hero-ascii-engine-c7.tsx`
before editing D. To restore it, change only the import in `src/app/page.tsx`
from `@/components/hero-ascii-engine` to
`@/components/hero-ascii-engine-c7`. Do not mount both engines. C7's styles,
neutral fine/medium/coarse maps, settings, and assets are shared and unchanged.
Its approved two-cycle reference is
`/tmp/opencode/c7-final-approved-two-cycles.webm`.

The `expressionSequence` at the top of the preserved D1 component defaults to
`["neutral", "thinking", "smile"]`. The fine maps correspond to
`_DSC2311.JPG`, `_DSC2350.JPG`, and `_DSC2341.JPG`; the unselected
`_DSC2347.JPG` (anger) and `_DSC2352.JPG` (grimace) remain untouched.
All fine maps are 160 × 140, share the same measured eye placement and crop
coordinates, and use the original 4.375 × 7.14 cell geometry. The photos
were not processed again. Thinking and smile medium (80 × 70) and coarse
(40 × 35) maps were derived from their existing fine maps with the *same*
occupancy threshold and tonal averaging as C7, by running
`node scripts/derive-expression-lods.mjs`. This writes only
`hero-portrait-lods-thinking.ts` and `hero-portrait-lods-smile.ts`; the
original neutral LOD file is never rewritten. For other expressions, add
their aligned fine maps and derived LODs to `portraits`, then edit the sequence.

The timeline is assembled from `expressionSequence`: rain → capture the first
expression at coarse → medium → fine → hold, then for each subsequent
expression a reverse fine-to-**next-expression medium** sweep, a forward
same-expression medium-to-fine sweep, and a hold. The last expression alone
simplifies fine → medium → coarse, releases its coarse glyphs, and returns to
rain. `settings.timing` retains C7's durations per step; the extra steps
lengthen the total cycle rather than speeding up the approved movements.
Changing the sequence does not require editing the rendering state machine.
The fallback and reduced-motion still remain neutral.

The existing diagonal projection, switch frontier, Gaussian illumination,
stroke lift, directions, and cached glyph compositing are retained. Each
sweep now selects a source expression and a destination expression alongside
its LOD; only the glyphs *behind* the passing frontier switch. During an
expression change the rain coverage selects the corresponding side's map at
the same frontier. Final release remaps already attached particles to the
last expression's coarse occupied cells after the reverse sweep; common cells
retain their positions, and the remaining particles move to the closest
available cells while concealed by the completed cached portrait. Released
glyphs come from that last coarse map; no particle array is reset. If a final
map has more occupied coarse cells than available captured particles, the
surplus cells hold and fade at their assigned dissolution times; they cannot
release as physical rain particles. This is a known consequence of preserving
the approved first-expression capture population without inventing particles.
The pre-existing `?asciiDebug=1` statistics now include expression and step
progress for visual inspection.

Phase D local baseline: `/tmp/opencode/d-c7-baseline.png`. Browser validation
captures include `d-neutral-fine.png`, `d-thinking-medium.png`,
`d-thinking-fine.png`, `d-smile-medium.png`, `d-smile-fine.png`,
`d-neutral-thinking-sweep.png`, `d-thinking-smile-sweep.png`,
`d-smile-destruct.png`, `d-rain-return.png`, plus `d-tablet.png`,
`d-mobile.png`, `d-reduced.png`, `d-viewport-1920x1080.png` and
`d-viewport-1024x768.png`. The 76.24-second Playwright recording
`/tmp/opencode/d-two-cycles.webm` includes two full ~28.25-second cycles
and part of a third. `/tmp/opencode/d-validation.json` records the two
complete transitions and subsequent captures (946/953 neutral cells per
cycle), with 864 released particles still falling at the second return
to rain. No page/console errors or overflow were found in the tested
desktop/tablet/mobile/reduced-motion contexts. `/tmp/opencode/d-interactions.json`
records working pause/resume in thinking and smile, plus a resize during the
neutral-to-thinking sweep. `/tmp/opencode/d-extra.json` verifies the keyboard
pause, offscreen/background-tab pause, and no overflow or console errors at
1920 × 1080 and 1024 × 768. `npm run lint`, `npm run typecheck`,
`npm run build` and `git diff --check` pass. Caches are keyed by expression
and LOD; the stable portrait uses one cached blit, while transitions render
only their existing two-level tiles. An indicative headless Chromium CDP
sample at 1440 × 900 (`/tmp/opencode/d-performance.json`, dev server,
no recording/debug) measured **3.13 s TaskDuration / 12.01 s wall time**;
C7's earlier 3.35 s / 12.21 s sample is not a controlled comparison.
Timing calibration and additional expression choices remain future work.

## C7 — cinematic finishing (preserved baseline)

The archived C7 engine is `src/components/hero-ascii-engine-c7.tsx`; the
homepage now mounts its D successor at `src/components/hero-ascii-engine.tsx`. C7 retains
the C6 particles, capture budget, continuous flows, timings, map-derived
occlusion and one visible Canvas/loop. Its finishing parameters live in the
C7 snapshot's `settings`:

- `zoom: 1.12` at widths ≥ 1400 px; 1.08 at 1101–1399 px. The portrait
  footprint and its capture destinations enlarge together. **Rain** has
  independent C6-sized `rainWidth`, `rainHeight`, `rainX`, `rainY` coordinates;
  its glyph size, initial spacing, emission cadence and velocity stay at C6
  scale. Capture searches the portrait column physically under each existing
  falling particle, rather than treating the rain column number as a portrait
  column. Resize transforms attached particles in portrait space and falling
  particles in rain space. No photographic or ASCII map regeneration occurs.
- `sweep`: `xWeight: .55`, `yWeight: .45`, `sigma: .025`,
  `support: .075`, `intensity: 1`, `start: -.09`, `end: 1.09`,
  `switchOffset: 0`. Both transition directions use the same projection in
  **visible portrait coordinates**, shared by all LODs. The resolution
  frontier is the sign of `(cellProjection - beamPosition)`; the independent
  luminous envelope is a compact Gaussian with a smooth cutoff. The source
  cache is `#dcdcde`, the bright cache `#f0f0f2`. Only portrait glyph pixels
  are lit; already transformed areas return to normal brightness. C6's
  `exp(-.5 * (distance/.115)^2) * .72` illuminated ~27% of the diagonal
  even at half peak; it also measured the offscreen map, not just the visible
  face. C7's half-peak width is ~5.9% of visible diagonal; tails end at
  ±7.5% (falloff keeps the perceivable band narrower). This is a subtle
  increase in width and peak brightness over the first C7 calibration.
  `sweepStrokeLift: .22` adds a second, low-opacity pass of the *same*
  `#f0f0f2` cached glyphs at the beam peak. This brightens antialiased
  strokes without changing the beam width, color, or resolution frontier.
- `rain.readingMinimum: .43`, `readingStart: .38`, `readingEnd: .65`:
  a continuous left-to-right intensity ramp across the visible hero, for
  **all heights**. C6's two local Y-shaped text masks and bottom quieting
  are removed from C7 only. The simulation's physical density is unchanged.
- `rain.horizontalFade: .055`, `topFade: .04`, `bottomFade: .07`:
  smooth opacity falloff on all four visible edges. Vertical fades are
  measured against the hero section's visible clipping boundary, rather than
  the canvas's extended overscan height. The actual stretched
  monospace glyph width is measured; heads/trails outside safe horizontal
  bounds are not drawn, but particles keep moving and release below canvas
  as before. No dark backing or CSS overlay is introduced.
- `portraitRightFade: .12` of the *visible* portrait width: an alpha ramp
  baked into both normal and illuminated LOD caches. Both stable blits and
  swept tiles share it; C6 map-derived rain culling and glyph-local
  destination-out remain unchanged. This fade is independent of rain edges.

The development-only `?asciiZoom=1`, `1.08`, `1.12`, or `1.15` overrides
the desktop zoom for visual comparisons at the same viewport and phase;
it does not alter production. `?asciiDebug=1` reports phase/capture counts.
The pause control remains in its original accessible position: moving it
below the headline would compete with the summary at short desktop heights.

**Restore C6:** Change the import in `src/app/page.tsx` from
`@/components/hero-ascii-engine` to
`@/components/hero-ascii-engine-c6`. The full pre-C7 C6 component,
settings, timings, rendering, and fallback are in that snapshot. C7 does
not change C6's shared `.hero-ascii-engine--lod` or `.hero-ascii-toggle--c4`
CSS. Mount exactly one engine. Earlier snapshots and their instructions
remain below.

### C7 local visual evidence

`/tmp/opencode/c7-c6-baseline-rain.png` and `c7-c6-baseline-sweep.png`
capture the unchanged C6 before editing; the original C6 recording is
`/tmp/opencode/c6-two-cycles.webm`. C7 screenshots, zoom comparisons,
validation JSON and recordings are stored under `/tmp/opencode/` (local,
not deployed). The C6 reference captures in the section below remain
available. At 1440 × 900, 12% gives a stronger close-up without encroaching
on the headline; 8% is more conservative, 15% crops too much at the top/bottom,
and 0% resembles C6. At 1366 × 768, use 8%.

Playwright produced `c7-zoom-{0,8,12,15}.png`,
`c7-sweep-{0,1,2,3,4}.png`, `c7-rain.png`, `c7-fine.png`,
`c7-two-cycles.webm` (~34.4 s), `c7-sweep.webm` and
`c7-sweep-slow.webm` (3× playback length, frame repetition rather than
newly synthesized frames). After the final overscan-edge adjustment, the
updated recordings are `c7-two-cycles-final.webm`,
`c7-sweep-final.webm`, and `c7-sweep-slow-final.webm`. During four
1440 × 900 close-up comparisons
the settled coarse counts were respectively 941, 946, 946 and 925 of
953: the shortfall is confined mostly to clipped upper hair cells;
the engine never invents replacement particles. A local headless Chromium
CDP sample of `TaskDuration` was **3.35 s / 12.21 s** at 1440 × 900
(development server, no video/debug instrumentation). C6's documented
sample was 3.804 s under similar conditions; these are indicative, not
a statistically controlled performance benchmark.
The final approved sweep brightness (`sweepStrokeLift: .22`) was recorded
separately at `/tmp/opencode/c7-final-approved-two-cycles.webm`
(~33.9 s, 1440 × 900, two full cycles). This is the most recent visual
recording; earlier C7 videos predate that last brightness adjustment.
`c7-validation.json` records browser checks at 1920 × 1080,
1440 × 900, 1366 × 768, 1440 × 1100, 1024 × 768, 768 × 1024,
and 390 × 844: no overflow or console/page errors, keyboard pause and
resume, and no reduced-motion errors. Separate interactive tests resized
during `form` and `refineFine`, and verified pause while offscreen or in a
simulated background tab. `c7-hold-{1366x768,1920x1080,1440x1100}.png`
shows the finished portrait across short, wide and tall desktop viewports.

The archived C6 homepage mounted `HeroAsciiEngine`
(`src/components/hero-ascii-engine.tsx`). One visible Canvas, one animation
loop and one physical portrait footprint produce this ~15.05-second cycle:

| State | Duration | Detail |
| --- | ---: | --- |
| Rain | 1.75 s | Persistent coarse-grid glyphs, including pre-existing falling particles |
| Form | 3.2 s | Existing falling glyphs reserve available cells ahead and slow into them |
| Refine to medium | 0.85 s | Broad specular glyph sweep (80 × 70) |
| Medium pause | 0.3 s | Cached medium portrait |
| Refine to fine | 0.85 s | Broad specular glyph sweep (160 × 140) |
| Hold | 5 s | Fine portrait; one cached canvas blit per frame |
| Simplify to medium | 0.75 s | Reverse diagonal sweep |
| Simplify to coarse | 0.75 s | Reverse diagonal sweep |
| Dissolve | 1.6 s | Coarse glyphs detach, accelerate downward and continue beyond the phase |

The three maps share the same crop and the 160 × 140 map's physical extent.
`scripts/derive-portrait-lods.mjs` averages approximate intensities in the
existing neutral ASCII characters into groups of 2 × 2 and 4 × 4; run it to
regenerate `src/components/hero-portrait-lods.ts`. This is an intentional
approximation of already-quantized tones, not a new photo segmentation.
The original fine map, all five portrait SVGs, the other expressions and
`scripts/prepare-ascii-portrait.py` are untouched. No photo tooling runs in
the browser or the web build.

The `settings` object near the top of the active component controls type
weight, DPR, FPS, portrait geometry/opacity, persistent rain spacing, emission
rate, speed distribution, trail intensity, quiet zone, population limit,
capture look-ahead/adjacent-column search/flight, release speed/acceleration,
sweep diagonal weights/width/falloff/brightness/start/end/switch point, and
the state durations. Coarse cells are 4× and medium cells 2× the original
glyph size.

**C6 compositing:** C5's `outerSpacing: 2.2` cut rain flux outside the 40
portrait columns, and its `behindPortrait` multiplier dimmed rain across
the portrait rectangle during refinement/hold. The global left-to-right
`reading` multiplier amplified the perceived right-side bias. C6 uses the
same emission and initial spacing in every column. Rain is reduced only in
the softly feathered *text reading zones* (headline and secondary copy),
not on the right or across the portrait footprint. No new construction
streams or particles are added when formation starts.

Rain glyphs that would land inside an *occupied ASCII cell* are omitted
while that cell is present; other rain glyphs continue normally, including
around the face. This is map-derived cell coverage, not a filled shape or
a rectangular mask. The rain is drawn first. Each portrait glyph then
removes rain **only beneath its own alpha pixels** with `destination-out`
and is painted over those pixels from the existing cached portrait map.
Negative space inside occupied cells stays empty, while space outside
the occupied cells keeps the original rain. No background color, dark
rectangle or solid silhouette is drawn. C6 uses a 0.9 base portrait
opacity after glyph-local occlusion instead of letting rain show through
the glyph strokes. This compositing is applied equally to coarse cells,
cached stable maps and swept tiles. All of it stays in the one visible Canvas.

For C6's specular sweep, each LOD also has a cached neutral-white version
of its own glyphs (`#f0f0f2`). A wider diagonal Gaussian band illuminates
the actual glyph pixels before the center reaches them, switches the
parent cell to its aligned 2 × 2 children near the light peak, and lets
the white-glyph contribution decay behind the beam. No full-Canvas white
overlay or flash exists. Reverse transitions run from lower right to
upper left. `settings.sweep.width`, `falloff`, `extraLight`, `start`, `end`,
`xWeight`, `yWeight` and `switchOffset` tune width, softness, brightness,
travel and resolution switch; the four sweep timings remain independent.

**C4 diagnosis:** its normal streams were rendered from a periodic clock;
its 953 construction glyphs were a separate `captures` array with preset
start and landing times, drawn even when no rain particle was passing there.
Local streams only became visible when `localEnergy` rose around formation.
Release was rendered by `paintCoarse` only during `dissolve` and the following
`rain`; at the next `form` transition that renderer stopped being called.
The positions were also derived from phase-local time, not persisted as
particles, so glyphs still on screen vanished together. Increasing the
dissolve duration would not fix that lifecycle error.

**C5:** every captured cell owns a reference to a particle that was already
falling (initially distributed across the viewport, subsequently emitted
above the canvas). Each frame has a finite retention budget spread across
formation; candidates must be falling in the same or an adjacent coarse
column, with a free nonblank cell ahead within the look-ahead distance.
The particle moves from its current coordinates to that cell and remains in
the pool. Density is independent of the animation phase. The 953-cell map
needs ~298 captures/s over 3.2 s; 40 portrait columns emit roughly
~360 glyphs/s at 10 coarse cells/s and 1.1-cell emission spacing, in addition
to initial glyphs already in motion. Supply includes the portrait columns
beyond the visible right edge: these streams are always running, not enabled
at formation time. The retention budget is front-loaded and completes ahead
of the refinement transition so the last glyphs have time to settle. These
figures describe *capacity*, not guaranteed matches in every runtime; the
optional `?asciiDebug=1` exposes counts and missing cell coordinates as
`data-ascii-stats` on the engine wrapper for local verification.

On dissolution, the settled particle starts at the exact coarse glyph
baseline, accelerates down and changes toward rain opacity. Its lifecycle is
independent of the global phase. It is removed only after its head and trail
cross below the canvas; the next cycle never clears the particle array.
On resize, positions and velocities are transformed into the new grid.
The diagonal sweep replaces one parent tile with its aligned 2×2 children
at the passing beam; a narrow Gaussian-like increase in glyph opacity
follows the same diagonal, with no solid overlay and no glow in empty cells.

The C3 map alignment remains intact: each tile subdivides into four at medium
and fine resolution. Each resize creates three cached normal portrait bitmaps
and three illuminated glyph bitmaps; steady fine frames use cached blits
instead of thousands of individual glyphs.
The `hero-ascii-engine--lod` CSS modifier extends the Canvas down the hero,
and `hero-ascii-toggle--c4` positions the accessible pause control beside the
lower-right reading area without covering the face. The height cap is raised
from 976 to 1040 px (as in C4): this increases the head by ~6.6% on tall desktops but
retains C3's safe size at 1440 × 900 and 1366 × 768, where growing it would
clip the hair/beard. Reduced motion displays a still fine portrait; tablets
show rain without the portrait; mobile omits the effect.

## C6 validation (local)

- Final two-cycle Playwright video: `/tmp/opencode/c6-two-cycles.webm`
  (~34 s, 1440 × 900). Screenshots in the same directory include
  `c6-rain.png`, `c6-capture.png`, `c6-coarse.png`,
  `c6-sweep-approach.png`, `c6-sweep-medium.png`, `c6-sweep-fine.png`,
  `c6-fine.png`, `c6-hold.png`, `c6-reverse.png`, `c6-release.png`,
  `c6-residual.png`, `c6-second-capture.png` and viewport/reduced-motion
  captures. `c6-observations.json` contains 80 time samples at ~400 ms.
- **953/953** coarse cells captured in each of two successive cycles.
  At 15.2 s, **883** released glyphs were still falling during `RAIN`;
  all first-cycle glyphs eventually left the canvas without a phase reset.
  The new rain culling is only visual: it does not delete or pause particles.
- Headless Chromium checked 1920 × 1080, 1440 × 900, 1366 × 768,
  1024 × 768, 768 × 1024 and 390 × 844: no horizontal overflow or
  page/console errors. Reduced motion has a static fine portrait.
  Keyboard pause/resume, resize during formation and refinement, scroll-out
  pause, and simulated background visibility pause/resume passed;
  results are in `/tmp/opencode/c6-interactions.json`.
- Chromium CDP `TaskDuration`: **3.804 s / 12.21 s**, 1440 × 900,
  headless, development server, no video/debug instrumentation. C5 measured
  2.63 s / 12.21 s using the same script and conditions. This is an
  indicative local comparison, not a production benchmark: uniform dense
  rain and the additional glyph compositing cost more main-thread time.
  The FPS/DPR limits, steady-portrait caches and offscreen pause remain.
- The C5 limitation still applies: interrupting formation with resize or
  pause can leave an isolated coarse cell uncaptured before the fixed-time
  refinement. The code never fabricates a replacement particle. Fine
  tuning the sweep intensity and the higher rendering cost on slower
  devices remain valid subjects for later artistic/performance review.

## C5 validation (local, 1440 × 900 unless stated)

- Two-cycle recording: `/tmp/opencode/c5-two-cycles.webm` (~34 s).
  Frame captures: `c5-rain.png`, `c5-capture.png`, `c5-coarse.png`,
  `c5-sweep-medium.png`, `c5-sweep-fine.png`, `c5-hold.png`,
  `c5-reverse.png`, `c5-release.png`, `c5-residual.png` and
  `c5-second-capture.png` in the same directory. `c5-observations.json`
  has 80 samples at ~400 ms intervals. These are local validation artifacts,
  not deploy assets.
- Both consecutive formations captured **953/953** real rain particles.
  At the first transition out of dissolve 426 released particles were still
  falling in `RAIN`; all 953 from that portrait eventually crossed the bottom
  and were recycled naturally. The second cycle likewise retained released
  particles after its transition. No phase-boundary array clear occurs.
- Headless Chromium screenshots tested 1920 × 1080, 1440 × 900,
  1366 × 768, 1024 × 768, 768 × 1024 and 390 × 844; no horizontal
  overflow or console/page errors. Reduced motion showed the still fine
  portrait. The keyboard-accessible pause/resume, resize during formation
  and refinement, scroll-out pause, and visibilitychange pause/resume passed
  the interaction checks in `/tmp/opencode/c5-interactions.json`.
- Chromium CDP `TaskDuration` was **2.63 s over 12.21 s**, headless,
  1440 × 900, development server, no recording/debug overlay. This is an
  indicative standalone C5 measurement; it is **not** an apples-to-apples
  benchmark against the prior C3/C4 samples. More rain glyphs do cost more
  main-thread time. The static cache, capped DPR, offscreen pause and
  30 FPS cap remain in place.
- The capture plan is deterministic in capacity and timing but still depends
  on the actual glyphs passing eligible cells. In an interrupted cycle (e.g.
  resize/pause during formation), a rare isolated cell can remain unfilled
  when the fixed-duration refinement begins; no particle is fabricated to
  cover it. This is a potential subject for further visual refinement.

## Restore an earlier version

The **C5 engine**, exactly as active before C6, is preserved in
`src/components/hero-ascii-engine-c5.tsx`. Import its `HeroAsciiEngine`
from `src/app/page.tsx` instead of `src/components/hero-ascii-engine.tsx`
to restore it. It uses the same untouched `.hero-ascii-engine--lod` and
`.hero-ascii-toggle--c4` CSS as C6; its settings and compositing code
  are part of its snapshot. C6 is now archived in
  `src/components/hero-ascii-engine-c6.tsx`; C7 is active in
  `src/components/hero-ascii-engine.tsx`. Never mount both versions together.

The **original C4 engine** is preserved in
`src/components/hero-ascii-engine-c4.tsx`, including its settings and timing.
Import `HeroAsciiEngine` from that file in `src/app/page.tsx` to restore C4.
The `.hero-ascii-engine--lod` and `.hero-ascii-toggle--c4` styles used by C4
remain intact. Only one engine should be mounted at a time.

The **approved C3 engine** is preserved without internal changes in
`src/components/hero-ascii-engine-multiresolution.tsx`. Import its
`HeroAsciiEngine` from `src/app/page.tsx` instead of the active one to restore
the C3 rain, timing, scale, wave-based coarse formation and dissolution. Its
`.hero-ascii-engine--lod` and `.hero-ascii-toggle--lod` CSS remain in
`src/app/globals.css`; the C4-only button modifier is not used by C3.

The preceding **single-resolution C2 engine is preserved without internal
changes** in `src/components/hero-ascii-engine-single-resolution.tsx`. To
compare it, import its `HeroAsciiEngine` in `src/app/page.tsx` instead of the
current one. Its `.hero-ascii-engine`, `.hero-ascii-fallback` and
`.hero-ascii-toggle` styles remain in `src/app/globals.css`; C2 does not use
the `--lod` modifiers. Never mount multiple versions together.

The original five-layer animation remains **unchanged** in
`src/components/hero-text-rain.tsx`, including its `.hero-rain` and
`.hero-rain-canvas` styles in `src/app/globals.css`. To use it again, import
`HeroTextRain` into a page and mount `<HeroTextRain />` inside a positioned
container such as `.hero-heading-stage`; do not mount it at the same time as
the unified engine. Its original 20–40 px glyph sizes, trails, speeds and
opacities are preserved. `HeroAsciiPortrait` and all five generated maps/SVGs
also remain available for experiments and fallbacks; only the neutral map is
loaded by the homepage.
