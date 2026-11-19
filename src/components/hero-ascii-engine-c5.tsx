"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { coarsePortraitRows, mediumPortraitRows } from "./hero-portrait-lods";
import { portraitCell, portraitRows } from "./hero-portrait-rows";

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
    // Persistent flux, not a phase-dependent construction layer.
    spacingCells: 2.7,
    emissionCells: 1.1,
    speedMin: 7.5,
    speedMax: 13.5,
    opacity: 0.34,
    headlineQuietness: 0.69,
    outerSpacing: 2.2,
    trailOpacity: 0.23,
    maxParticles: 4200,
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
    width: 0.09,
    falloff: 2.4,
    extraLight: 0.27,
    start: -0.12,
    end: 1.12,
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

type State = keyof typeof settings.timing;
type Level = {
  rows: string[];
  columns: number;
  count: number;
  width: number;
  height: number;
  cache: HTMLCanvasElement;
};
type Particle = {
  col: number;
  x: number;
  y: number; // glyph baseline in canvas coordinates
  speed: number; // pixels / second
  opacity: number;
  glyph: string;
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

const timeline = Object.entries(settings.timing) as [State, number][];
const cycle = timeline.reduce((sum, [, duration]) => sum + duration, 0);
const formStart = settings.timing.rain;
const dissolveStart = cycle - settings.timing.dissolve;
const columns = coarsePortraitRows[0].length;
const rows = coarsePortraitRows.length;
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
const targets = coarsePortraitRows.flatMap((line, row) =>
  [...line].flatMap((glyph, col) => glyph === " " ? [] : [cellIndex(col, row)]));

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
    const debug = new URLSearchParams(window.location.search).has("asciiDebug");
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
    let rainStretch = 1;
    let dpr = 1;
    let levels: Level[] = [];
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
      const x = portraitX + col * cellWidth;
      return {
        col, x, y,
        speed: cellHeight * (settings.rain.speedMin +
          hash(col * 17 + sequence, 48) *
          (settings.rain.speedMax - settings.rain.speedMin)),
        opacity: settings.rain.opacity *
          (0.63 + hash(col * 31 + sequence, 87) * 0.58),
        glyph: glyphs[2 + Math.floor(hash(col * 13 + sequence, 71) * 8)],
        releaseGlyph: "",
        mode: "falling", target: -1, fromX: x, fromY: y,
        start: 0, flight: 0, vx: 0,
      };
    };

    const resize = () => {
      const bounds = wrapper.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const oldX = portraitX;
      const oldY = portraitY;
      const oldWidth = cellWidth;
      const oldHeight = cellHeight;
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
      cellWidth = portraitWidth / columns;
      cellHeight = portraitHeight / rows;
      levels = [];
      if (portraitEnabled) {
        for (const [index, lines] of maps.entries()) {
          const count = lines.length;
          const width = portraitWidth / lines[0].length;
          const height = portraitHeight / count;
          const cache = document.createElement("canvas");
          cache.width = Math.round(portraitWidth * dpr);
          cache.height = Math.round(portraitHeight * dpr);
          const paint = cache.getContext("2d");
          if (!paint) continue;
          paint.font = `${settings.fontWeight} ${height}px monospace`;
          paint.textBaseline = "alphabetic";
          paint.setTransform(dpr * width / paint.measureText("M").width, 0, 0, dpr, 0, 0);
          paint.fillStyle = "#dcdcde";
          for (let row = 0; row < count; row++) {
            if (lines[row].trim()) paint.fillText(lines[row], 0, (row + 1) * height);
          }
          levels[index] = { rows: lines, columns: lines[0].length, count, width, height, cache };
        }
      }
      context.font = `${settings.fontWeight} ${cellHeight}px monospace`;
      rainStretch = cellWidth / context.measureText("M").width;

      // Transform existing trajectories instead of resetting the rain on resize.
      if (oldWidth && oldHeight) {
        for (const particle of particles) {
          particle.x = portraitX + (particle.x - oldX) * cellWidth / oldWidth;
          particle.y = portraitY + (particle.y - oldY) * cellHeight / oldHeight;
          particle.fromX = portraitX + (particle.fromX - oldX) * cellWidth / oldWidth;
          particle.fromY = portraitY + (particle.fromY - oldY) * cellHeight / oldHeight;
          particle.speed *= cellHeight / oldHeight;
          particle.vx *= cellWidth / oldWidth;
        }
      }
      const first = Math.floor(-portraitX / cellWidth) - 1;
      // Keep the full portrait footprint supplied by the same continuous
      // rain, including columns clipped by the viewport's right edge.
      const last = portraitEnabled
        ? Math.max(columns - 1, Math.ceil((viewportWidth - portraitX) / cellWidth) + 1)
        : Math.ceil((viewportWidth - portraitX) / cellWidth) + 1;
      const existing = new Map(flows.map((flow) => [flow.col, flow]));
      flows = [];
      for (let col = first; col <= last; col++) {
        const prior = existing.get(col);
        const outer = col < 0 || col >= columns;
        const interval = settings.rain.emissionCells * cellHeight /
          (cellHeight * (settings.rain.speedMin +
            hash(col, 18) * (settings.rain.speedMax - settings.rain.speedMin))) *
          (outer ? settings.rain.outerSpacing : 1) * 1000;
        flows.push(prior ?? { col, next: elapsed + hash(col, 39) * interval,
          interval, sequence: 0 });
        if (!oldWidth || !prior) {
          const spacing = settings.rain.spacingCells *
            (outer ? settings.rain.outerSpacing : 1);
          const count = Math.ceil(viewportHeight / (cellHeight * spacing));
          for (let i = 0; i < count; i++) {
            const y = (i + hash(col, i + 57) * 0.55) *
              cellHeight * spacing;
            particles.push(newParticle(col, y, i));
          }
        }
      }
      // Drop only rain outside the new horizontal footprint; settled/released
      // glyphs retain their identity and their original trajectory.
      particles = particles.filter((particle) =>
        particle.mode !== "falling" ||
        (portraitEnabled && particle.col >= 0 && particle.col < columns) ||
        (particle.x >= -cellWidth && particle.x <= viewportWidth + cellWidth));
    };

    const paintWhole = (level: number) => {
      context.globalAlpha = settings.portraitOpacity;
      context.drawImage(levels[level].cache, portraitX, portraitY, portraitWidth, portraitHeight);
    };

    const paintTile = (level: number, col: number, row: number, alpha: number) => {
      const item = levels[level];
      if (item.rows[row]?.[col] === " ") return;
      context.globalAlpha = alpha;
      context.drawImage(
        item.cache, col * item.width * dpr, row * item.height * dpr,
        item.width * dpr, item.height * dpr,
        portraitX + col * item.width, portraitY + row * item.height,
        item.width, item.height,
      );
    };

    // The same physical parent tile maps to four children. Only glyphs
    // inside the moving diagonal gain light; empty spaces are never painted.
    const paintSweep = (parent: number, progress: number, reverse = false) => {
      const large = levels[parent];
      const beam = reverse
        ? settings.sweep.end - (settings.sweep.end - settings.sweep.start) * progress
        : settings.sweep.start + (settings.sweep.end - settings.sweep.start) * progress;
      const positionAt = (col: number, row: number) =>
        settings.sweep.xWeight * (col + 0.5) / large.columns +
        settings.sweep.yWeight * (row + 0.5) / large.count;
      const detailAt = (distance: number) =>
        reverse ? distance < settings.sweep.switchOffset
          : distance <= settings.sweep.switchOffset;
      const glowAt = (distance: number) =>
        Math.exp(-settings.sweep.falloff *
          (distance / settings.sweep.width) ** 2) * settings.sweep.extraLight;
      for (let row = 0; row < large.count; row++) {
        if (portraitY + (row + 1) * large.height < 0 ||
            portraitY + row * large.height > viewportHeight) continue;
        for (let col = 0; col < large.columns;) {
          const distance = positionAt(col, row) - beam;
          const level = detailAt(distance) ? parent + 1 : parent;
          const glow = glowAt(distance);
          if (glow <= 0.01) {
            // Stable adjacent cells become a single cached blit, rather than
            // thousands of individual glyph draws at fine resolution.
            let end = col + 1;
            while (end < large.columns) {
              const next = positionAt(end, row) - beam;
              if (glowAt(next) > 0.01 ||
                  (detailAt(next) ? parent + 1 : parent) !== level) break;
              end++;
            }
            const item = levels[level];
            context.globalAlpha = settings.portraitOpacity;
            context.drawImage(item.cache,
              col * large.width * dpr, row * large.height * dpr,
              (end - col) * large.width * dpr, large.height * dpr,
              portraitX + col * large.width, portraitY + row * large.height,
              (end - col) * large.width, large.height);
            // Source pixels have the same physical footprint at every LOD.
            col = end;
            continue;
          }
          if (level === parent) {
            paintTile(parent, col, row, settings.portraitOpacity);
            paintTile(parent, col, row, glow);
          } else {
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
              paintTile(parent + 1, col * 2 + dx, row * 2 + dy, settings.portraitOpacity);
              paintTile(parent + 1, col * 2 + dx, row * 2 + dy, glow);
            }
          }
          col++;
        }
      }
    };

    const release = (particle: Particle, time: number) => {
      if (particle.target >= 0) {
        particle.releaseGlyph = coarsePortraitRows[Math.floor(particle.target / columns)]
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

    // A falling particle can reserve only a real, unoccupied coarse cell
    // ahead of its current position. It is never created at that destination.
    const reserve = (particle: Particle, time: number) => {
      const nearRow = Math.max(0, Math.ceil((particle.y - portraitY) / cellHeight) - 1);
      let best = -1;
      let score = Infinity;
      for (let row = nearRow; row <= Math.min(rows - 1,
        nearRow + settings.capture.lookAheadCells); row++) {
        for (let dx = -settings.capture.adjacentColumns;
          dx <= settings.capture.adjacentColumns; dx++) {
          const col = particle.col + dx;
          if (col < 0 || col >= columns || coarsePortraitRows[row][col] === " ") continue;
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
          particles.push(newParticle(flow.col, -cellHeight *
            (0.2 + hash(flow.col, flow.sequence) * 0.7), ++flow.sequence));
          flow.next += flow.interval;
        }
        if (flow.next < time - 1000) flow.next = time + flow.interval;
      }
      const position = time % cycle;
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
            particle.y - cellHeight * 1.5 > viewportHeight) {
          if (particle.mode === "releasing") recycled++;
          offscreen++;
          particles.splice(i, 1);
        }
      }
      if (budget > 0) {
        scanOffset = (scanOffset + 137) % Math.max(1, particles.length);
        for (let n = 0; n < particles.length && budget > 0; n++) {
          const particle = particles[(n + scanOffset) % particles.length];
          if (particle.mode === "falling" && particle.col >= 0 &&
              particle.col < columns && reserve(particle, time)) budget--;
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
          coarsePortraitRows.reduce((count, line, row) =>
            count + (line[col] !== " " && !occupied[cellIndex(col, row)] ? 1 : 0), 0));
        wrapper.dataset.asciiStats = JSON.stringify({
          phase: phaseAt(time).state,
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
      const state = phaseAt(time).state;
      context.save();
      context.scale(rainStretch, 1);
      context.font = `${settings.fontWeight} ${cellHeight}px monospace`;
      context.fillStyle = "#bebec0";
      for (const particle of particles) {
        if (particle.mode === "settled") continue;
        if (particle.x < -cellWidth || particle.x > viewportWidth + cellWidth ||
            particle.y < -cellHeight || particle.y > viewportHeight + cellHeight) continue;
        const reading = 1 - settings.rain.headlineQuietness *
          (1 - ease((particle.x - viewportWidth * 0.28) / (viewportWidth * 0.47)));
        const bottomQuiet = 1 - 0.5 *
          ease((particle.y - viewportHeight * 0.72) / (viewportHeight * 0.28));
        const flight = particle.mode === "capturing"
          ? ease((time - particle.start) / particle.flight) : 0;
        const releaseAge = particle.mode === "releasing"
          ? ease((time - particle.start) / 550) : 1;
        const targetGlyph = particle.target >= 0
          ? coarsePortraitRows[Math.floor(particle.target / columns)]
            [particle.target % columns] : particle.glyph;
        const symbol = particle.mode === "capturing" && flight > 0.58
          ? targetGlyph : particle.mode === "releasing" && releaseAge < 0.8
            ? particle.releaseGlyph : particle.glyph;
        const alpha = particle.mode === "capturing"
          ? particle.opacity * (1 - flight) + settings.portraitOpacity * flight
          : particle.mode === "releasing"
            ? settings.portraitOpacity * (1 - releaseAge) +
              particle.opacity * releaseAge
            : particle.opacity * reading * bottomQuiet;
        const inPortrait = particle.col >= 0 && particle.col < columns &&
          particle.y >= portraitY && particle.y < portraitY + portraitHeight;
        const cellRow = Math.floor((particle.y - portraitY) / cellHeight);
        const behindPortrait = inPortrait && portraitEnabled && state !== "rain" &&
          (state !== "form" && state !== "dissolve" ||
            Boolean(occupied[cellIndex(particle.col, cellRow)]));
        const visibleAlpha = particle.mode === "falling" && behindPortrait
          ? alpha * 0.14 : alpha;
        // Trails follow the same particle; they are never extra glyphs
        // assigned to portrait cells.
        if (particle.mode !== "capturing") {
          context.globalAlpha = visibleAlpha * settings.rain.trailOpacity;
          context.fillText(symbol, particle.x / rainStretch,
            particle.y - cellHeight * 0.95);
        }
        context.globalAlpha = visibleAlpha;
        context.fillText(symbol, particle.x / rainStretch, particle.y);
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
        ? { state: "hold" as State, progress: 0 } : phaseAt(time);
      if (!still) paintRain(time);
      if (portraitEnabled) {
        if (state === "form" || state === "dissolve") {
          for (const index of targets) {
            if (occupied[index]?.mode !== "settled") continue;
            paintTile(0, index % columns, Math.floor(index / columns),
              settings.portraitOpacity);
          }
        } else if (state === "refineMedium") paintSweep(0, progress);
        else if (state === "mediumPause") paintWhole(1);
        else if (state === "refineFine") paintSweep(1, progress);
        else if (state === "hold") paintWhole(2);
        else if (state === "simplifyMedium") paintSweep(1, progress, true);
        else if (state === "simplifyCoarse") paintSweep(0, progress, true);
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
    </>
  );
}
