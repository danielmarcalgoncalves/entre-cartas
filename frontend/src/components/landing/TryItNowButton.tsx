"use client";

import React, { forwardRef, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface TryItNowButtonProps {
  href?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export const TryItNowButton = forwardRef<HTMLAnchorElement, TryItNowButtonProps>(
  (
    {
      href = "/journal",
      label = "TRY IT NOW",
      className = "",
      onClick,
    },
    forwardedRef
  ) => {
    const router = useRouter();
    const buttonRef = useRef<HTMLAnchorElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        onClick();
        return;
      }

      // Check if a journal desk/shelf exists on the current page
      const journalSection =
        document.getElementById("journal-desk") ||
        document.getElementById("journal-shelf");
      if (journalSection) {
        e.preventDefault();
        journalSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        e.preventDefault();
        router.push(href);
      }
    };

    // Interactive 3D tilt tracking the cursor, matching the notebook display
    const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Natural, tactile paper tilt
      const rotX = ((y - centerY) / centerY) * -6;
      const rotY = ((x - centerX) / centerX) * 6;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (buttonRef.current) {
          buttonRef.current.style.transform = `perspective(900px) rotateX(${rotX.toFixed(
            2
          )}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-3px) scale(1.025)`;
        }
        if (shadowRef.current) {
          shadowRef.current.style.transform = `translateX(-50%) scale(${1 + Math.abs(rotY) * 0.015}) translateY(${Math.abs(rotX) * 0.3}px)`;
          shadowRef.current.style.opacity = "0.75";
        }
      });
    };

    const handleMouseLeave = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (buttonRef.current) {
        buttonRef.current.style.transform =
          "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)";
      }
      if (shadowRef.current) {
        shadowRef.current.style.transform = "translateX(-50%) scale(1) translateY(0px)";
        shadowRef.current.style.opacity = "0.55";
      }
    };

    // Combine forwarded ref from parent GSAP context with internal tilt ref
    const setCombinedRef = (node: HTMLAnchorElement | null) => {
      buttonRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
      }
    };

    return (
      <div className="try-it-now-collage-wrapper">
        {/* Soft paper contact shadow */}
        <div ref={shadowRef} className="try-it-now-ambient-shadow" aria-hidden="true" />

        <Link
          ref={setCombinedRef}
          href={href}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`try-it-now-vintage-ticket ${className}`}
          aria-label={`${label} — Open your writing desk`}
          title="Click to open your journal and explore handwritten entries"
        >
          {/* Inner vintage printed ticket line */}
          <span className="vintage-ticket-inner-border" aria-hidden="true" />

          {/* Simple vintage typewriter text & arrow */}
          <span className="vintage-ticket-label">
            {label}
            <span className="vintage-ticket-arrow" aria-hidden="true">
              →
            </span>
          </span>
        </Link>
      </div>
    );
  }
);

TryItNowButton.displayName = "TryItNowButton";

export default TryItNowButton;
