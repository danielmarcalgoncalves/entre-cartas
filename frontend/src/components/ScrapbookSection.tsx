import Link from "next/link";
import type { ReactNode } from "react";

type ScrapbookSectionProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
};

export default function ScrapbookSection({ eyebrow, title, children, href, linkLabel = "View archive", className = "" }: ScrapbookSectionProps) {
  return (
    <section className={`section-block ${className}`}>
      <div className="section-heading">
        <div>
          {eyebrow && <p className="section-kicker">{eyebrow}</p>}
          <h2 className="section-title">{title}</h2>
        </div>
        {href && <Link href={href} className="text-link">{linkLabel} <span aria-hidden="true">↗</span></Link>}
      </div>
      {children}
    </section>
  );
}
