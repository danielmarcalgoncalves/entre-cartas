"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface HandwrittenIntroProps {
  onComplete?: () => void;
}

const INTRO_STORAGE_KEY = "between-letters:intro-seen";

export default function HandwrittenIntro({ onComplete }: HandwrittenIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sweepPathRef = useRef<SVGPathElement>(null);
  const underlineRef = useRef<SVGPathElement>(null);
  const nibRef = useRef<SVGCircleElement>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // Check if user already saw the intro during this browser session
    try {
      if (sessionStorage.getItem(INTRO_STORAGE_KEY) === "true") {
        setIsDismissed(true);
        onComplete?.();
        return;
      }
    } catch {
      // Ignore sessionStorage errors (e.g. incognito restrictions)
    }

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, "true");
      } catch {}
      setIsDismissed(true);
      onComplete?.();
      return;
    }

    const sweepEl = sweepPathRef.current;
    const underlineEl = underlineRef.current;
    const nibEl = nibRef.current;

    if (!sweepEl || !underlineEl) return;

    const sweepLength = sweepEl.getTotalLength();
    const underlineLength = underlineEl.getTotalLength();

    // Set initial stroke-dash values
    gsap.set(sweepEl, {
      strokeDasharray: sweepLength,
      strokeDashoffset: sweepLength,
    });
    gsap.set(underlineEl, {
      strokeDasharray: underlineLength,
      strokeDashoffset: underlineLength,
      opacity: 0,
    });

    if (nibEl) {
      const startPt = sweepEl.getPointAtLength(0);
      gsap.set(nibEl, {
        cx: startPt.x,
        cy: startPt.y,
        opacity: 1,
      });
    }

    const markSeen = () => {
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, "true");
      } catch {}
    };

    // Master Timeline: Total writing duration is ~1.95s (well within 1.5s - 2.5s)
    const tl = gsap.timeline({
      onComplete: () => {
        markSeen();
        gsap.to(containerRef.current, {
          opacity: 0,
          scale: 0.995,
          duration: 0.55,
          ease: "power2.inOut",
          onComplete: () => {
            setIsDismissed(true);
            onComplete?.();
          },
        });
      },
    });

    // 1. Fluid, continuous progressive cursive ink reveal (1.55s)
    tl.to(sweepEl, {
      strokeDashoffset: 0,
      duration: 1.55,
      ease: "power1.inOut",
      onUpdate: () => {
        if (nibEl && sweepEl) {
          const currentOffset = parseFloat(
            sweepEl.style.strokeDashoffset || String(sweepLength)
          );
          const currentProgress = 1 - currentOffset / sweepLength;
          const dist = Math.min(Math.max(currentProgress * sweepLength, 0), sweepLength);
          const pt = sweepEl.getPointAtLength(dist);
          gsap.set(nibEl, { cx: pt.x, cy: pt.y });
        }
      },
    })
      // 2. Hide pen nib & trace the delicate flourish underline (0.35s)
      .to(
        nibEl,
        {
          opacity: 0,
          duration: 0.1,
        },
        "-=0.1"
      )
      .set(underlineEl, { opacity: 1 }, "-=0.08")
      .to(
        underlineEl,
        {
          strokeDashoffset: 0,
          duration: 0.35,
          ease: "power1.out",
        },
        "-=0.05"
      );

    // Fast-skip on click or keyboard press
    const handleSkip = () => {
      tl.kill();
      markSeen();
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: "power1.out",
        onComplete: () => {
          setIsDismissed(true);
          onComplete?.();
        },
      });
    };

    const containerEl = containerRef.current;
    containerEl?.addEventListener("click", handleSkip);
    window.addEventListener("keydown", handleSkip);

    return () => {
      tl.kill();
      containerEl?.removeEventListener("click", handleSkip);
      window.removeEventListener("keydown", handleSkip);
    };
  }, [onComplete]);

  if (isDismissed) return null;

  return (
    <div
      ref={containerRef}
      className="handwritten-intro-screen"
      role="banner"
      aria-label="Between Letters calligraphy opening animation"
    >
      <div className="handwritten-intro-inner">
        <span className="handwritten-intro-eyebrow">
          AN ARCHIVE OF SENTIMENTS
        </span>

        <svg
          viewBox="0 0 1000 240"
          className="classic-serif-svg"
          aria-hidden="true"
        >
          <defs>
            {/* Ink Reveal Mask for Classical Serif Letterforms */}
            <mask id="serif-write-mask" maskUnits="userSpaceOnUse">
              <path
                ref={sweepPathRef}
                id="mask-sweep"
                d="M 140 135 C 220 128, 300 136, 390 130 C 480 126, 570 134, 660 130 C 730 128, 800 135, 860 135"
                fill="none"
                stroke="#ffffff"
                strokeWidth="110"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </mask>

            {/* Warm Golden Pollen & Birch Paper Ink Gradient */}
            <linearGradient id="ink-gold-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-pollen, #cfa96f)" />
              <stop offset="50%" stopColor="var(--color-birch-paper, #ece1c9)" />
              <stop offset="100%" stopColor="var(--color-pollen, #cfa96f)" />
            </linearGradient>

            <filter id="pen-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Classical Serif Typography: Cormorant Garamond */}
          <g mask="url(#serif-write-mask)">
            <text
              x="500"
              y="142"
              textAnchor="middle"
              className="classic-serif-text"
              fill="url(#ink-gold-grad)"
            >
              Between Letters
            </text>
          </g>

          {/* Delicate Archival Flourish Underline */}
          <path
            ref={underlineRef}
            id="serif-underline"
            d="M 310 178 C 435 173, 565 173, 690 178"
            fill="none"
            stroke="var(--color-pollen, #cfa96f)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ opacity: 0 }}
          />

          {/* Active Ink Nib Point */}
          <circle
            ref={nibRef}
            r="4.5"
            fill="var(--color-pollen, #cfa96f)"
            filter="url(#pen-glow)"
            className="pen-nib-point"
            style={{ opacity: 0 }}
          />
        </svg>

        <span className="handwritten-intro-hint">
          Click anywhere or press any key to enter
        </span>

        <span className="sr-only">Between Letters</span>
      </div>
    </div>
  );
}
