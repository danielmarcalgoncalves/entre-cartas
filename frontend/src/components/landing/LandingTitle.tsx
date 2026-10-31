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
      title = "Between Letters",
      flourish = "✦",
      className = "",
    },
    ref
  ) => {
    return (
      <header ref={ref} className={`hero-header ${className}`} aria-label="Between Letters">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {flourish && (
          <span className="title-flourish" aria-hidden="true">
            {flourish}
          </span>
        )}
      </header>
    );
  }
);

LandingTitle.displayName = "LandingTitle";

export default LandingTitle;
