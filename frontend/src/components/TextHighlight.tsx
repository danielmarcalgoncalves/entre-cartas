"use client";

import React, { useEffect, useRef, ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface TextHighlightProps {
  children: ReactNode;
  variant?: "pollen" | "terracotta" | "olive";
  className?: string;
  delay?: number;
}

/**
 * TextHighlight Component
 * Reveals an animated highlighter stroke as the user scrolls past the text,
 * inspired by the editorial highlighter reference.
 * Supports multi-line inline text wrapping via box-decoration-break: clone.
 */
export default function TextHighlight({
  children,
  variant = "pollen",
  className = "",
  delay = 0,
}: TextHighlightProps) {
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !markRef.current) return;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      markRef.current.classList.add("active");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const el = markRef.current;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        if (delay > 0) {
          setTimeout(() => {
            el?.classList.add("active");
          }, delay * 1000);
        } else {
          el?.classList.add("active");
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, [delay]);

  return (
    <mark
      ref={markRef}
      className={`editorial-highlight editorial-highlight--${variant} ${className}`}
    >
      {children}
    </mark>
  );
}
