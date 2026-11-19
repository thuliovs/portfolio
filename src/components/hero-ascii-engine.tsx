"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { coarsePortraitRows, mediumPortraitRows } from "./hero-portrait-lods";
import { portraitCell, portraitRows } from "./hero-portrait-rows";
import { portraitRows as thinkingRows } from "./hero-portrait-rows-dsc2350";
import { portraitRows as angryRows } from "./hero-portrait-rows-dsc2347";
import { portraitRows as disgustRows } from "./hero-portrait-rows-dsc2352";
import { portraitRows as smileRows } from "./hero-portrait-rows-dsc2341";
import { coarsePortraitRows as thinkingCoarse, mediumPortraitRows as thinkingMedium } from "./hero-portrait-lods-thinking";
import { coarsePortraitRows as angryCoarse, mediumPortraitRows as angryMedium } from "./hero-portrait-lods-angry";
import { coarsePortraitRows as disgustCoarse, mediumPortraitRows as disgustMedium } from "./hero-portrait-lods-disgust";
import { coarsePortraitRows as smileCoarse, mediumPortraitRows as smileMedium } from "./hero-portrait-lods-smile";

const portraits = {
  neutral: [coarsePortraitRows, mediumPortraitRows, portraitRows],
  thinking: [thinkingCoarse, thinkingMedium, thinkingRows],
  angry: [angryCoarse, angryMedium, angryRows],
  disgust: [disgustCoarse, disgustMedium, disgustRows],
  smile: [smileCoarse, smileMedium, smileRows],
} as const;
type Expression = keyof typeof portraits;
type LOD = 0 | 1 | 2;
// Reorder, add or remove entries here. Coarse is used only at the endpoints.
const expressionSequence: readonly Expression[] =
  ["neutral", "thinking", "angry", "disgust", "smile"];
const firstExpression = expressionSequence[0];
const lastExpression = expressionSequence[expressionSequence.length - 1];
const glyphs = " .:-=+*#%@";
const settings = {
  fontWeight: 500,
  maxDpr: 2,
  fps: 30,
  portraitHeight: 1040,
  edgeOffset: 200,
  portraitOpacity: 0.9,
  // A second glyph-only pass strengthens antialiased strokes at the beam peak.
  sweepStrokeLift: 0.22,
  // The rain grid remains at C6 scale; only the portrait footprint grows.
  zoom: 1.12,
  portraitRightFade: 0.12,
  rain: {
    // Persistent flux, not a phase-dependent construction layer.
    spacingCells: 2.7,
    emissionCells: 1.1,
    speedMin: 7.5,
    speedMax: 13.5,
    opacity: 0.34,
    readingMinimum: 0.43,
    readingStart: 0.38,
    readingEnd: 0.65,
    horizontalFade: 0.055,
    topFade: 0.04,
    bottomFade: 0.07,
    trailOpacity: 0.23,
    maxParticles: 5500,
  },
  capture: {
    lookAheadCells: 7,
    adjacentColumns: 1,
    flightMin: 260,
    flightMax: 470,
    releaseSpeed: 1.2,
    releaseAcceleration: 9,
  },
  sweep: {
    xWeight: 0.55,
    yWeight: 0.45,
    sigma: 0.025,
    support: 0.075,
    intensity: 1,
    start: -0.09,
    end: 1.09,
    switchOffset: 0,
  },
  timing: {
    rain: 1750,
    form: 3200,
    refineMedium: 850,
    mediumPause: 300,
    refineFine: 850,
    hold: 5000,
    simplifyMedium: 750,
    simplifyCoarse: 750,
    dissolve: 1600,
  },
} as const;

// Optional per-expression timing overrides for a later rhythm calibration.
// Defaults above remain unchanged; simplifyMedium/refineFine refer to the
// sweep *entering* the named expression.
const expressionTiming: Partial<Record<Expression, {
  hold?: number;
  simplifyMedium?: number;
  refineFine?: number;
}>> = {};

type State = keyof typeof settings.timing | "expressionMedium" | "expressionFine";
type Step = {
  state: State;
  duration: number;
  expression: Expression;
  from?: Expression;
  parent?: 0 | 1;
  reverse?: boolean;
};
type Level = {
  rows: string[];
  columns: number;
  count: number;
  width: number;
  height: number;
  cache: HTMLCanvasElement;
  litCache: HTMLCanvasElement;
};
type Particle = {
  col: number;
  x: number;
  y: number; // glyph baseline in canvas coordinates
  speed: number; // pixels / second
  opacity: number;
  glyph: string;
  trail: boolean;
  releaseGlyph: string;
  mode: "falling" | "capturing" | "settled" | "releasing";
  target: number;
  fromX: number;
  fromY: number;
  start: number;
  flight: number;
  vx: number;
};
type Flow = { col: number; next: number; interval: number; sequence: number };

