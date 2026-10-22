import type { ReactNode } from "react";

type EnvelopeProps = { type?: "envelope" | "postcard" | "crumpled"; seal?: boolean; label?: string };

export function Envelope({ type = "envelope", seal = true, label }: EnvelopeProps) {
  return (
    <div className={`envelope-art ${type}`} aria-label={label ?? "Correspondência de papel"} role="img">
      <div className="envelope-face" />
      {seal && <span className="envelope-seal" aria-hidden="true">✦</span>}
    </div>
  );
}

export function Stamp({ label, tone = "red" }: { label: string; tone?: "red" | "blue" | "olive" }) {
  return <span className={`stamp-mark ${tone}`}>{label}</span>;
}

export function WaxSeal({ mark = "E" }: { mark?: string }) {
  return <span className="wax-seal" aria-label="Lacre de cera">{mark}</span>;
}

export function Tape({ className = "" }: { className?: string }) {
  return <span className={`tape ${className}`} aria-hidden="true" />;
}

export function Sticker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`sticker ${className}`}>{children}</span>;
}

export function Polaroid({ caption = "um instante guardado" }: { caption?: string }) {
  return (
    <figure className="polaroid">
      <div className="polaroid-photo" aria-label="Ilustração decorativa de uma paisagem antiga" role="img">
        <svg viewBox="0 0 180 120" fill="none" aria-hidden="true">
          <rect width="180" height="120" fill="#cfc1a8" />
          <circle cx="130" cy="31" r="17" fill="#e5d7bd" />
          <path d="M0 92L48 52L80 86L113 44L180 102V120H0V92Z" fill="#898875" />
          <path d="M0 103L47 70L85 101L125 70L180 108V120H0V103Z" fill="#697261" />
          <path d="M0 112H180V120H0V112Z" fill="#b7a686" />
          <path d="M30 47C31 27 42 18 52 15C61 20 69 32 67 50M46 44L32 33M52 39L65 27" stroke="#5d634f" strokeWidth="3" />
        </svg>
      </div>
      <figcaption className="polaroid-caption">{caption}</figcaption>
    </figure>
  );
}

export function NewspaperSnippet({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="newspaper-snippet"><h3 className="news-title">{title}</h3><p className="news-body">{children}</p></aside>;
}

export function PaperTag({ children }: { children: ReactNode }) {
  return <span className="sticker" style={{ clipPath: "polygon(0 5%, 95% 0, 100% 92%, 4% 100%)" }}>{children}</span>;
}
