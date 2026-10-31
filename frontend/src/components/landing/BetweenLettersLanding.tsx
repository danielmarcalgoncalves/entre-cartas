"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import LandingBackground from "./LandingBackground";
import LandingTitle from "./LandingTitle";
import NotebookDisplay from "./NotebookDisplay";
import TryItNowButton from "./TryItNowButton";
import "./landing.css";

export interface BetweenLettersLandingProps {
  backgroundPhotoUrl?: string;
  meadowPhotoUrl?: string;
  flowerPhotoUrl?: string;
  eyebrow?: string;
  title?: string;
  flourish?: string;
  ctaHref?: string;
  ctaLabel?: string;
  photoCredit?: string;
  className?: string;
}

const DEFAULT_BG = "/images/landing/background.jpg";
const DEFAULT_MEADOW = "/images/landing/meadow.jpg";
const DEFAULT_FLOWER = "/images/landing/flower.jpg";

export function BetweenLettersLanding({
  backgroundPhotoUrl = DEFAULT_BG,
  meadowPhotoUrl = DEFAULT_MEADOW,
  flowerPhotoUrl = DEFAULT_FLOWER,
  eyebrow = "A PLACE FOR THINGS WORTH REMEMBERING",
  title = "Between Letters",
  flourish = "✦",
  ctaHref = "/journal",
  ctaLabel = "TRY IT NOW",
  photoCredit = "Field photograph by Annie Spratt · Unsplash",
  className = "",
}: BetweenLettersLandingProps) {
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

    // In reduced motion mode, rely on standard instant appearance
    if (prefersReducedMotion) {
      if (journalRef.current) journalRef.current.classList.add("animate-fallback");
      if (titleRef.current) titleRef.current.classList.add("animate-fallback");
      if (btnRef.current) btnRef.current.classList.add("animate-fallback");
      return;
    }

    const hero = heroRef.current;
    const bg = bgRef.current;
    const titleEl = titleRef.current;
    const journal = journalRef.current;
    const btn = btnRef.current;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      // 1. Smooth landscape wash appearance
      if (bg) {
        tl.fromTo(
          bg,
          { opacity: 0 },
          { opacity: 1, duration: 0.9, ease: "power1.inOut" },
          0
        );
      }

      // 2. Gradual entry of title plate
      if (titleEl) {
        tl.fromTo(
          titleEl,
          { opacity: 0, y: -16 },
          { opacity: 1, y: 0, duration: 0.85 },
          0.2
        );
      }

      // 3. Notebook emerging with gentle scale and opacity
      if (journal) {
        tl.fromTo(
          journal,
          { opacity: 0, y: 20, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 1.05, ease: "cubic.out" },
          0.35
        );

        // Subtle, slow breathing floating movement
        gsap.to(journal, {
          y: "-=3",
          duration: 4.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 1.4,
        });
      }

      // 4. Try it now button entrance
      if (btn) {
        tl.fromTo(
          btn,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.75 },
          0.65
        );
      }
    }, hero);

    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={heroRef}
      className={`hero ${className}`}
      style={
        {
          "--background-photo": `url("${backgroundPhotoUrl}")`,
        } as React.CSSProperties
      }
    >
      <LandingBackground ref={bgRef} imageUrl={backgroundPhotoUrl} />

      <LandingTitle
        ref={titleRef}
        eyebrow={eyebrow}
        title={title}
        flourish={flourish}
      />

      <NotebookDisplay
        ref={journalRef}
        meadowPhotoUrl={meadowPhotoUrl}
        flowerPhotoUrl={flowerPhotoUrl}
      />

      <TryItNowButton ref={btnRef} href={ctaHref} label={ctaLabel} />

      {photoCredit && <p className="photo-credit">{photoCredit}</p>}
    </main>
  );
}

export default BetweenLettersLanding;
