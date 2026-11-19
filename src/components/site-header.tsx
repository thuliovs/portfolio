import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header is-compact">
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
