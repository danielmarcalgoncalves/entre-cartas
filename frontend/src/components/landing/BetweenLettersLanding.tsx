"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import LandingBackground from "./LandingBackground";
import LandingTitle from "./LandingTitle";
import NotebookDisplay from "./NotebookDisplay";
import TryItNowButton from "./TryItNowButton";
import "./landing.css";

export interface BetweenLettersLandingProps {
  initialBackground?: "meadow" | "sunset";
  eyebrow?: string;
  title?: string;
  flourish?: string;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
}

const BACKGROUNDS = {
  meadow: "/images/nova-ui/chamomile-meadow-bg.jpg",
  sunset: "/images/nova-ui/sunset-trees-bg.jpg",
};

export function BetweenLettersLanding({
  initialBackground = "meadow",
  eyebrow = "A PLACE FOR THINGS WORTH REMEMBERING",
  title = "BETWEEN LETTERS",
  flourish = "✦",
  ctaHref = "/journal",
  ctaLabel = "TRY IT NOW",
  className = "",
}: BetweenLettersLandingProps) {
  const [activeTheme, setActiveTheme] = useState<"meadow" | "sunset">(initialBackground);
  const heroRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLElement>(null);
  const journalRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !heroRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const hero = heroRef.current;
    const bg = bgRef.current;
    const titleEl = titleRef.current;
    const journal = journalRef.current;
    const btn = btnRef.current;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      // 1. Natural photographic wash appearance
      if (bg) {
        tl.fromTo(
          bg,
          { opacity: 0 },
          { opacity: 1, duration: 1.1, ease: "power1.inOut" },
          0
        );
      }

      // 2. Sketched title entrance
      if (titleEl) {
        tl.fromTo(
          titleEl,
          { opacity: 0, y: -20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.95 },
          0.25
        );
      }

      // 3. Notebook emerging with gentle physical depth
      if (journal) {
        tl.fromTo(
          journal,
          { opacity: 0, y: 24, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "cubic.out" },
          0.4
        );
      }

      // 4. Try it now stopmotion button entrance
      if (btn) {
        tl.fromTo(
          btn,
          { opacity: 0, y: 16, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8 },
          0.7
        );
      }
    }, hero);

    return () => ctx.revert();
  }, []);

  const currentBgUrl = BACKGROUNDS[activeTheme];

  return (
    <main
      ref={heroRef}
      className={`hero hero-nova-ui ${className}`}
      style={
        {
          "--background-photo": `url("${currentBgUrl}")`,
        } as React.CSSProperties
      }
    >
      {/* 1. Cinematic Background Layer */}
      <LandingBackground ref={bgRef} imageUrl={currentBgUrl} />

      {/* 2. Atmosphere / Scene Mood Switcher (Meadow / Sunset) */}
      <div className="hero-atmosphere-switch" aria-label="Alternar atmosfera do cenário">
        <button
          type="button"
          className={`atmosphere-pill ${activeTheme === "meadow" ? "atmosphere-pill--active" : ""}`}
          onClick={() => setActiveTheme("meadow")}
          title="Modo Campo de Camomila"
        >
          <span>🌾 Camomila</span>
        </button>
        <button
          type="button"
          className={`atmosphere-pill ${activeTheme === "sunset" ? "atmosphere-pill--active" : ""}`}
          onClick={() => setActiveTheme("sunset")}
          title="Modo Pôr do Sol na Floresta"
        >
          <span>🌅 Pôr do Sol</span>
        </button>
      </div>

      {/* 3. Hand-Drawn Sketched Title */}
      <LandingTitle
        ref={titleRef}
        eyebrow={eyebrow}
        title={title}
        flourish={flourish}
      />

      {/* 4. Notebooks Demonstration Showcase (Cycles every 5 seconds) */}
      <NotebookDisplay ref={journalRef} />

      {/* 5. Stop-Motion Paper Collage "TRY IT NOW" Button */}
      <TryItNowButton ref={btnRef} href={ctaHref} label={ctaLabel} />
    </main>
  );
}

export default BetweenLettersLanding;
