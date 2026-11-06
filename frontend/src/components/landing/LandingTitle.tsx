import React, { forwardRef } from "react";

export interface LandingTitleProps {
  eyebrow?: string;
  title?: string;
  flourish?: string;
  className?: string;
}

export const LandingTitle = forwardRef<HTMLElement, LandingTitleProps>(
  (
    {
      eyebrow = "A PLACE FOR THINGS WORTH REMEMBERING",
      title = "BETWEEN LETTERS",
      flourish = "✦",
      className = "",
    },
    ref
  ) => {
    return (
      <header
        ref={ref}
        className={`hero-header sketch-title-container ${className}`}
        aria-label="Between Letters"
      >
        {/* SVG Filter for realistic hand-drawn pencil/graphite edges */}
        <svg
          className="pencil-filter-svg"
          aria-hidden="true"
          style={{ position: "absolute", width: 0, height: 0 }}
        >
          <filter id="pencil-sketch-filter" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045"
              numOctaves="3"
              result="pencilNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="pencilNoise"
              scale="2.2"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feMerge>
              <feMergeNode in="displaced" />
            </feMerge>
          </filter>
        </svg>

        {/* Vintage Paper Tape Eyebrow */}
        <div className="sketch-eyebrow-wrap">
          <span className="eyebrow sketch-eyebrow">
            <span className="eyebrow-star">✦</span>
            <span>{eyebrow}</span>
            <span className="eyebrow-star">✦</span>
          </span>
        </div>

        {/* Sketched Hand-Drawn Title */}
        <div className="sketch-title-wrapper" title="Between Letters — Arquivo Epistolar">
          <h1 className="sketch-title" data-text={title}>
            {title.split("").map((char, idx) => (
              <span
                key={idx}
                className={`sketch-letter ${char === " " ? "sketch-space" : ""}`}
                style={{
                  animationDelay: `${(idx * 0.08).toFixed(2)}s`,
                }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h1>

          {/* Hand-drawn sketched understroke */}
          <svg
            className="sketch-underline"
            viewBox="0 0 420 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3 13C60 6 150 16 230 11C310 6 390 14 417 9"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="4 2 8 3"
            />
            <path
              d="M18 17C85 13 180 18 270 14C340 11 395 16 410 13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>
        </div>

        {flourish && (
          <span className="title-flourish sketch-flourish" aria-hidden="true">
            {flourish}
          </span>
        )}
      </header>
    );
  }
);

LandingTitle.displayName = "LandingTitle";

export default LandingTitle;
