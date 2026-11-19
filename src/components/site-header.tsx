"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

function subscribeToHeroPosition(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("scroll", onStoreChange, { passive: true });
  window.addEventListener("resize", onStoreChange, { passive: true });

  return () => {
    observer.disconnect();
    window.removeEventListener("scroll", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

function isPastHero() {
  const hero = document.querySelector(".hero-section");
  if (hero) return hero.getBoundingClientRect().bottom <= 0;
  return window.location.pathname !== "/";
}

function getServerSnapshot() {
  return false;
}

export function SiteHeader() {
  const isVisible = useSyncExternalStore(
    subscribeToHeroPosition,
    isPastHero,
    getServerSnapshot,
  );

  return (
    <header
      className={`site-header is-compact${isVisible ? " is-visible" : ""}`}
      aria-hidden={!isVisible}
      inert={!isVisible}
    >
      <div className="header-inner">
        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/#about">About</Link>
          <Link href="/#work">Work</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
      </div>
    </header>
  );
}
