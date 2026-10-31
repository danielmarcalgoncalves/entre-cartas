import React, { forwardRef } from "react";

export interface LandingBackgroundProps {
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_BACKGROUND = "/images/landing/background.jpg";

export const LandingBackground = forwardRef<HTMLDivElement, LandingBackgroundProps>(
  ({ imageUrl = DEFAULT_BACKGROUND, className = "", children }, ref) => {
    return (
      <div
        ref={ref}
        className={`landing-background-layer ${className}`}
        aria-hidden="true"
        style={
          {
            "--background-photo": `url("${imageUrl}")`,
          } as React.CSSProperties
        }
      >
        <div className="hero-wash" />
        <div className="film-grain" />
        {children}
      </div>
    );
  }
);

LandingBackground.displayName = "LandingBackground";

export default LandingBackground;
