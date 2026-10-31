"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export function ParallaxHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const arrowBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const container = containerRef.current;
    const triggerElement = container.querySelector("[data-parallax-layers]");

    // Setup Lenis Smooth Scroll
    let lenis: Lenis | null = null;
    let tickerCallback: ((time: number) => void) | null = null;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!prefersReducedMotion) {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });

      lenis.on("scroll", ScrollTrigger.update);

      tickerCallback = (time: number) => {
        lenis?.raf(time * 1000);
      };

      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);
    }

    // GSAP Context to ensure complete scoped cleanup
    const ctx = gsap.context(() => {
      if (triggerElement && !prefersReducedMotion) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        // Layer 1: Backdrop Atmosphere (slow upward drift)
        tl.to(
          container.querySelectorAll('[data-parallax-layer="1"]'),
          { yPercent: 25, ease: "none" },
          0
        );

        // Layer 2: Archival Postal Seals & Watermarks (medium speed)
        tl.to(
          container.querySelectorAll('[data-parallax-layer="2"]'),
          { yPercent: 42, ease: "none" },
          0
        );

        // Layer 3: Centerpiece Scrapbook Collage & Journal Desk
        tl.to(
          container.querySelectorAll('[data-parallax-layer="3"]'),
          { yPercent: 60, scale: 0.98, ease: "none" },
          0
        );

        // Layer 4: Editorial Title Plate (drifts upward and gently fades)
        tl.to(
          container.querySelectorAll('[data-parallax-layer="4"]'),
          { yPercent: -30, opacity: 0.2, ease: "none" },
          0
        );

        // Layer 5: Foreground Ambient Lens Vignette (fastest movement for 3D depth)
        tl.to(
          container.querySelectorAll('[data-parallax-layer="5"]'),
          { yPercent: 85, ease: "none" },
          0
        );
      }

      // Micro-animation for Explore Arrow Button (faithfully adapted from reference)
      const arrowEl = arrowRef.current;
      const btnEl = arrowBtnRef.current;

      if (arrowEl && btnEl) {
        const handleMouseEnter = () => {
          gsap.to(arrowEl, {
            y: 8,
            duration: 0.8,
            ease: "back.inOut(3)",
            overwrite: "auto",
          });
        };

        const handleMouseLeave = () => {
          gsap.to(arrowEl, {
            y: 0,
            duration: 0.5,
            ease: "power3.out",
            overwrite: "auto",
          });
        };

        const handleClick = () => {
          const target = document.getElementById("interactive-gallery-anchor");
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          } else {
            window.scrollBy({ top: window.innerHeight * 0.9, behavior: "smooth" });
          }
        };

        btnEl.addEventListener("mouseenter", handleMouseEnter);
        btnEl.addEventListener("mouseleave", handleMouseLeave);
        btnEl.addEventListener("click", handleClick);

        return () => {
          btnEl.removeEventListener("mouseenter", handleMouseEnter);
          btnEl.removeEventListener("mouseleave", handleMouseLeave);
          btnEl.removeEventListener("click", handleClick);
        };
      }
    }, container);

    return () => {
      if (tickerCallback) {
        gsap.ticker.remove(tickerCallback);
      }
      ctx.revert();
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === triggerElement) st.kill();
      });
    };
  }, []);

  return (
    <div className="parallax" ref={containerRef} id="parallax-hero">
      <section className="parallax__header" aria-label="Between Letters cinematic introduction">
        <div className="parallax__visuals">
          <div className="parallax__black-line-overflow" />

          <div data-parallax-layers className="parallax__layers">
            {/* Layer 1: Atmospheric Deep Botanical Canvas */}
            <div data-parallax-layer="1" className="parallax__layer-wrapper">
              <img
                src="/images/botanical-wide.jpg"
                loading="eager"
                alt="Atmospheric deep botanical scenery"
                className="parallax__layer-img parallax__layer-base"
              />
              <div className="parallax__dim-overlay" />
            </div>

            {/* Layer 2: Intermediate Archival Motifs, Postal Seals & Watermark */}
            <div data-parallax-layer="2" className="parallax__layer-decor">
              <div className="parallax__postal-stamp-wrap">
                <img
                  src="/brand-seal.svg"
                  alt="Archival Between Letters seal watermark"
                  className="parallax__seal-watermark"
                  aria-hidden="true"
                />
                <span className="parallax__archival-coordinates">
                  EST. MMXXIV · EPISTOLARY REFUGE · LAT 40° N
                </span>
              </div>
            </div>

            {/* Layer 3: Authentic Scrapbook Journal & Memories Collage */}
            <div data-parallax-layer="3" className="parallax__layer-wrapper">
              <img
                src="/hero-collage.webp"
                loading="eager"
                alt="Open antique scrapbook journal with pressed botanicals, wax seal, and vintage photograph"
                className="parallax__layer-img parallax__collage-img"
              />
              <div className="parallax__collage-vignette" />
            </div>

            {/* Layer 4: Editorial Title Plate & Interactive Explore Control */}
            <div data-parallax-layer="4" className="parallax__layer-title">
              <div className="parallax__title-plate">
                <div className="parallax__tag-wrap">
                  <span className="parallax__tag-star" aria-hidden="true">✳</span>
                  <span className="parallax__tag">ARCHIVE OF SENTIMENTS</span>
                  <span className="parallax__tag-star" aria-hidden="true">✳</span>
                </div>

                <h1 className="parallax__title">Between Letters</h1>

                <p className="parallax__subtitle">
                  A gentle refuge for your memories &amp; words.
                </p>

                {/* Explore Button & Bouncing Arrow from Reference */}
                <button
                  ref={arrowBtnRef}
                  type="button"
                  id="arrow-btn"
                  className="parallax__explore-btn"
                  aria-label="Scroll down to explore presentation"
                >
                  <span className="parallax__explore-text">EXPLORE ARCHIVE</span>
                  <svg
                    ref={arrowRef}
                    className="parallax__arrow-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 4V18M12 18L6 12M12 18L18 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Layer 5: Foreground Ambient Lens Vignette & Warm Golden Light */}
            <div data-parallax-layer="5" className="parallax__layer-foreground">
              <div className="parallax__lens-vignette" />
              <div className="parallax__grain-overlay" />
            </div>
          </div>

          <div className="parallax__fade" />
        </div>
      </section>

      {/* Anchor for Smooth Scroll from Explore Button */}
      <div id="interactive-gallery-anchor" />
    </div>
  );
}

export default ParallaxHero;
export { ParallaxHero as ParallaxComponent };