const timeline: Step[] = [
  { state: "rain", duration: settings.timing.rain, expression: firstExpression },
  { state: "form", duration: settings.timing.form, expression: firstExpression },
  { state: "refineMedium", duration: settings.timing.refineMedium, expression: firstExpression, parent: 0 },
  { state: "mediumPause", duration: settings.timing.mediumPause, expression: firstExpression },
  { state: "refineFine", duration: settings.timing.refineFine, expression: firstExpression, parent: 1 },
];
for (let i = 0; i < expressionSequence.length; i++) {
  const expression = expressionSequence[i];
  timeline.push({ state: "hold", duration: expressionTiming[expression]?.hold ??
    settings.timing.hold, expression });
  const next = expressionSequence[i + 1];
  if (next) {
    timeline.push(
      { state: "expressionMedium", duration: expressionTiming[next]?.simplifyMedium ??
        settings.timing.simplifyMedium,
        from: expression, expression: next, parent: 1, reverse: true },
      { state: "expressionFine", duration: expressionTiming[next]?.refineFine ??
        settings.timing.refineFine,
        expression: next, parent: 1 },
    );
  }
}
timeline.push(
  { state: "simplifyMedium", duration: settings.timing.simplifyMedium,
    expression: lastExpression, parent: 1, reverse: true },
  { state: "simplifyCoarse", duration: settings.timing.simplifyCoarse,
    expression: lastExpression, parent: 0, reverse: true },
  { state: "dissolve", duration: settings.timing.dissolve, expression: lastExpression },
);
const cycle = timeline.reduce((sum, step) => sum + step.duration, 0);
const formStart = settings.timing.rain;
const dissolveStart = cycle - settings.timing.dissolve;
const columns = portraits[firstExpression][0][0].length;
const rows = portraits[firstExpression][0].length;
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const cellIndex = (col: number, row: number) => row * columns + col;
const targets = portraits[firstExpression][0].flatMap((line, row) =>
  [...line].flatMap((glyph, col) => glyph === " " ? [] : [cellIndex(col, row)]));
const finalTargets = portraits[lastExpression][0].flatMap((line, row) =>
  [...line].flatMap((glyph, col) => glyph === " " ? [] : [cellIndex(col, row)]));
// Keep the complete control available for future reactivation without leaving
// an invisible or keyboard-focusable element in the current interface.
const showAnimationToggle = false;
// Coverage is derived from the existing aligned maps, not a solid silhouette.
// It allows rain glyphs (larger than fine glyphs) to be omitted only where
// they would visually run through occupied portrait cells.
const coverage = Object.fromEntries(Object.entries(portraits).map(([expression, maps]) =>
  [expression, maps.map((lines, level) => {
  const factor = 2 ** level;
  return Array.from({ length: columns * rows }, (_, index) => {
    const col = index % columns * factor;
    const row = Math.floor(index / columns) * factor;
    for (let dy = 0; dy < factor; dy++) {
      for (let dx = 0; dx < factor; dx++) {
        if (lines[row + dy][col + dx] !== " ") return true;
      }
    }
    return false;
   });
  })])) as Record<Expression, boolean[][]>;

function phaseAt(time: number): { step: Step; progress: number } {
  let position = time % cycle;
  for (const step of timeline) {
    if (position < step.duration) return { step, progress: position / step.duration };
    position -= step.duration;
  }
  return { step: timeline[0], progress: 0 };
}

