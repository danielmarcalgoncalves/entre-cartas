import type { ReactNode } from "react";

type PaperProps = {
  children: ReactNode;
  className?: string;
  tape?: boolean;
};

export function Paper({ children, className = "", tape = false }: PaperProps) {
  return <section className={`paper-panel ${className}`}>{tape && <span className="tape" aria-hidden="true" />}{children}</section>;
}

export function TornPaper({ children, className = "", tape = false }: PaperProps) {
  return <section className={`paper-panel torn ${className}`}>{tape && <span className="tape" aria-hidden="true" />}{children}</section>;
}
