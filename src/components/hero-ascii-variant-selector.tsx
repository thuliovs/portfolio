"use client";

import dynamic from "next/dynamic";

// Only the selected engine and its portrait maps need to be hydrated.
// The route selection itself stays on the server in page.tsx.
const Bust = dynamic(() => import("./hero-ascii-engine-bust")
  .then((module) => module.HeroAsciiEngine));
const HeadOnly = dynamic(() => import("./hero-ascii-engine")
  .then((module) => module.HeroAsciiEngine));
const BustBaseline = dynamic(() => import("./hero-ascii-engine-variant-bust-test")
  .then((module) => module.HeroAsciiEngine));

export function HeroAsciiVariantSelector({
  portrait,
}: {
  portrait: "bust" | "head-only" | "variant-bust-test";
}) {
  if (portrait === "head-only") return <HeadOnly />;
  if (portrait === "variant-bust-test") return <BustBaseline />;
  return <Bust />;
}
