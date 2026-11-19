import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>Thúlio Silva · Product Engineer</span>
      <nav className="footer-nav" aria-label="Footer navigation">
        <Link href="/#work">Work</Link>
        <Link href="/#about">About</Link>
        <Link href="/#contact">Contact</Link>
      </nav>
    </footer>
  );
}
