"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { coarsePortraitRows, mediumPortraitRows } from "./hero-portrait-lods";
import { portraitCell, portraitRows } from "./hero-portrait-rows";

// All levels share a single 700 × 999.6 unit-space and exactly the same crop.
// Replace the three maps together to animate another expression in the future.
const maps = [coarsePortraitRows, mediumPortraitRows, portraitRows];
const glyphs = " .:-=+*#%@";
const settings = {
  fontWeight: 500,
  maxDpr: 2,
  fps: 30,
  portraitHeight: 1040,
  edgeOffset: 200,
  portraitOpacity: 0.76,
  rain: {
    columnChance: 0.78,
    secondFlowChance: 0.32,
    localFlowChance: 0.42,
    cellsPerSecondMin: 4.5,
    cellsPerSecondMax: 12.5,
    trailMin: 2,
    trailMax: 6,
    opacity: 0.38,
    headlineQuietness: 0.59,
    localBoost: 0.7,
  },
  capture: {
    flightMin: 270,
    flightMax: 430,
    travelCellsMin: 2.5,
    travelCellsMax: 4.5,
    arrivalStart: 390,
    concurrentLimit: 768,
    settleEasing: 0.18,
    releaseFlightMin: 410,
    releaseFlightMax: 630,
    releaseDriftCells: 4,
    releaseSpeed: 7,
  },
  timing: {
    rain: 1650,
    form: 2000,
    refineMedium: 800,
    refineFine: 800,
    hold: 5000,
    simplifyMedium: 600,
    simplifyCoarse: 600,
    dissolve: 1600,
  },
} as const;

type State = keyof typeof settings.timing;
type Stream = {
  column: number;
  initialRow: number;
  speed: number;
  length: number;
  opacity: number;
  seed: number;
  local: boolean;
};
type Capture = {
  col: number;
  row: number;
  glyph: string;
  fallingGlyph: string;
  landingAt: number;
  startAt: number;
  flight: number;
  travelCells: number;
  releaseAt: number;
  releaseFlight: number;
};
type Level = {
  rows: string[];
  columns: number;
  count: number;
  width: number;
  height: number;
  cache: HTMLCanvasElement;
};

const timeline = Object.entries(settings.timing) as [State, number][];
const cycle = timeline.reduce((sum, [, duration]) => sum + duration, 0);
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

