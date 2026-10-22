import type { ReactNode } from "react";

type PlainTextProps = {
  children: ReactNode;
  as?: "p" | "span" | "div";
  className?: string;
};

export default function PlainText({ children, as = "p", className = "" }: PlainTextProps) {
  const Element = as;
  return <Element className={`plain-text ${className}`.trim()}>{children}</Element>;
}
