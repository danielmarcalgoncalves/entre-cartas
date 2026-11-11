"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";
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
  sunset: "/images/nova-ui/sunset-trees-bg.jpg",
  meadow: "/images/nova-ui/chamomile-meadow-bg.jpg",
};

export function BetweenLettersLanding({
  initialBackground = "sunset",
  eyebrow = "A PLACE FOR THINGS WORTH REMEMBERING",
  title = "BETWEEN LETTERS",
  flourish = "✦",
  ctaHref = "/journal",
  ctaLabel = "TRY IT NOW",
  className = "",
}: BetweenLettersLandingProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTheme, setActiveTheme] = useState<"sunset" | "meadow">(initialBackground);
  const heroRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLElement>(null);
  const journalRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  // Support legacy password reset links (?token=...) or redirect authenticated users to My Desk
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const resetToken = params.get("token");
      if (resetToken) {
        router.replace(`/login?mode=reset&token=${encodeURIComponent(resetToken)}`);
        return;
      }
    }
    if (!loading && user) {
      router.replace("/my-desk");
    }
  }, [loading, user, router]);

  // Automatically cycle between the two backgrounds every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTheme((prev) => (prev === "sunset" ? "meadow" : "sunset"));
    }, 15000);

    return () => clearInterval(timer);
  }, []);

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

      // 4. Try it now interactive button entrance
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
  const resolvedHref = user ? "/my-desk" : ctaHref;

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
      {/* 1. Cinematic Background Layer with Smooth 15s Cross-Fading */}
      <LandingBackground ref={bgRef} activeTheme={activeTheme} />

      {/* 2. Hand-Drawn Sketched Title */}
      <LandingTitle
        ref={titleRef}
        eyebrow={eyebrow}
        title={title}
        flourish={flourish}
      />

      {/* 3. Notebooks Demonstration Showcase (Cycles every 5 seconds) */}
      <NotebookDisplay ref={journalRef} />

      {/* 4. Tactile 3D Interactive "TRY IT NOW" Button */}
      <TryItNowButton ref={btnRef} href={resolvedHref} label={ctaLabel} />
    </main>
  );
}

export default BetweenLettersLanding;
