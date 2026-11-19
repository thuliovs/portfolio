import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

export default function M3NexusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="case-main">
      <div className="case-wrap">
        <Link className="back-link" href="/#work">
          <ArrowIcon />
          Back to selected work
        </Link>
        <article className="case-content">{children}</article>
      </div>
    </main>
  );
}
