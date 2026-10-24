"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { categories, type Letter } from "@/lib/letters";
import { useArchive } from "@/components/archive-store";

export function Paper({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "article" | "section" }) {
  return <Tag className={`paper ${className}`}>{children}</Tag>;
}

export function TornPaper({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <span className={`torn-paper ${className}`} style={style}>{children}</span>;
}

export function Envelope({ children, variant = "cream", className = "" }: { children?: ReactNode; variant?: string; className?: string }) {
  return (
    <div className={`envelope envelope--${variant} ${className}`} aria-hidden={children ? undefined : true}>
      <span className="envelope__flap" />
      <span className="envelope__seal">✦</span>
      {children}
    </div>
  );
}

export function Stamp({ children, className = "", muted = false }: { children: ReactNode; className?: string; muted?: boolean }) {
  return <span className={`ink-stamp ${muted ? "ink-stamp--muted" : ""} ${className}`}>{children}</span>;
}

export function Sticker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`paper-sticker ${className}`}>{children}</span>;
}

export function Tape({ className = "" }: { className?: string }) {
  return <span className={`washi-tape ${className}`} aria-hidden="true" />;
}

export function Polaroid({ src, alt, caption, className = "" }: { src?: string; alt?: string; caption?: string; className?: string }) {
  return (
    <figure className={`polaroid ${className}`}>
      <div className="polaroid__image">
        {src ? <img src={src} alt={alt || "Polaroid photograph"} /> : <div className="polaroid__placeholder"><span>📷</span><small>photo of the day</small></div>}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function CategoryLabel({ categoryId, href }: { categoryId: string; href?: string }) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return null;
  const style = { "--category-color": category.color } as CSSProperties;
  return href ? (
    <Link href={href} className={`category-label category-label--${category.id}`} style={style}>
      {category.name}
    </Link>
  ) : (
    <span className={`category-label category-label--${category.id}`} style={style}>
      {category.name}
    </span>
  );
}

export function ScrapbookSection({
  eyebrow,
  title,
  children,
  href,
  linkLabel = "View archive",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <section className="scrapbook-section">
      <div className="scrapbook-section__head">
        <div>
          <span className="section-kicker">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {href && (
          <Link href={href} className="text-link">
            {linkLabel}
            <span aria-hidden="true"> ↗</span>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function Folder({
  label,
  note,
  count,
  href,
  color = "#c8a778",
  className = "",
}: {
  label: string;
  note: string;
  count: number;
  href: string;
  color?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`folder ${className}`} style={{ "--folder-color": color } as CSSProperties}>
      <span className="folder__tab" />
      <span className="folder__line" />
      <span className="folder__label">{label}</span>
      <span className="folder__note">{note}</span>
      <span className="folder__count">{count} {count === 1 ? "letter" : "letters"}</span>
      <span className="folder__corner" aria-hidden="true">✦</span>
    </Link>
  );
}

export function LetterCard({ letter, compact = false }: { letter: Letter; compact?: boolean }) {
  const { isSaved, toggleSaved } = useArchive();
  const saved = isSaved(letter.id);

  return (
    <motion.article
      layout
      whileHover={{ y: -5, rotate: -0.5 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
      className={`letter-object letter-object--${letter.artifact} ${compact ? "letter-object--compact" : ""}`}
    >
      <div className="letter-object__head">
        <CategoryLabel categoryId={letter.category} />
        <span className="letter-object__date">{letter.date}</span>
      </div>
      <Link href={`/cartas/${letter.id}`} className="letter-object__body">
        <span className="letter-object__artifact" aria-hidden="true">
          <Envelope variant={letter.artifact} />
          <span className="letter-object__postmark">✳</span>
          <AnimatePresence initial={false}>
            {saved && (
              <motion.span
                key="archive-stamp"
                className="letter-object__archive-stamp"
                initial={{ scale: 1.8, rotate: -22, opacity: 0 }}
                animate={{ scale: 1, rotate: -11, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
              >
                <Stamp className="archive-paper-stamp">ARCHIVED</Stamp>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="letter-object__content">
          <span className="letter-object__title">{letter.title}</span>
          <span className="letter-object__excerpt">“{letter.excerpt}”</span>
          <span className="letter-object__sender">{letter.sender}</span>
        </span>
      </Link>
      <div className="letter-object__foot">
        <span className="reading-time">{letter.readingTime}</span>
        <button
          className={`archive-action ${saved ? "is-archived" : ""}`}
          type="button"
          onClick={() => toggleSaved(letter.id)}
          aria-label={saved ? `Remove ${letter.title} from archive` : `Archive ${letter.title}`}
          aria-pressed={saved}
        >
          <AnimatePresence mode="wait" initial={false}>
            {saved ? (
              <motion.span key="saved" className="archive-action__label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Remove <span aria-hidden="true">↶</span>
              </motion.span>
            ) : (
              <motion.span key="save" className="archive-action__label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Save <span aria-hidden="true">↗</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.article>
  );
}
