import React, { forwardRef } from "react";
import Link from "next/link";

export interface TryItNowButtonProps {
  href?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export const TryItNowButton = forwardRef<HTMLAnchorElement, TryItNowButtonProps>(
  ({ href = "/journal", label = "TRY IT NOW", className = "", onClick }, ref) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={`enter-button ${className}`}
        onClick={onClick}
        aria-label="Enter writing experience - Try it now"
      >
        <span>{label}</span>
        <i aria-hidden="true">↝</i>
      </Link>
    );
  }
);

TryItNowButton.displayName = "TryItNowButton";

export default TryItNowButton;
