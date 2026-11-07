import React, { forwardRef } from "react";

export interface LandingBackgroundProps {
  activeTheme?: "sunset" | "meadow";
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export const LandingBackground = forwardRef<HTMLDivElement, LandingBackgroundProps>(
  ({ activeTheme = "sunset", className = "", children }, ref) => {
    return (
      <div
        ref={ref}
        className={`landing-background-layer ${className}`}
        aria-hidden="true"
      >
        {/* Layer 1: Forest Sunset (Dark Twilight Woods) */}
        <div
          className={`landing-bg-image ${
            activeTheme === "sunset"
              ? "landing-bg-image--active"
              : "landing-bg-image--inactive"
          }`}
          style={{ backgroundImage: `url("/images/nova-ui/sunset-trees-bg.jpg")` }}
        />

        {/* Layer 2: Chamomile Meadow (Soft Blooming Fields) */}
        <div
          className={`landing-bg-image ${
            activeTheme === "meadow"
              ? "landing-bg-image--active"
              : "landing-bg-image--inactive"
          }`}
          style={{ backgroundImage: `url("/images/nova-ui/chamomile-meadow-bg.jpg")` }}
        />

        <div className="hero-wash" />
        <div className="film-grain" />
        {children}
      </div>
    );
  }
);

LandingBackground.displayName = "LandingBackground";

export default LandingBackground;
