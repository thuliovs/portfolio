"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { portraitCell, portraitRows } from "./hero-portrait-rows";

const columns = portraitRows[0].length;
const portraitWidth = columns * portraitCell.width;
const portraitHeight = portraitRows.length * portraitCell.height;

/** Phase B: one static ASCII portrait. No frame loop or original photo in the browser. */
export function HeroAsciiPortrait() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!wrapper || !canvas || !context) return;

    let visible = false;
    const draw = () => {
      if (!visible) return;
      const { width, height } = wrapper.getBoundingClientRect();
      if (!width || !height) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.font = `500 ${portraitCell.height}px monospace`;
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      const glyphWidth = context.measureText("M").width;
      context.setTransform(
        (ratio * width * portraitCell.width) / (portraitWidth * glyphWidth),
        0,
        0,
        (ratio * height) / portraitHeight,
        0,
        0,
      );
      context.fillStyle = "#dcdcde";
      context.globalAlpha = 0.78;
      portraitRows.forEach((row, index) => {
        if (row.trim()) context.fillText(row, 0, (index + 1) * portraitCell.height);
      });
      setReady(true);
    };

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) draw();
    });
    const resize = new ResizeObserver(draw);
    intersection.observe(wrapper);
    resize.observe(wrapper);

    return () => {
      intersection.disconnect();
      resize.disconnect();
    };
  }, []);

  return (
    <div className="hero-portrait" ref={wrapperRef} aria-hidden="true">
      <Image
        className="hero-portrait-fallback"
        src="/portraits/neutral-ascii.svg"
        alt=""
        width={700}
        height={1000}
        loading="eager"
        unoptimized
        style={{ visibility: ready ? "hidden" : "visible" }}
      />
      <canvas
        className="hero-portrait-canvas"
        ref={canvasRef}
        style={{ visibility: ready ? "visible" : "hidden" }}
      />
    </div>
  );
}
