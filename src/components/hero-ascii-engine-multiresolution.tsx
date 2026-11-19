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
  portraitHeight: 976,
  edgeOffset: 200,
  portraitOpacity: 0.76,
  rain: {
    columnChance: 0.57,
    cellsPerSecond: 7.6,
    trailMin: 2,
    trailMax: 5,
    opacity: 0.38,
    headlineQuietness: 0.52,
  },
  timing: {
    rain: 1500,
    form: 1500,
    refineMedium: 800,
    refineFine: 800,
    hold: 5000,
    simplifyMedium: 600,
    simplifyCoarse: 600,
    dissolve: 1200,
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
        if (hash(column, 18) > settings.rain.columnChance) continue;
        const seed = hash(column, 57);
        streams.push({
          column,
          initialRow: firstRow + hash(column, 39) * rowCount,
          speed: settings.rain.cellsPerSecond * (0.62 + hash(column, 48) * 0.85),
          length: settings.rain.trailMin + Math.floor(
            hash(column, 72) * (settings.rain.trailMax - settings.rain.trailMin + 1)
          ),
          opacity: settings.rain.opacity * (0.63 + hash(column, 87) * 0.58),
          seed,
        });
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

    const paintCoarse = (progress: number, dissolving: boolean) => {
      const item = levels[0];
      for (let row = 0; row < item.count; row++) {
        if (portraitY + (row + 1) * item.height < 0 ||
            portraitY + row * item.height > viewportHeight) continue;
        const wave = row / item.count * 0.73;
        if (!dissolving && progress >= wave + 0.26) {
          paintRows(0, row, 1);
          continue;
        }
        if (dissolving && progress <= wave) {
          paintRows(0, row, 1);
          continue;
        }
        for (let col = 0; col < item.columns; col++) {
          const at = wave + hash(col, row) * 0.13;
          const amount = dissolving
            ? 1 - ease((progress - at) / 0.14)
            : ease((progress - at) / 0.14);
          // Arriving glyphs settle vertically; departing glyphs fall away.
          paintTile(0, col, row, amount,
            (dissolving ? 1 - amount : amount - 1) * item.height * 0.55);
        }
      }
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
      for (const stream of streams) {
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
              const at = row / coarsePortraitRows.length * 0.73 +
                hash(stream.column, row) * 0.13;
              occupancy = state === "form"
                ? ease((progress - at) / 0.14)
                : 1 - ease((progress - at) / 0.14);
            } else {
              occupancy = 1;
            }
          }
          const bottomQuiet = 1 - 0.5 *
            ease((y - viewportHeight * 0.72) / (viewportHeight * 0.28));
          const alpha = stream.opacity * (trail ? Math.pow(0.58, trail) : 1) *
            reading * bottomQuiet * (1 - occupancy * 0.98);
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
          case "rain": break;
          case "form": paintCoarse(progress, false); break;
          case "refineMedium": paintRefinement(0, progress); break;
          case "refineFine": paintRefinement(1, progress); break;
          case "hold": paintWhole(2); break;
          case "simplifyMedium": paintRefinement(1, progress, true); break;
          case "simplifyCoarse": paintRefinement(0, progress, true); break;
          case "dissolve": paintCoarse(progress, true); break;
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
        className="hero-ascii-toggle hero-ascii-toggle--lod"
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
