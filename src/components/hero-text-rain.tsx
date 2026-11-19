"use client";

import { useEffect, useRef } from "react";

type RainLayer = {
  color: [number, number, number];
  density: number;
  fadeOpacity: number;
  fontSize: number;
  offset: number;
  opacity: number;
  spacing: number;
  speed: number;
  stepSize: number;
  trailLength: number;
};

type TrailCharacter = {
  character: string;
  y: number;
};

type RainDrop = {
  character: string;
  characterElapsed: number;
  currentY: number;
  nextY: number;
  pendingReset: boolean;
  trail: TrailCharacter[];
  x: number;
};

type LayerState = {
  accumulator: number;
  drops: RainDrop[];
};

const letterCharacters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const numberCharacters = "0123456789";
const characterChangeInterval = 150;
const rainDarkeningOpacity = 0.2;
const specialCharacters = Array.from(
  { length: 94 },
  (_, index) => String.fromCharCode(33 + index),
).filter((character) => !/[A-Za-z0-9]/.test(character));

const layers: RainLayer[] = [
  {
    color: [133, 133, 135],
    density: 1,
    fadeOpacity: 0.3,
    fontSize: 20,
    offset: 0,
    opacity: 0.09,
    spacing: 20,
    speed: 300,
    stepSize: 20,
    trailLength: 8,
  },
  {
    color: [190, 190, 192],
    density: 0.85,
    fadeOpacity: 0.4,
    fontSize: 25,
    offset: 10,
    opacity: 0.1,
    spacing: 20,
    speed: 400,
    stepSize: 20,
    trailLength: 6,
  },
  {
    color: [220, 220, 222],
    density: 0.7,
    fadeOpacity: 0.5,
    fontSize: 30,
    offset: 5,
    opacity: 0.11,
    spacing: 20,
    speed: 400,
    stepSize: 20,
    trailLength: 4,
  },
  {
    color: [240, 240, 242],
    density: 0.55,
    fadeOpacity: 0.6,
    fontSize: 35,
    offset: 15,
    opacity: 0.12,
    spacing: 20,
    speed: 400,
    stepSize: 20,
    trailLength: 2,
  },
  {
    color: [240, 240, 242],
    density: 0.4,
    fadeOpacity: 0.7,
    fontSize: 40,
    offset: 2.5,
    opacity: 0.13,
    spacing: 20,
    speed: 400,
    stepSize: 20,
    trailLength: 1,
  },
];
const canvasEdgeInset =
  Math.max(...layers.map((layer) => layer.fontSize)) / 2 + 2;

function randomCharacter() {
  const distribution = Math.random();
  let characterPool: string | string[];

  if (distribution < 0.42) {
    characterPool = specialCharacters;
  } else if (distribution < 0.9) {
    characterPool = letterCharacters;
  } else {
    characterPool = numberCharacters;
  }

  return characterPool[Math.floor(Math.random() * characterPool.length)];
}

function createDrops(width: number, layer: RainLayer) {
  const availableWidth = Math.max(
    0,
    width - canvasEdgeInset * 2 - layer.offset,
  );
  const availableColumnCount =
    Math.floor(availableWidth / layer.spacing) + 1;
  const columnCount = Math.ceil(
    availableColumnCount * layer.density,
  );

  return Array.from({ length: columnCount }, (_, columnIndex): RainDrop => ({
    character: randomCharacter(),
    characterElapsed: Math.random() * characterChangeInterval,
    currentY: 0,
    nextY: 0,
    pendingReset: false,
    trail: [],
    x:
      canvasEdgeInset +
      Math.floor(columnIndex / layer.density) * layer.spacing +
      layer.offset,
  }));
}

export function HeroTextRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let lastFrame = performance.now();
    let fontFamily = "monospace";
    let layerStates: LayerState[] = [];

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.imageSmoothingEnabled = true;
      context.textAlign = "center";
      context.textBaseline = "top";
      fontFamily =
        getComputedStyle(canvas)
          .getPropertyValue("--font-geist-mono")
          .trim() || "monospace";
      layerStates = layers.map((layer) => ({
        accumulator: Math.random() * (layer.stepSize / layer.speed) * 1000,
        drops: createDrops(width, layer),
      }));
    };

    const advanceLayer = (layer: RainLayer, state: LayerState) => {
      state.drops.forEach((drop) => {
        const drawY = drop.pendingReset ? 0 : drop.nextY;

        drop.pendingReset = false;
        drop.currentY = drawY;
        drop.trail.unshift({
          character: drop.character,
          y: drawY,
        });
        drop.trail.length = Math.min(
          drop.trail.length,
          layer.trailLength,
        );

        if (drawY > 100 + Math.random() * 10000) {
          drop.nextY = drawY;
          drop.pendingReset = true;
        } else {
          drop.nextY = drawY + layer.stepSize;
        }
      });
    };

    const renderLayers = () => {
      context.clearRect(0, 0, width, height);

      layers.forEach((layer, layerIndex) => {
        const state = layerStates[layerIndex];
        const [red, green, blue] = layer.color;
        const visibleOpacity =
          layer.opacity * (1 - rainDarkeningOpacity);
        const stepDuration = (layer.stepSize / layer.speed) * 1000;
        const stepProgress = Math.min(
          state.accumulator / stepDuration,
          1,
        );

        context.font = `500 ${layer.fontSize}px ${fontFamily}, monospace`;

        state.drops.forEach((drop) => {
          for (
            let trailIndex = drop.trail.length - 1;
            trailIndex >= 0;
            trailIndex -= 1
          ) {
            const trailCharacter = drop.trail[trailIndex];
            const trailOpacity =
              visibleOpacity *
              2.15 *
              Math.pow(1 - layer.fadeOpacity, trailIndex);

            context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${trailOpacity})`;
            context.fillText(
              trailCharacter.character,
              drop.x,
              trailCharacter.y,
            );
          }

          const headY =
            drop.currentY +
            (drop.nextY - drop.currentY) * stepProgress;

          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(
            visibleOpacity * 3.6,
            0.48,
          )})`;
          context.fillText(drop.character, drop.x, headY);
        });
      });
    };

    const draw = (now: number) => {
      if (reducedMotion.matches) {
        context.clearRect(0, 0, width, height);
        return;
      }

      const timeSinceLastFrame = now - lastFrame;

      if (timeSinceLastFrame < 30) {
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }

      lastFrame = now;

      layers.forEach((layer, layerIndex) => {
        const state = layerStates[layerIndex];
        const stepDuration = (layer.stepSize / layer.speed) * 1000;
        const elapsed = Math.min(timeSinceLastFrame, 100);

        state.accumulator += elapsed;
        state.drops.forEach((drop) => {
          drop.characterElapsed += elapsed;

          while (
            drop.characterElapsed >= characterChangeInterval
          ) {
            drop.character = randomCharacter();
            drop.characterElapsed -= characterChangeInterval;
          }
        });

        while (state.accumulator >= stepDuration) {
          advanceLayer(layer, state);
          state.accumulator -= stepDuration;
        }
      });

      renderLayers();
      animationFrame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      lastFrame = performance.now();

      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      start();
    });

    resizeObserver.observe(canvas);
    reducedMotion.addEventListener("change", start);
    resize();
    start();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return (
    <div className="hero-rain" aria-hidden="true">
      <canvas className="hero-rain-canvas" ref={canvasRef} />
    </div>
  );
}