function phaseAt(time: number): { state: State; progress: number } {
  let position = time % cycle;
  for (const [state, duration] of timeline) {
    if (position < duration) return { state, progress: position / duration };
    position -= duration;
  }
  return { state: "rain", progress: 0 };
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
    let frame = 0;
    let visible = false;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let portraitX = 0;
    let portraitY = 0;
    let portraitWidth = 0;
    let portraitHeight = 0;
    let dpr = 1;
    let levels: Level[] = [];
    let streams: Stream[] = [];
    let captures: Capture[] = [];
    let captureCells: (Capture | undefined)[] = [];
    let portraitEnabled = false;
    let rainStretch = 1;
    let elapsed = 0;
    let lastTick = 0;

    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
    };

    const resize = () => {
      const bounds = wrapper.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      viewportWidth = bounds.width;
      viewportHeight = bounds.height;
      dpr = Math.min(window.devicePixelRatio || 1, settings.maxDpr);
      canvas.width = Math.max(1, Math.round(viewportWidth * dpr));
      canvas.height = Math.max(1, Math.round(viewportHeight * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textAlign = "left";
      context.textBaseline = "alphabetic";

      portraitEnabled = window.innerWidth > 1100;
      const scale = Math.min(window.innerHeight, settings.portraitHeight) /
        (portraitRows.length * portraitCell.height);
      portraitWidth = portraitRows[0].length * portraitCell.width * scale;
      portraitHeight = portraitRows.length * portraitCell.height * scale;
      portraitX = window.innerWidth - bounds.left +
        Math.min(settings.edgeOffset, window.innerWidth * 0.14) - portraitWidth;
      portraitY = (viewportHeight - portraitHeight) / 2;
      levels = [];
      if (portraitEnabled) {
        for (const [index, rows] of maps.entries()) {
          const columns = rows[0].length;
          const width = portraitWidth / columns;
          const height = portraitHeight / rows.length;
          const cache = document.createElement("canvas");
          cache.width = Math.round(portraitWidth * dpr);
          cache.height = Math.round(portraitHeight * dpr);
          const paint = cache.getContext("2d");
          if (!paint) continue;
          paint.font = `${settings.fontWeight} ${height}px monospace`;
          paint.textBaseline = "alphabetic";
          const stretch = width / paint.measureText("M").width;
          paint.setTransform(dpr * stretch, 0, 0, dpr, 0, 0);
          paint.fillStyle = "#dcdcde";
          for (let row = 0; row < rows.length; row++) {
            if (rows[row].trim()) paint.fillText(rows[row], 0, (row + 1) * height);
          }
          levels[index] = { rows, columns, count: rows.length, width, height, cache };
        }
      }

      const coarseWidth = portraitWidth / coarsePortraitRows[0].length;
      const coarseHeight = portraitHeight / coarsePortraitRows.length;
      context.font = `${settings.fontWeight} ${coarseHeight}px monospace`;
      rainStretch = coarseWidth / context.measureText("M").width;
      streams = [];
      const first = Math.floor(-portraitX / coarseWidth) - 1;
      const last = Math.ceil((viewportWidth - portraitX) / coarseWidth) + 1;
      const firstRow = Math.floor(-portraitY / coarseHeight) - settings.rain.trailMax;
      const rowCount = Math.ceil(viewportHeight / coarseHeight);
      for (let column = first; column <= last; column++) {
        for (let flow = 0; flow < 3; flow++) {
          const local = flow === 2;
          if (local && (!portraitEnabled || column < 0 ||
              column >= coarsePortraitRows[0].length)) continue;
          const chance = flow === 0
            ? settings.rain.columnChance
            : local ? settings.rain.localFlowChance : settings.rain.secondFlowChance;
          const key = column * 3 + flow;
          if (hash(key, 18) > chance) continue;
          const seed = hash(key, 57);
          streams.push({
            column,
            initialRow: firstRow + hash(key, 39) * rowCount,
            speed: settings.rain.cellsPerSecondMin +
              hash(key, 48) * (settings.rain.cellsPerSecondMax -
                settings.rain.cellsPerSecondMin),
            length: settings.rain.trailMin + Math.floor(
              hash(key, 72) * (settings.rain.trailMax - settings.rain.trailMin + 1)
            ),
            opacity: settings.rain.opacity * (0.63 + hash(key, 87) * 0.58),
            seed,
            local,
          });
        }
      }
      captures = [];
      captureCells = new Array(coarsePortraitRows.length * coarsePortraitRows[0].length);
      if (portraitEnabled) {
        for (let row = 0; row < coarsePortraitRows.length; row++) {
          for (let col = 0; col < coarsePortraitRows[0].length; col++) {
            const glyph = coarsePortraitRows[row][col];
            if (glyph === " ") continue;
            const order = row / coarsePortraitRows.length * 0.55 + hash(col, row) * 0.45;
            const flight = settings.capture.flightMin +
              hash(col, row + 147) * (settings.capture.flightMax - settings.capture.flightMin);
            const landingAt = settings.capture.arrivalStart +
              order * (settings.timing.form - settings.capture.arrivalStart - 90);
            const capture: Capture = {
              col,
              row,
              glyph,
              fallingGlyph: glyphs[2 + Math.floor(hash(col + 41, row + 79) * 8)],
              landingAt,
              startAt: Math.max(0, landingAt - flight),
              flight,
              travelCells: settings.capture.travelCellsMin +
                hash(col + 27, row + 73) *
                (settings.capture.travelCellsMax - settings.capture.travelCellsMin),
              releaseAt: 150 + order * (settings.timing.dissolve - 430),
              releaseFlight: settings.capture.releaseFlightMin +
                hash(col + 63, row + 33) *
                (settings.capture.releaseFlightMax - settings.capture.releaseFlightMin),
            };
            captures.push(capture);
            captureCells[row * coarsePortraitRows[0].length + col] = capture;
          }
        }
      }
    };

    // The pre-rendered canvases are a glyph cache, not separate animation
    // layers. Every frame composes them onto this one visible Canvas.
    const paintWhole = (level: number) => {
      const item = levels[level];
      context.globalAlpha = settings.portraitOpacity;
      context.drawImage(item.cache, portraitX, portraitY, portraitWidth, portraitHeight);
    };

    const paintRows = (level: number, first: number, count: number) => {
      const item = levels[level];
      context.globalAlpha = settings.portraitOpacity;
      context.drawImage(
        item.cache,
        0, first * item.height * dpr,
        item.cache.width, count * item.height * dpr,
        portraitX, portraitY + first * item.height,
        portraitWidth, count * item.height,
      );
    };

    const paintTile = (level: number, col: number, row: number, amount: number, offsetY = 0) => {
      const item = levels[level];
      if (amount < 0.015 || item.rows[row]?.[col] === " ") return;
      context.globalAlpha = settings.portraitOpacity * amount;
      context.drawImage(
        item.cache,
        col * item.width * dpr, row * item.height * dpr,
        item.width * dpr, item.height * dpr,
        portraitX + col * item.width,
        portraitY + row * item.height + offsetY,
        item.width, item.height,
      );
    };

    // One parent tile becomes four child tiles. Whole settled rows use a
    // single blit; only the moving wave is composed tile by tile.
    const paintRefinement = (parent: number, progress: number, reverse = false) => {
      const large = levels[parent];
      for (let row = 0; row < large.count; row++) {
        if (portraitY + (row + 1) * large.height < 0 ||
            portraitY + row * large.height > viewportHeight) continue;
        const wave = row / large.count * 0.8;
        if (progress <= wave) {
          if (reverse) paintRows(parent + 1, row * 2, 2);
          else paintRows(parent, row, 1);
          continue;
        }
        if (progress >= wave + 0.22) {
          if (reverse) paintRows(parent, row, 1);
          else paintRows(parent + 1, row * 2, 2);
          continue;
        }
        for (let col = 0; col < large.columns; col++) {
          const refined = ease((progress - wave - hash(col, row) * 0.15) / 0.07);
          paintTile(parent, col, row, reverse ? refined : 1 - refined);
          const amount = reverse ? 1 - refined : refined;
          if (amount < 0.015) continue;
          paintTile(parent + 1, col * 2, row * 2, amount);
          paintTile(parent + 1, col * 2 + 1, row * 2, amount);
          paintTile(parent + 1, col * 2, row * 2 + 1, amount);
          paintTile(parent + 1, col * 2 + 1, row * 2 + 1, amount);
        }
      }
    };

    // These are falling coarse-grid glyphs with assigned destinations, not
    // cells revealed by a mask. Their rain glyphs change tone as they land;
    // on release the same cells become falling glyphs again.
    const paintCoarse = (ms: number, releasing: boolean) => {
      const item = levels[0];
      for (const particle of captures) {
        const settled = releasing
          ? ms < particle.releaseAt
          : ms >= particle.landingAt;
        if (settled) paintTile(0, particle.col, particle.row, 1);
      }

      context.save();
      context.scale(rainStretch, 1);
      context.font = `${settings.fontWeight} ${item.height}px monospace`;
      context.fillStyle = "#dcdcde";
      let inFlight = 0;
      for (const particle of captures) {
        const screenX = portraitX + particle.col * item.width;
        if (screenX + item.width < 0 || screenX > viewportWidth) continue;
        let flight = 0;
        let y = portraitY + (particle.row + 1) * item.height;
        if (releasing) {
          if (ms < particle.releaseAt) continue;
          flight = (ms - particle.releaseAt) / particle.releaseFlight;
          if (flight <= 1) {
            y += item.height * settings.capture.releaseDriftCells *
              (0.16 * flight + 0.84 * flight * flight);
          } else {
            y += item.height * (settings.capture.releaseDriftCells +
              settings.capture.releaseSpeed *
              (ms - particle.releaseAt - particle.releaseFlight) / 1000);
          }
        } else {
          if (ms < particle.startAt || ms >= particle.landingAt) continue;
          flight = clamp((ms - particle.startAt) /
            (particle.landingAt - particle.startAt));
          const eased = flight + settings.capture.settleEasing *
            Math.sin(Math.PI * flight);
          y -= particle.travelCells * item.height * (1 - eased);
        }
        if (y < -item.height || y > viewportHeight + item.height) continue;
        if (++inFlight > settings.capture.concurrentLimit) break;
        const tone = releasing
          ? ease((flight - 0.27) / 0.42)
          : ease((flight - 0.58) / 0.4);
        const initial = glyphs.indexOf(particle.fallingGlyph);
        const destination = glyphs.indexOf(particle.glyph);
        const index = Math.round(releasing
          ? destination * (1 - tone) + initial * tone
          : initial * (1 - tone) + destination * tone);
        const opacity = releasing
          ? settings.portraitOpacity * (1 - ease(flight / 1.4) * 0.55)
          : (0.37 + settings.portraitOpacity * 0.5 * ease(flight)) *
            ease((ms - particle.startAt) / 75);
        if (opacity < 0.01) continue;
        const x = screenX / rainStretch;
        context.globalAlpha = opacity * 0.14;
        context.fillText(glyphs[index], x, y - item.height * 0.95);
        context.globalAlpha = opacity * 0.27;
        context.fillText(glyphs[index], x, y - item.height * 0.46);
        context.globalAlpha = opacity;
        context.fillText(glyphs[index], x, y);
      }
      context.restore();
      context.globalAlpha = 1;
    };

    const paintRain = (time: number, state: State, progress: number) => {
      const cellWidth = portraitWidth / coarsePortraitRows[0].length;
      const cellHeight = portraitHeight / coarsePortraitRows.length;
      const firstRow = Math.floor(-portraitY / cellHeight) - settings.rain.trailMax;
      const lastRow = Math.ceil((viewportHeight - portraitY) / cellHeight);
      const span = lastRow - firstRow + settings.rain.trailMax;
      context.save();
      context.scale(rainStretch, 1);
      context.font = `${settings.fontWeight} ${cellHeight}px monospace`;
      const localEnergy = state === "form"
        ? ease(progress / 0.17) * (1 - 0.65 * ease((progress - 0.8) / 0.2))
        : state === "refineMedium"
          ? 0.35 * (1 - ease(progress / 0.5))
          : state === "dissolve"
            ? ease(progress / 0.2)
            : state === "rain"
              ? (time >= cycle ? 0.5 * (1 - ease(progress / 0.45)) : 0) +
                0.3 * ease((progress - 0.73) / 0.27)
              : 0;
      for (const stream of streams) {
        if (stream.local && localEnergy < 0.01) continue;
        const x = portraitX + stream.column * cellWidth;
        const reading = 1 - settings.rain.headlineQuietness *
          (1 - ease((x - viewportWidth * 0.28) / (viewportWidth * 0.47)));
        const head = firstRow +
          ((stream.initialRow - firstRow + time / 1000 * stream.speed) % span + span) % span;
        for (let trail = stream.length - 1; trail >= 0; trail--) {
          const row = Math.floor(head) - trail;
          const y = portraitY + row * cellHeight;
          if (y < -cellHeight || y > viewportHeight) continue;
          const glyph = coarsePortraitRows[row]?.[stream.column];
          let occupancy = 0;
          if (portraitEnabled && glyph && glyph !== " " && state !== "rain") {
            if (state === "form" || state === "dissolve") {
              const particle = captureCells[row * coarsePortraitRows[0].length +
                stream.column];
              occupancy = particle
                ? state === "form"
                  ? ease((progress * settings.timing.form - particle.startAt) /
                    (particle.landingAt - particle.startAt))
                  : progress * settings.timing.dissolve < particle.releaseAt ? 1 : 0
                : 0;
            } else {
              occupancy = 1;
            }
          }
          const bottomQuiet = 1 - 0.5 *
            ease((y - viewportHeight * 0.72) / (viewportHeight * 0.28));
          const alpha = stream.opacity * (trail ? Math.pow(0.58, trail) : 1) *
            reading * bottomQuiet * (1 - occupancy * 0.98) *
            (stream.local ? localEnergy * settings.rain.localBoost : 1);
          if (alpha < 0.012) continue;
          const symbol = glyphs[2 + Math.floor(
            hash(stream.column + trail, Math.floor(time / 240) + stream.seed * 97) * 8
          )];
          context.fillStyle = `rgba(190,190,192,${alpha})`;
          context.fillText(symbol, x / rainStretch, y + cellHeight);
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
      const { state, progress } = still
        ? { state: "hold" as State, progress: 0 }
        : phaseAt(time);
      if (!still) paintRain(time, state, progress);
      if (portraitEnabled) {
        switch (state) {
          case "rain":
            if (time >= cycle) paintCoarse(
              settings.timing.dissolve + time % cycle, true
            );
            break;
          case "form": paintCoarse(progress * settings.timing.form, false); break;
          case "refineMedium": paintRefinement(0, progress); break;
          case "refineFine": paintRefinement(1, progress); break;
          case "hold": paintWhole(2); break;
          case "simplifyMedium": paintRefinement(1, progress, true); break;
          case "simplifyCoarse": paintRefinement(0, progress, true); break;
          case "dissolve": paintCoarse(progress * settings.timing.dissolve, true); break;
        }
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
      draw(elapsed);
    };

    const sync = () => {
      stop();
      if (!visible || document.hidden || !viewportWidth) return;
      if (mobile.matches) {
        wrapper.dataset.asciiReady = "true";
      } else if (reducedMotion.matches) {
        draw(0, true);
      } else if (pausedRef.current) {
        draw(elapsed);
      } else {
        frame = window.requestAnimationFrame(tick);
      }
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
      <div
        className="hero-ascii-engine hero-ascii-engine--lod"
        ref={wrapperRef}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} />
        <Image
          className="hero-ascii-fallback"
          src="/portraits/neutral-ascii.svg"
          alt=""
          width={700}
          height={1000}
          unoptimized
          loading="eager"
        />
      </div>
      <button
        className="hero-ascii-toggle hero-ascii-toggle--lod hero-ascii-toggle--c4"
        type="button"
        aria-label={paused ? "Resume ASCII animation" : "Pause ASCII animation"}
        aria-pressed={paused}
        onClick={() => {
          pausedRef.current = !pausedRef.current;
          setPaused(pausedRef.current);
          window.dispatchEvent(new Event("ascii-animation-toggle"));
        }}
      >
        {paused ? "Play animation" : "Pause animation"}
      </button>
    </>
  );
}
