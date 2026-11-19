"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { portraitCell, portraitRows } from "./hero-portrait-rows";

// The rain and the head use the same glyphs, coordinates, font and tonal scale.
// Other expressions can replace portraitRows without changing the renderer.
const config = {
  glyphs: " .:-=+*#%@",
  fontSize: portraitCell.height,
  fontWeight: 500,
  cellWidth: portraitCell.width,
  cellHeight: portraitCell.height,
  maxDpr: 2,
  fps: 30,
  rainColumnChance: 0.4,
  rainSpeed: 13, // cells / second
  trailLength: 7,
  rainOpacity: 0.42,
  portraitOpacity: 0.72,
  portraitHeight: 976,
  edgeOffset: 200, // pixels beyond the right viewport edge at desktop width
  headlineQuietness: 0.62,
  hold: 6000,
  dissolving: 2700,
  rain: 2600,
  forming: 2900,
} as const;

const columns = portraitRows[0].length;
const rows = portraitRows.length;
const cycle = config.hold + config.dissolving + config.rain + config.forming;
const glyphs = config.glyphs;
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

type Stream = { column: number; head: number; speed: number; seed: number };

export function HeroAsciiEngine() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!wrapper || !canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");
    let frame = 0;
    let visible = false;
    let width = 0;
    let height = 0;
    let cellWidth = config.cellWidth;
    let cellHeight = config.cellHeight;
    let originX = 0;
    let originY = 0;
    let portraitX = 0;
    let portraitY = 0;
    let leftColumn = 0;
    let rightColumn = 0;
    let streams: Stream[] = [];
    let lastTick = 0;
    let elapsed = 0;
    let clock = 0;
    let staticMode = false;
    let portraitEnabled = true;

    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
    };

    const resize = () => {
      const bounds = wrapper.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = bounds.width;
      height = bounds.height;
      portraitEnabled = window.innerWidth > 1100;
      const dpr = Math.min(window.devicePixelRatio || 1, config.maxDpr);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textBaseline = "alphabetic";
      context.textAlign = "left";

      // Uniform scaling keeps the original 160 × 140 face proportions.
      const scale = Math.min(window.innerHeight, config.portraitHeight) /
        (rows * config.cellHeight);
      cellWidth = config.cellWidth * scale;
      cellHeight = config.cellHeight * scale;
      const offset = Math.min(config.edgeOffset, window.innerWidth * 0.14);
      portraitX = window.innerWidth - bounds.left + offset - columns * cellWidth;
      portraitY = (height - rows * cellHeight) / 2;
      // Global rain columns align exactly with the portrait's columns.
      originX = portraitX;
      originY = portraitY;
      leftColumn = Math.floor(-originX / cellWidth) - 1;
      rightColumn = Math.ceil((width - originX) / cellWidth) + 1;
      streams = [];
      const firstRow = Math.floor(-originY / cellHeight);
      const rowCount = Math.ceil(height / cellHeight);
      for (let col = leftColumn; col <= rightColumn; col++) {
        if (hash(col, 18) > config.rainColumnChance) continue;
        streams.push({
          column: col,
          head: firstRow + hash(col, 39) * rowCount,
          speed: config.rainSpeed * (0.7 + hash(col, 48) * 0.6),
          seed: hash(col, 63),
        });
      }
      context.font = `${config.fontWeight} ${config.fontSize * scale}px monospace`;
    };

    const draw = (time: number, still = false) => {
      context.clearRect(0, 0, width, height);
      const phase = time % cycle;
      const dissolving = phase >= config.hold &&
        phase < config.hold + config.dissolving;
      const raining = phase >= config.hold + config.dissolving &&
        phase < config.hold + config.dissolving + config.rain;
      const forming = phase >= config.hold + config.dissolving + config.rain;
      const progress = dissolving
        ? (phase - config.hold) / config.dissolving
        : forming
          ? (phase - config.hold - config.dissolving - config.rain) /
            config.forming
          : 0;

      context.font = `${config.fontWeight} ${cellHeight}px monospace`;
      // The original portrait also fits a monospace run to exactly 160 cells.
      // Use the same horizontal transform for both rain and portrait glyphs.
      const glyphWidth = context.measureText("M").width;
      const xScale = cellWidth / glyphWidth;
      context.save();
      context.scale(xScale, 1);
      const px = (x: number) => x / xScale;
      const rowStart = Math.max(0, Math.floor(-portraitY / cellHeight) - 1);
      const rowEnd = Math.min(rows, Math.ceil((height - portraitY) / cellHeight) + 1);

      if (!still) {
        for (const stream of streams) {
          const x = originX + stream.column * cellWidth;
          const reading = 1 - config.headlineQuietness *
            (1 - smooth((x - width * 0.35) / (width * 0.45)));
          const rowFirst = Math.floor(-originY / cellHeight) - config.trailLength;
          const rowLast = Math.ceil((height - originY) / cellHeight);
          const span = rowLast - rowFirst + config.trailLength;
          const head = rowFirst +
            ((stream.head - rowFirst + clock * stream.speed) % span + span) % span;
          for (let trail = config.trailLength - 1; trail >= 0; trail--) {
            const row = Math.floor(head) - trail;
            const y = originY + row * cellHeight;
            if (y < -cellHeight || y > height + cellHeight) continue;
            const portraitCol = stream.column;
            const faceGlyph = portraitRows[row]?.[portraitCol];
            const wave = (row / rows) * 0.78 +
              hash(portraitCol, row) * 0.22;
            const occupancy = portraitEnabled && faceGlyph && faceGlyph !== " " && !raining
              ? dissolving
                ? 1 - smooth((progress - wave * 0.85) / 0.18)
                : forming
                  ? smooth((progress - wave * 0.85) / 0.18)
                  : 1
              : 0;
            const shade = (trail === 0 ? 1 : Math.pow(0.69, trail));
            const alpha = config.rainOpacity * shade * reading *
              (1 - occupancy * 0.96);
            if (alpha < 0.008) continue;
            const glyph = glyphs[2 + Math.floor(
              hash(stream.column + trail, Math.floor(clock * 2) + stream.seed * 100) * 6
            )];
            context.fillStyle = `rgba(190,190,192,${alpha})`;
            context.fillText(glyph, px(x), y + cellHeight);
          }
        }
      }

      if (portraitEnabled && (!raining || still)) {
        context.fillStyle = "#dcdcde";
        for (let row = rowStart; row < rowEnd; row++) {
          const text = portraitRows[row];
          if (!text.trim()) continue;
          const y = portraitY + (row + 1) * cellHeight;
          const waveRow = row / rows * 0.78;
          // Fully settled rows are rendered as one run; only the moving
          // transition band needs individual cell draws.
          if (still || (!forming && !dissolving) ||
            (forming && progress >= waveRow + 0.4) ||
            (dissolving && progress <= waveRow * 0.85)) {
            context.globalAlpha = config.portraitOpacity;
            context.fillText(text, px(portraitX), y);
            continue;
          }
          if ((forming && progress < waveRow) ||
            (dissolving && progress > (waveRow + 0.22) * 0.85 + 0.18)) continue;
          for (let col = 0; col < columns; col++) {
            const glyph = text[col];
            if (glyph === " ") continue;
            const wave = waveRow + hash(col, row) * 0.22;
            const amount = forming
              ? smooth((progress - wave * 0.85) / 0.18)
              : 1 - smooth((progress - wave * 0.85) / 0.18);
            if (amount < 0.02) continue;
            context.globalAlpha = config.portraitOpacity * amount;
            // A cell changes from the rain's quiet marks to its target glyph.
            context.fillText(glyph, px(portraitX + col * cellWidth), y);
          }
        }
      }
      context.globalAlpha = 1;
      context.restore();
      wrapper.dataset.asciiReady = "true";
    };

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (!lastTick) lastTick = now;
      const delta = Math.min(now - lastTick, 100);
      if (delta < 1000 / config.fps) return;
      lastTick = now;
      elapsed += delta;
      clock += delta / 1000;
      draw(elapsed);
    };

    const sync = () => {
      stop();
      staticMode = motion.matches || mobile.matches;
      if (!visible || document.hidden || !width) return;
      if (mobile.matches) {
        wrapper.dataset.asciiReady = "true";
      } else if (staticMode) {
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
    motion.addEventListener("change", sync);
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
      motion.removeEventListener("change", sync);
      mobile.removeEventListener("change", sync);
      window.removeEventListener("ascii-animation-toggle", sync);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="hero-ascii-engine" ref={wrapperRef} aria-hidden="true">
        <canvas ref={canvasRef} />
        <Image
          className="hero-ascii-fallback"
          src="/portraits/neutral-ascii.svg"
          alt=""
          width={700}
          height={1000}
          unoptimized
          priority
        />
      </div>
      <button
        className="hero-ascii-toggle"
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