export function HeroAsciiEngine() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!wrapper || !canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");
    const debug = new URLSearchParams(window.location.search).has("asciiDebug");
    const zoomPreview = process.env.NODE_ENV === "development"
      ? Number(new URLSearchParams(window.location.search).get("asciiZoom"))
      : NaN;
    let frame = 0;
    let visible = false;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let portraitX = 0;
    let portraitY = 0;
    let portraitWidth = 0;
    let portraitHeight = 0;
    let cellWidth = 0;
    let cellHeight = 0;
    let rainX = 0;
    let rainY = 0;
    let rainWidth = 0;
    let rainHeight = 0;
    let visibleLeft = 0;
    let visibleRight = 0;
    let visibleTop = 0;
    let visibleBottom = 0;
    let compositionTop = 0;
    let compositionBottom = 0;
    let rainStretch = 1;
    let dpr = 1;
    let levels = {} as Record<Expression, Level[]>;
    let flows: Flow[] = [];
    let particles: Particle[] = [];
    const occupied: (Particle | undefined)[] = new Array(columns * rows);
    let portraitEnabled = false;
    let elapsed = 0;
    let lastTick = 0;
    let previousCycle = 0;
    let captured = 0;
    let offscreen = 0;
    let recycled = 0;
    let scanOffset = 0;

    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
    };

    const newParticle = (col: number, y: number, sequence: number): Particle => {
      const x = rainX + col * rainWidth;
      return {
        col, x, y,
        speed: rainHeight * (settings.rain.speedMin +
          hash(col * 17 + sequence, 48) *
          (settings.rain.speedMax - settings.rain.speedMin)),
        opacity: settings.rain.opacity *
          (0.63 + hash(col * 31 + sequence, 87) * 0.58),
        glyph: glyphs[2 + Math.floor(hash(col * 13 + sequence, 71) * 8)],
        trail: hash(col * 23 + sequence, 93) < 0.58,
        releaseGlyph: "",
        mode: "falling", target: -1, fromX: x, fromY: y,
        start: 0, flight: 0, vx: 0,
      };
    };

    const resize = () => {
      const bounds = wrapper.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const oldX = rainX;
      const oldY = rainY;
      const oldWidth = rainWidth;
      const oldHeight = rainHeight;
      const oldPortraitX = portraitX;
      const oldPortraitY = portraitY;
      const oldPortraitWidth = cellWidth;
      const oldPortraitHeight = cellHeight;
      viewportWidth = bounds.width;
      viewportHeight = bounds.height;
      const heroBounds = wrapper.closest(".hero-section")?.getBoundingClientRect();
      const compositionBounds = wrapper.closest(".hero")?.getBoundingClientRect();
      visibleLeft = Math.max(0, -bounds.left);
      visibleRight = Math.min(viewportWidth, window.innerWidth - bounds.left);
      visibleTop = Math.max(0, (heroBounds?.top ?? bounds.top) - bounds.top);
      visibleBottom = Math.min(viewportHeight,
        (heroBounds?.bottom ?? bounds.bottom) - bounds.top);
      compositionTop = Math.max(0,
        (compositionBounds?.top ?? bounds.top) - bounds.top);
      compositionBottom = Math.min(viewportHeight,
        (compositionBounds?.bottom ?? bounds.bottom) - bounds.top);
      dpr = Math.min(window.devicePixelRatio || 1, settings.maxDpr);
      canvas.width = Math.max(1, Math.round(viewportWidth * dpr));
      canvas.height = Math.max(1, Math.round(viewportHeight * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textAlign = "left";
      context.textBaseline = "alphabetic";

      portraitEnabled = window.innerWidth > 1100;
      const baseScale = Math.min(window.innerHeight, settings.portraitHeight) /
        (portraitRows.length * portraitCell.height);
      const responsiveZoom = window.innerWidth < 1400 ? 1.08 :
        [1, 1.08, 1.12, 1.15].includes(zoomPreview) ? zoomPreview : settings.zoom;
      const scale = baseScale * responsiveZoom;
      portraitWidth = portraitRows[0].length * portraitCell.width * scale;
      portraitHeight = portraitRows.length * portraitCell.height * scale;
      portraitX = window.innerWidth - bounds.left +
        Math.min(settings.edgeOffset, window.innerWidth * 0.14) - portraitWidth;
      portraitY = (compositionTop + compositionBottom - portraitHeight) / 2;
      cellWidth = portraitWidth / columns;
      cellHeight = portraitHeight / rows;
      rainWidth = portraitRows[0].length * portraitCell.width * baseScale / columns;
      rainHeight = portraitRows.length * portraitCell.height * baseScale / rows;
      // Preserve C6's rain grid origin: neither glyph size nor flux changes
      // when the portrait footprint zooms toward the left.
      rainX = window.innerWidth - bounds.left +
        Math.min(settings.edgeOffset, window.innerWidth * 0.14) -
        portraitRows[0].length * portraitCell.width * baseScale;
      rainY = (compositionTop + compositionBottom -
        portraitRows.length * portraitCell.height * baseScale) / 2;
      levels = {} as Record<Expression, Level[]>;
      if (portraitEnabled) {
        for (const expression of new Set<Expression>(["neutral", ...expressionSequence])) {
         levels[expression] = [];
         for (const [index, lines] of portraits[expression].entries()) {
          const count = lines.length;
          const width = portraitWidth / lines[0].length;
          const height = portraitHeight / count;
          const cache = document.createElement("canvas");
          cache.width = Math.round(portraitWidth * dpr);
          cache.height = Math.round(portraitHeight * dpr);
          const paint = cache.getContext("2d");
          const litCache = document.createElement("canvas");
          litCache.width = cache.width;
          litCache.height = cache.height;
          const light = litCache.getContext("2d");
          if (!paint || !light) continue;
          paint.font = `${settings.fontWeight} ${height}px monospace`;
          paint.textBaseline = "alphabetic";
          light.font = paint.font;
          light.textBaseline = paint.textBaseline;
          const stretch = dpr * width / paint.measureText("M").width;
          paint.setTransform(stretch, 0, 0, dpr, 0, 0);
          light.setTransform(stretch, 0, 0, dpr, 0, 0);
          paint.fillStyle = "#dcdcde";
          light.fillStyle = "#f0f0f2";
           for (let row = 0; row < count; row++) {
            if (!lines[row].trim()) continue;
            paint.fillText(lines[row], 0, (row + 1) * height);
            light.fillText(lines[row], 0, (row + 1) * height);
           }
           // Fade the *visible* right edge, not the offscreen map boundary.
           const visiblePortraitRight = Math.min(visibleRight, portraitX + portraitWidth);
           const fadeWidth = (visiblePortraitRight - Math.max(visibleLeft, portraitX)) *
             settings.portraitRightFade;
           for (const target of [paint, light]) {
             target.setTransform(1, 0, 0, 1, 0, 0);
             target.globalCompositeOperation = "destination-in";
             const fade = target.createLinearGradient(
               (visiblePortraitRight - portraitX - fadeWidth) * dpr, 0,
               (visiblePortraitRight - portraitX) * dpr, 0);
             fade.addColorStop(0, "#fff");
             fade.addColorStop(1, "#0000");
             target.fillStyle = fade;
             target.fillRect(0, 0, cache.width, cache.height);
             target.globalCompositeOperation = "source-over";
           }
           levels[expression][index] = {
             rows: lines, columns: lines[0].length, count, width, height, cache, litCache,
           };
         }
        }
      }
      context.font = `${settings.fontWeight} ${rainHeight}px monospace`;
      rainStretch = rainWidth / context.measureText("M").width;

      // Transform existing trajectories instead of resetting the rain on resize.
      if (oldWidth && oldHeight) {
        for (const particle of particles) {
          const attached = particle.mode === "capturing" ||
            particle.mode === "settled";
          particle.x = (attached ? portraitX : rainX) +
            (particle.x - (attached ? oldPortraitX : oldX)) *
            (attached ? cellWidth / oldPortraitWidth : rainWidth / oldWidth);
          particle.y = (attached ? portraitY : rainY) +
            (particle.y - (attached ? oldPortraitY : oldY)) *
            (attached ? cellHeight / oldPortraitHeight : rainHeight / oldHeight);
          particle.fromX = rainX + (particle.fromX - oldX) * rainWidth / oldWidth;
          particle.fromY = rainY + (particle.fromY - oldY) * rainHeight / oldHeight;
          particle.speed *= rainHeight / oldHeight;
          particle.vx *= rainWidth / oldWidth;
        }
      }
      const first = Math.floor(-rainX / rainWidth) - 1;
      // Keep the full portrait footprint supplied by the same continuous
      // rain, including columns clipped by the viewport's right edge.
      const last = portraitEnabled
        ? Math.max(columns - 1, Math.ceil((viewportWidth - rainX) / rainWidth) + 1)
        : Math.ceil((viewportWidth - rainX) / rainWidth) + 1;
      const existing = new Map(flows.map((flow) => [flow.col, flow]));
      flows = [];
      for (let col = first; col <= last; col++) {
        const prior = existing.get(col);
        const interval = settings.rain.emissionCells * rainHeight /
          (rainHeight * (settings.rain.speedMin +
            hash(col, 18) * (settings.rain.speedMax - settings.rain.speedMin))) * 1000;
        flows.push(prior ?? { col, next: elapsed + hash(col, 39) * interval,
          interval, sequence: 0 });
        if (!oldWidth || !prior) {
            const count = Math.ceil(viewportHeight /
              (rainHeight * settings.rain.spacingCells));
          for (let i = 0; i < count; i++) {
            const y = (i + hash(col, i + 57) * 0.55) *
              rainHeight * settings.rain.spacingCells;
            particles.push(newParticle(col, y, i));
          }
        }
      }
      // Drop only rain outside the new horizontal footprint; settled/released
      // glyphs retain their identity and their original trajectory.
      particles = particles.filter((particle) =>
        particle.mode !== "falling" ||
        (portraitEnabled && particle.x >= portraitX - rainWidth &&
          particle.x <= portraitX + portraitWidth + rainWidth) ||
        (particle.x >= -rainWidth && particle.x <= viewportWidth + rainWidth));
    };

    // Cut only the exact antialiased glyph pixels out of the rain. The
    // underlying hero background then shows through unchanged; no portrait
    // rectangle, silhouette or dark backing is drawn.
    const blit = (item: Level, sx: number, sy: number, sw: number, sh: number,
      dx: number, dy: number, dw: number, dh: number, glow = 0, opacity = 1) => {
      context.globalCompositeOperation = "destination-out";
      context.globalAlpha = opacity;
      context.drawImage(item.cache, sx, sy, sw, sh, dx, dy, dw, dh);
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = settings.portraitOpacity * opacity;
      context.drawImage(item.cache, sx, sy, sw, sh, dx, dy, dw, dh);
      if (glow > 0.015) {
        context.globalAlpha = glow;
        context.drawImage(item.litCache, sx, sy, sw, sh, dx, dy, dw, dh);
        context.globalAlpha = glow * settings.sweepStrokeLift;
        context.drawImage(item.litCache, sx, sy, sw, sh, dx, dy, dw, dh);
      }
    };

    const paintWhole = (expression: Expression, level: LOD) => {
      const item = levels[expression][level];
      blit(item, 0, 0, item.cache.width, item.cache.height,
        portraitX, portraitY, portraitWidth, portraitHeight);
    };

    const paintTile = (expression: Expression, level: LOD, col: number, row: number,
      glow = 0, opacity = 1) => {
      const item = levels[expression][level];
      if (item.rows[row]?.[col] === " ") return;
      blit(item, col * item.width * dpr, row * item.height * dpr,
        item.width * dpr, item.height * dpr,
        portraitX + col * item.width, portraitY + row * item.height,
         item.width, item.height, glow, opacity);
    };

    // The same physical parent tile maps to four children. Only glyphs
    // inside the moving diagonal gain light; empty spaces are never painted.
    const paintSweep = (step: Step, progress: number) => {
      const parent = step.parent!;
      const reverse = step.reverse ?? false;
      const source = step.from ?? step.expression;
      const destination = step.expression;
      const large = levels[source][parent];
      const beam = reverse
        ? settings.sweep.end - (settings.sweep.end - settings.sweep.start) * progress
        : settings.sweep.start + (settings.sweep.end - settings.sweep.start) * progress;
      const left = Math.max(visibleLeft, portraitX);
      const right = Math.min(visibleRight, portraitX + portraitWidth);
      const top = Math.max(0, portraitY);
      const bottom = Math.min(viewportHeight, portraitY + portraitHeight);
      const positionAt = (col: number, row: number) =>
        settings.sweep.xWeight *
          (portraitX + (col + 0.5) * large.width - left) / (right - left) +
        settings.sweep.yWeight *
          (portraitY + (row + 0.5) * large.height - top) / (bottom - top);
      const detailAt = (distance: number) =>
        reverse ? distance < settings.sweep.switchOffset
          : distance <= settings.sweep.switchOffset;
      // Switch at the frontier; light is a separate, compact envelope.
      const glowAt = (distance: number) =>
        Math.abs(distance) >= settings.sweep.support ? 0 :
          Math.exp(-0.5 * (distance / settings.sweep.sigma) ** 2) *
          settings.sweep.intensity *
          (1 - ease((Math.abs(distance) - settings.sweep.sigma) /
            (settings.sweep.support - settings.sweep.sigma)));
      for (let row = 0; row < large.count; row++) {
        if (portraitY + (row + 1) * large.height < 0 ||
            portraitY + row * large.height > viewportHeight) continue;
        for (let col = 0; col < large.columns;) {
          const distance = positionAt(col, row) - beam;
           const transformed = reverse ? !detailAt(distance) : detailAt(distance);
           const level = (reverse ? transformed ? parent : parent + 1
             : transformed ? parent + 1 : parent) as LOD;
           const expression = transformed ? destination : source;
          const glow = glowAt(distance);
          if (glow <= 0.01) {
            // Stable adjacent cells become a single cached blit, rather than
            // thousands of individual glyph draws at fine resolution.
            let end = col + 1;
            while (end < large.columns) {
              const next = positionAt(end, row) - beam;
              if (glowAt(next) > 0.01 ||
                   (reverse ? !detailAt(next) : detailAt(next)) !== transformed) break;
              end++;
            }
             const item = levels[expression][level];
            blit(item, col * large.width * dpr, row * large.height * dpr,
              (end - col) * large.width * dpr, large.height * dpr,
              portraitX + col * large.width, portraitY + row * large.height,
              (end - col) * large.width, large.height);
            // Source pixels have the same physical footprint at every LOD.
            col = end;
            continue;
          }
          if (level === parent) {
             paintTile(expression, parent, col, row, glow);
           } else {
             for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
               paintTile(expression, (parent + 1) as LOD, col * 2 + dx, row * 2 + dy, glow);
            }
          }
          col++;
        }
      }
    };

    const release = (particle: Particle, time: number) => {
      if (particle.target >= 0) {
        particle.releaseGlyph = portraits[lastExpression][0][Math.floor(particle.target / columns)]
          [particle.target % columns];
        occupied[particle.target] = undefined;
      }
      particle.mode = "releasing";
      particle.target = -1;
      particle.start = time;
      particle.fromY = particle.y;
      particle.vx = (hash(particle.col, Math.floor(time / 37)) - 0.5) * cellWidth * 0.46;
      particle.speed = cellHeight * settings.capture.releaseSpeed;
    };

    // At the end of the last coarse sweep, transfer the attached rain particles
    // to the final expression's coarse cells. Exact overlaps stay put; remaining
    // particles fill nearest available destinations while hidden behind the
    // cached portrait. No particles are manufactured or reset.
    const alignRelease = (time: number) => {
      if (firstExpression === lastExpression) return;
      const settled = particles.filter((particle) => particle.mode === "settled");
      const available = new Set(finalTargets);
      for (const particle of settled) {
        if (available.has(particle.target)) available.delete(particle.target);
        else {
          occupied[particle.target] = undefined;
          particle.target = -1;
        }
      }
      const remaining = [...available];
      for (const particle of settled) {
        if (particle.target !== -1) continue;
        if (!remaining.length) { release(particle, time); continue; }
        let best = 0;
        let distance = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const index = remaining[i];
          const dx = index % columns - (particle.x - portraitX) / cellWidth;
          const dy = Math.floor(index / columns) -
            (particle.y - portraitY) / cellHeight + 1;
          const score = dx * dx + dy * dy;
          if (score < distance) { distance = score; best = i; }
        }
        const index = remaining.splice(best, 1)[0];
        particle.target = index;
        particle.x = portraitX + index % columns * cellWidth;
        particle.y = portraitY + (Math.floor(index / columns) + 1) * cellHeight;
        occupied[index] = particle;
      }
    };

    // A falling particle can reserve only a real, unoccupied coarse cell
    // ahead of its current position. It is never created at that destination.
    const reserve = (particle: Particle, time: number) => {
      const nearRow = Math.max(0, Math.ceil((particle.y - portraitY) / cellHeight) - 1);
      const nearCol = Math.floor((particle.x - portraitX) / cellWidth);
      let best = -1;
      let score = Infinity;
      for (let row = nearRow; row <= Math.min(rows - 1,
        nearRow + settings.capture.lookAheadCells); row++) {
        for (let dx = -settings.capture.adjacentColumns;
          dx <= settings.capture.adjacentColumns; dx++) {
          const col = nearCol + dx;
           if (col < 0 || col >= columns || portraits[firstExpression][0][row][col] === " ") continue;
          const index = cellIndex(col, row);
          if (occupied[index]) continue;
          const destinationY = portraitY + (row + 1) * cellHeight;
          if (destinationY < particle.y + cellHeight * 0.15) continue;
          const candidate = (destinationY - particle.y) / cellHeight +
            Math.abs(dx) * 2.2 + hash(col + particle.col, row) * 0.35;
          if (candidate < score) { score = candidate; best = index; }
        }
      }
      if (best < 0) return false;
      particle.mode = "capturing";
      particle.target = best;
      particle.fromX = particle.x;
      particle.fromY = particle.y;
      particle.start = time;
      particle.flight = settings.capture.flightMin +
        hash(particle.col + best, Math.floor(time / 71)) *
        (settings.capture.flightMax - settings.capture.flightMin);
      occupied[best] = particle;
      captured++;
      return true;
    };

    const update = (dt: number, time: number) => {
      const cycleNumber = Math.floor(time / cycle);
      if (cycleNumber !== previousCycle) {
        // No particle arrays are reset at the phase boundary. Anything still
        // attached is released; already falling particles simply keep falling.
        for (const particle of particles) {
          if (particle.mode === "settled") release(particle, time);
        }
        previousCycle = cycleNumber;
        captured = 0;
      }
      for (const flow of flows) {
        while (flow.next <= time && particles.length < settings.rain.maxParticles) {
          particles.push(newParticle(flow.col, -rainHeight *
            (0.2 + hash(flow.col, flow.sequence) * 0.7), ++flow.sequence));
          flow.next += flow.interval;
        }
        if (flow.next < time - 1000) flow.next = time + flow.interval;
      }
      const position = time % cycle;
      if (portraitEnabled && position >= dissolveStart &&
          position - dt < dissolveStart) alignRelease(time);
      const forming = portraitEnabled && position >= formStart &&
        position < formStart + settings.timing.form;
      // The finite budget spreads retention over the whole formation, while
      // eligibility remains determined by actual rain trajectories.
      let budget = forming
        ? Math.max(0, Math.floor(targets.length *
          clamp((position - formStart) /
            (settings.timing.form - settings.capture.flightMax - 80)) ** 0.78) - captured)
        : 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        if (particle.mode === "falling") {
          particle.y += particle.speed * dt / 1000;
        } else if (particle.mode === "capturing") {
          const progress = clamp((time - particle.start) / particle.flight);
          const destinationX = portraitX + (particle.target % columns) * cellWidth;
          const destinationY = portraitY +
            (Math.floor(particle.target / columns) + 1) * cellHeight;
          // Decelerate into place, keeping the source glyph visible throughout.
          const approach = 1 - (1 - progress) ** 2;
          particle.x = particle.fromX + (destinationX - particle.fromX) * approach;
          particle.y = particle.fromY + (destinationY - particle.fromY) * approach;
          if (progress === 1) particle.mode = "settled";
        } else if (particle.mode === "releasing") {
          const age = (time - particle.start) / 1000;
          particle.y += (particle.speed +
            cellHeight * settings.capture.releaseAcceleration * age) * dt / 1000;
          particle.x += particle.vx * dt / 1000;
        }
        if ((particle.mode === "falling" || particle.mode === "releasing") &&
            particle.y - rainHeight * 1.5 > viewportHeight) {
          if (particle.mode === "releasing") recycled++;
          offscreen++;
          particles.splice(i, 1);
        }
      }
      if (budget > 0) {
        scanOffset = (scanOffset + 137) % Math.max(1, particles.length);
        for (let n = 0; n < particles.length && budget > 0; n++) {
          const particle = particles[(n + scanOffset) % particles.length];
          if (particle.mode === "falling" &&
              particle.x >= portraitX - cellWidth &&
              particle.x < portraitX + portraitWidth + cellWidth &&
              reserve(particle, time)) budget--;
        }
      }
      if (portraitEnabled && position >= dissolveStart) {
        const progress = (position - dissolveStart) / settings.timing.dissolve;
        for (const particle of particles) {
          if (particle.mode !== "settled") continue;
          const col = particle.target % columns;
          const row = Math.floor(particle.target / columns);
          const order = row / rows * 0.45 + hash(col, row) * 0.55;
          if (progress >= 0.06 + order * 0.86) release(particle, time);
        }
      }
      if (debug) {
        const missingColumns = Array.from({ length: columns }, (_, col) =>
           portraits[phaseAt(time).step.state === "dissolve" ? lastExpression : firstExpression][0]
             .reduce((count, line, row) =>
             count + (line[col] !== " " && !occupied[cellIndex(col, row)] ? 1 : 0), 0));
         const phase = phaseAt(time);
         wrapper.dataset.asciiStats = JSON.stringify({
           phase: phase.step.state, expression: phase.step.expression,
           progress: phase.progress,
          falling: particles.filter((p) => p.mode === "falling").length,
          capturing: particles.filter((p) => p.mode === "capturing").length,
          settled: particles.filter((p) => p.mode === "settled").length,
          releasing: particles.filter((p) => p.mode === "releasing").length,
          captured, targets: targets.length, offscreen, recycled, missingColumns,
          missingTargets: targets.filter((index) => !occupied[index]).map((index) =>
            [index % columns, Math.floor(index / columns)]),
        });
      }
    };

    const paintRain = (time: number) => {
      const { step, progress } = phaseAt(time);
      const { state, expression } = step;
      const covered = (x: number, y: number) => {
        const col = Math.floor((x - portraitX) / cellWidth);
        if (!portraitEnabled || col < 0 || col >= columns || state === "rain") return false;
        const row = Math.floor((y - portraitY) / cellHeight);
        if (row < 0 || row >= rows) return false;
        const index = cellIndex(col, row);
        if (state === "form" || state === "dissolve")
          return occupied[index]?.mode === "settled";
        if (step.parent !== undefined) {
          const parent = step.parent;
          const source = step.from ?? expression;
          if (source === expression)
            return coverage[expression][parent][index] ||
              coverage[expression][parent + 1][index];
          // The rain mask uses the same moving frontier as the portrait.
          // Only the currently visible side's glyph coverage occludes rain.
          const large = levels[source]?.[parent];
          if (!large) return false;
          const left = Math.max(visibleLeft, portraitX);
          const right = Math.min(visibleRight, portraitX + portraitWidth);
          const top = Math.max(0, portraitY);
          const bottom = Math.min(viewportHeight, portraitY + portraitHeight);
          const projection = settings.sweep.xWeight * (x - left) / (right - left) +
            settings.sweep.yWeight * (y - top) / (bottom - top);
          const beam = settings.sweep.end -
            (settings.sweep.end - settings.sweep.start) * progress;
          // Cross-expression transitions simplify from fine to medium.
          return projection > beam
            ? coverage[expression][parent][index]
            : coverage[source][parent + 1][index];
        }
        return coverage[expression][state === "mediumPause" ? 1 : 2][index];
      };
      context.save();
      context.scale(rainStretch, 1);
      context.font = `${settings.fontWeight} ${rainHeight}px monospace`;
      context.fillStyle = "#bebec0";
      const span = visibleRight - visibleLeft;
      const safeGlyphWidth = rainStretch * Math.max(
        ...[...glyphs].map((glyph) => context.measureText(glyph).width));
      for (const particle of particles) {
        if (particle.mode === "settled") continue;
        if (particle.x < visibleLeft || particle.x + safeGlyphWidth > visibleRight ||
            particle.y < -rainHeight || particle.y > viewportHeight + rainHeight) continue;
        const normalizedX = (particle.x + safeGlyphWidth / 2 - visibleLeft) / span;
        const reading = settings.rain.readingMinimum +
          (1 - settings.rain.readingMinimum) *
          ease((normalizedX - settings.rain.readingStart) /
            (settings.rain.readingEnd - settings.rain.readingStart));
        const edges = ease(normalizedX / settings.rain.horizontalFade) *
          ease((1 - normalizedX) / settings.rain.horizontalFade) *
          ease((particle.y - rainHeight / 2 - visibleTop) /
            ((visibleBottom - visibleTop) * settings.rain.topFade)) *
          ease((visibleBottom - particle.y) /
            ((visibleBottom - visibleTop) * settings.rain.bottomFade));
        const flight = particle.mode === "capturing"
          ? ease((time - particle.start) / particle.flight) : 0;
        const releaseAge = particle.mode === "releasing"
          ? ease((time - particle.start) / 550) : 1;
        const targetGlyph = particle.target >= 0
          ? portraits[firstExpression][0][Math.floor(particle.target / columns)]
            [particle.target % columns] : particle.glyph;
        const symbol = particle.mode === "capturing" && flight > 0.58
          ? targetGlyph : particle.mode === "releasing" && releaseAge < 0.8
            ? particle.releaseGlyph : particle.glyph;
        const alpha = particle.mode === "capturing"
          ? particle.opacity * (1 - flight) + settings.portraitOpacity * flight
          : particle.mode === "releasing"
            ? settings.portraitOpacity * (1 - releaseAge) +
              particle.opacity * releaseAge
            : particle.opacity;
        const visualAlpha = alpha * reading * edges;
        // Trails follow the same particle; they are never extra glyphs
        // assigned to portrait cells.
        if ((particle.trail || particle.mode === "releasing") &&
            particle.mode !== "capturing" &&
            (particle.mode !== "falling" ||
              !covered(particle.x, particle.y - rainHeight * 0.95))) {
          context.globalAlpha = visualAlpha * settings.rain.trailOpacity;
          context.fillText(symbol, particle.x / rainStretch,
            particle.y - rainHeight * 0.95);
        }
        if (particle.mode !== "falling" || !covered(particle.x, particle.y)) {
          context.globalAlpha = visualAlpha;
          context.fillText(symbol, particle.x / rainStretch, particle.y);
        }
      }
      context.restore();
    };

    const draw = (time: number, still = false) => {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      if (!portraitEnabled && still) {
        wrapper.dataset.asciiReady = "true";
        return;
      }
      const { step, progress } = still
        ? { step: { state: "hold", expression: "neutral" } as Step, progress: 0 }
        : phaseAt(time);
      const { state, expression } = step;
      if (!still) paintRain(time);
      if (portraitEnabled) {
         if (state === "form" || state === "dissolve") {
           for (const index of state === "form" ? targets : finalTargets) {
             if (occupied[index]?.mode !== "settled") {
               if (state !== "dissolve") continue;
               // A final expression can contain more coarse cells than the
               // first captured from rain. Keep those few cells until their
               // scheduled dissolution rather than exposing a sudden hole.
               const col = index % columns;
               const row = Math.floor(index / columns);
               const order = row / rows * 0.45 + hash(col, row) * 0.55;
               const fade = 1 - ease((progress - (0.06 + order * 0.86)) / 0.08);
               if (fade <= 0) continue;
               paintTile(expression, 0, col, row, 0, fade);
               continue;
             }
             paintTile(expression, 0, index % columns, Math.floor(index / columns));
           }
         } else if (step.parent !== undefined) paintSweep(step, progress);
         else if (state === "mediumPause") paintWhole(expression, 1);
         else if (state === "hold") paintWhole(expression, 2);
      }
      context.globalAlpha = 1;
      wrapper.dataset.asciiReady = "true";
    };

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (!lastTick) lastTick = now;
      const delta = Math.min(now - lastTick, 100);
      if (delta < 1000 / settings.fps) return;
      lastTick = now;
      elapsed += delta;
      update(delta, elapsed);
      draw(elapsed);
    };
    const sync = () => {
      stop();
      if (!visible || document.hidden || !viewportWidth) return;
      if (mobile.matches) wrapper.dataset.asciiReady = "true";
      else if (reducedMotion.matches) draw(0, true);
      else if (pausedRef.current) draw(elapsed);
      else frame = window.requestAnimationFrame(tick);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const observer = new ResizeObserver(() => {
      resize();
      sync();
    });
    observer.observe(wrapper);
    intersection.observe(wrapper);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    mobile.addEventListener("change", sync);
    window.addEventListener("ascii-animation-toggle", sync);
    window.addEventListener("resize", resize);
    resize();
    sync();
    return () => {
      stop();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
      mobile.removeEventListener("change", sync);
      window.removeEventListener("ascii-animation-toggle", sync);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="hero-ascii-engine hero-ascii-engine--lod" ref={wrapperRef}
        aria-hidden="true">
        <canvas ref={canvasRef} />
        <Image className="hero-ascii-fallback" src="/portraits/neutral-ascii.svg"
          alt="" width={700} height={1000} unoptimized loading="eager" />
      </div>
      {showAnimationToggle ? (
        <button className="hero-ascii-toggle hero-ascii-toggle--lod hero-ascii-toggle--c4"
          type="button"
          aria-label={paused ? "Resume ASCII animation" : "Pause ASCII animation"}
          aria-pressed={paused}
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
            window.dispatchEvent(new Event("ascii-animation-toggle"));
          }}>
          {paused ? "Play animation" : "Pause animation"}
        </button>
      ) : null}
    </>
  );
}
