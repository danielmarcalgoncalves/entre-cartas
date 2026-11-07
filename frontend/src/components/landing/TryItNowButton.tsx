"use client";

import React, { forwardRef } from "react";
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
    ref
  ) => {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick) {
        onClick();
        return;
      }

      // Check if a journal desk/shelf exists on the current page
      const journalSection = document.getElementById("journal-desk") || document.getElementById("journal-shelf");
      if (journalSection) {
        e.preventDefault();
        journalSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // Direct to the journal page where the notebooks live
        e.preventDefault();
        router.push(href);
      }
    };

    return (
      <div className="try-it-now-collage-wrapper">
        <Link
          ref={ref}
          href={href}
          onClick={handleClick}
          className={`try-it-now-stopmotion-btn ${className}`}
          aria-label={`${label} — Open and customize your journal`}
          title="Click to open and customize your journal"
        >
          {/* Authentic Torn Kraft-Paper Ribbon Image */}
          <div className="torn-paper-banner">
            <img
              src="/images/nova-ui/try-it-now-cutout.png"
              alt={label}
              className="torn-paper-img"
              draggable={false}
            />
            {/* Hidden Accessible Text for Screen Readers */}
            <span className="sr-only">{label}</span>
          </div>
        </Link>
      </div>
    );
  }
);

TryItNowButton.displayName = "TryItNowButton";

export default TryItNowButton;
