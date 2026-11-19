"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

function subscribeToScroll(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

function getScrollSnapshot() {
  return window.scrollY > 24;
}

function getServerSnapshot() {
  return false;
}

export function SiteHeader() {
  const isCompact = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getServerSnapshot,
  );

  return (
    <header className={`site-header${isCompact ? " is-compact" : ""}`}>
      <div className="header-inner">
        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/#work">Work</Link>
          <Link href="/#about">About</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
      </div>
    </header>
  );
}
