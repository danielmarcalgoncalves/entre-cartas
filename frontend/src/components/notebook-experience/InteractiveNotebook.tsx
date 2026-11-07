"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import gsap from "gsap";
import { ClosedNotebook } from "./ClosedNotebook";
import { useNotebookOpening } from "./NotebookOpening";
import {
  NotebookPage,
  CANONICAL_PAGE_WIDTH,
  CANONICAL_PAGE_HEIGHT,
  FrontispiecePage,
  MorningWindowPage,
  PressedBotanicalsPage,
  SecretCorrespondencePage,
  DuskReflectionsPage,
  MeadowKeepsakePage,
  AwaitingYourHandPage,
  ColophonSanctuaryPage,
} from "./NotebookPage";
import { NotebookControls } from "./NotebookControls";
import "./notebook-experience.css";

type BookState = "closed" | "opening" | "open" | "closing";

const TOTAL_SPREADS = 4;
const INNER_RIGHT_Z = [6.6, 4.6, 2.6] as const;
const INNER_LEFT_Z = [2.8, 4.8, 6.8] as const;

interface InnerLeafConfig {
  id: string;
  frontNumber: string;
  frontVariant: "ruled" | "parchment" | "linen" | "endpaper";
  FrontContent: React.ComponentType;
  backNumber: string;
  backVariant: "ruled" | "parchment" | "linen" | "endpaper";
  BackContent: React.ComponentType;
}

const INNER_LEAVES: InnerLeafConfig[] = [
  {
    id: "leaf-1",
    frontNumber: "01",
    frontVariant: "ruled",
    FrontContent: MorningWindowPage,
    backNumber: "02",
    backVariant: "parchment",
    BackContent: PressedBotanicalsPage,
  },
  {
    id: "leaf-2",
    frontNumber: "03",
    frontVariant: "linen",
    FrontContent: SecretCorrespondencePage,
    backNumber: "04",
    backVariant: "parchment",
    BackContent: DuskReflectionsPage,
  },
  {
    id: "leaf-3",
    frontNumber: "05",
    frontVariant: "ruled",
    FrontContent: MeadowKeepsakePage,
    backNumber: "06",
    backVariant: "ruled",
    BackContent: AwaitingYourHandPage,
  },
];

export function InteractiveNotebook() {
  const [bookState, setBookState] = useState<BookState>("closed");
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Responsive metrics computed to fit 100vw x 100dvh with zero scroll
  const [metrics, setMetrics] = useState({
    pageWidth: CANONICAL_PAGE_WIDTH,
    pageHeight: CANONICAL_PAGE_HEIGHT,
    scale: 1,
    closedScale: 1,
    ready: false,
  });

  // Synchronous animation lock to prevent simultaneous page turns
  const isAnimatingRef = useRef(false);
  const spreadIndexRef = useRef(0);
  const bookStateRef = useRef<BookState>("closed");
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // 3D DOM Refs
  const bookRigRef = useRef<HTMLDivElement | null>(null);
  const coverLeafRef = useRef<HTMLDivElement | null>(null);
  const coverFrontShadeRef = useRef<HTMLDivElement | null>(null);
  const coverBackShadeRef = useRef<HTMLDivElement | null>(null);
  const firstPageCastRef = useRef<HTMLDivElement | null>(null);
  const deskShadowRef = useRef<HTMLDivElement | null>(null);

  const innerLeafRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const innerFrontShadeRefs = useRef<(HTMLDivElement | null)[]>([
    null,
    null,
    null,
  ]);
  const innerBackShadeRefs = useRef<(HTMLDivElement | null)[]>([
    null,
    null,
    null,
  ]);
  const leftSpreadCastRef = useRef<HTMLDivElement | null>(null);
  const rightSpreadCastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    spreadIndexRef.current = spreadIndex;
  }, [spreadIndex]);

  useEffect(() => {
    bookStateRef.current = bookState;
  }, [bookState]);

  // Strict zero-scroll viewport lock while on /notebook
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onMqChange = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onMqChange);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      mq.removeEventListener("change", onMqChange);
    };
  }, []);

  // Compute responsive page dimensions so closed book, open 2-page spread, and button always fit 100%
  useEffect(() => {
    const computeSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const aspect = CANONICAL_PAGE_WIDTH / CANONICAL_PAGE_HEIGHT;

      const controlsReserve = vh < 660 ? 110 : 146;
      const verticalBreathing = vh < 660 ? 28 : 56;
      const horizontalMargin = vw < 520 ? 22 : vw < 900 ? 48 : 112;

      const maxSingleWidth = (vw - horizontalMargin) / 2;
      const maxBookHeight = vh - controlsReserve - verticalBreathing;

      let pageHeight = Math.min(522, maxBookHeight, maxSingleWidth / aspect);
      pageHeight = Math.max(206, pageHeight);
      const pageWidth = Math.round(pageHeight * aspect);
      pageHeight = Math.round(pageHeight);

      const scale = pageWidth / CANONICAL_PAGE_WIDTH;
      const closedScale =
        vw < 580 ? Math.min(1.26, Math.max(1, (vw - 68) / pageWidth)) : 1;

      setMetrics({
        pageWidth,
        pageHeight,
        scale,
        closedScale,
        ready: true,
      });
    };

    computeSize();
    window.addEventListener("resize", computeSize);
    return () => window.removeEventListener("resize", computeSize);
  }, []);

  const {
    applyPostureImmediate,
    animateClosedHover,
    runOpeningSequence,
    runClosingSequence,
  } = useNotebookOpening({
    refs: {
      bookRigRef,
      coverLeafRef,
      coverFrontShadeRef,
      coverBackShadeRef,
      firstPageCastRef,
      deskShadowRef,
    },
    pageWidth: metrics.pageWidth,
    closedScale: metrics.closedScale,
    prefersReducedMotion,
  });

  // Sync resting transforms whenever viewport metrics update (when not mid-animation)
  useEffect(() => {
    if (!metrics.ready || isAnimatingRef.current) return;

    const isOpen = bookStateRef.current === "open";
    applyPostureImmediate(isOpen);

    // Sync inner leaves resting Z & rotation according to current spreadIndex
    INNER_LEAVES.forEach((_, idx) => {
      const leafEl = innerLeafRefs.current[idx];
      if (!leafEl) return;
      const isTurnedLeft = idx < spreadIndexRef.current;
      gsap.set(leafEl, {
        rotationY: isTurnedLeft ? -180 : 0,
        z: isTurnedLeft ? INNER_LEFT_Z[idx] : INNER_RIGHT_Z[idx],
      });
      const fShade = innerFrontShadeRefs.current[idx];
      const bShade = innerBackShadeRefs.current[idx];
      if (fShade) gsap.set(fShade, { opacity: 0 });
      if (bShade) gsap.set(bShade, { opacity: 0 });
    });

    if (leftSpreadCastRef.current) {
      gsap.set(leftSpreadCastRef.current, { opacity: 0 });
    }
    if (rightSpreadCastRef.current) {
      gsap.set(rightSpreadCastRef.current, { opacity: 0 });
    }
  }, [metrics, applyPostureImmediate]);

  // Open the closed notebook
  const handleOpenNotebook = useCallback(() => {
    if (isAnimatingRef.current || bookStateRef.current !== "closed") return;

    isAnimatingRef.current = true;
    setIsAnimating(true);
    setBookState("opening");

    runOpeningSequence(() => {
      setBookState("open");
      isAnimatingRef.current = false;
      setIsAnimating(false);
    });
  }, [runOpeningSequence]);

  // Optional close back to physical closed cover (when on first spread)
  const handleCloseNotebook = useCallback(() => {
    if (
      isAnimatingRef.current ||
      bookStateRef.current !== "open" ||
      spreadIndexRef.current !== 0
    ) {
      return;
    }

    isAnimatingRef.current = true;
    setIsAnimating(true);
    setHoverSide(null);
    setBookState("closing");

    runClosingSequence(() => {
      setBookState("closed");
      isAnimatingRef.current = false;
      setIsAnimating(false);
    });
  }, [runClosingSequence]);

  // Core physical 3D page turn engine
  const animateLeafTurn = useCallback(
    (leafIdx: number, direction: "forward" | "backward") => {
      if (isAnimatingRef.current || bookStateRef.current !== "open") return;

      const leafEl = innerLeafRefs.current[leafIdx];
      if (!leafEl) return;

      isAnimatingRef.current = true;
      setIsAnimating(true);
      setHoverSide(null);

      const frontShade = innerFrontShadeRefs.current[leafIdx];
      const backShade = innerBackShadeRefs.current[leafIdx];
      const leftCast = leftSpreadCastRef.current;
      const rightCast = rightSpreadCastRef.current;

      const startP = direction === "forward" ? 0 : 1;
      const endP = direction === "forward" ? 1 : 0;
      const proxy = { p: startP };
      const duration = prefersReducedMotion ? 0.28 : 0.92;

      gsap.to(proxy, {
        p: endP,
        duration,
        ease: "power2.inOut",
        onUpdate: () => {
          const p = proxy.p; // 0 = flat right (0deg), 1 = flat left (-180deg)
          const angle = -180 * p;
          const zStart = INNER_RIGHT_Z[leafIdx];
          const zEnd = INNER_LEFT_Z[leafIdx];
          const zLinear = zStart + (zEnd - zStart) * p;
          const zArc = prefersReducedMotion ? 0 : Math.sin(p * Math.PI) * 9.5;

          gsap.set(leafEl, {
            rotationY: angle,
            z: zLinear + zArc,
          });

          // Self-shading on the rotating sheet
          const arcSin = Math.sin(p * Math.PI);
          if (frontShade) {
            gsap.set(frontShade, {
              opacity: p < 0.52 ? arcSin * 0.34 : 0,
            });
          }
          if (backShade) {
            gsap.set(backShade, {
              opacity: p >= 0.48 ? arcSin * 0.34 : 0,
            });
          }

          // Dynamic cast shadows on underlying right and left page stacks
          if (rightCast) {
            const rightOpacity = p < 0.65 ? Math.sin((p / 0.65) * Math.PI) * 0.34 : 0;
            gsap.set(rightCast, { opacity: rightOpacity });
          }
          if (leftCast) {
            const leftOpacity =
              p > 0.35 ? Math.sin(((p - 0.35) / 0.65) * Math.PI) * 0.34 : 0;
            gsap.set(leftCast, { opacity: leftOpacity });
          }
        },
        onComplete: () => {
          const finalTurned = direction === "forward";
          gsap.set(leafEl, {
            rotationY: finalTurned ? -180 : 0,
            z: finalTurned ? INNER_LEFT_Z[leafIdx] : INNER_RIGHT_Z[leafIdx],
          });
          if (frontShade) gsap.set(frontShade, { opacity: 0 });
          if (backShade) gsap.set(backShade, { opacity: 0 });
          if (leftCast) gsap.set(leftCast, { opacity: 0 });
          if (rightCast) gsap.set(rightCast, { opacity: 0 });

          const nextSpread =
            direction === "forward" ? leafIdx + 1 : leafIdx;
          spreadIndexRef.current = nextSpread;
          setSpreadIndex(nextSpread);

          isAnimatingRef.current = false;
          setIsAnimating(false);
        },
      });
    },
    [prefersReducedMotion]
  );

  const handleTurnNext = useCallback(() => {
    if (isAnimatingRef.current || bookStateRef.current !== "open") return;
    const current = spreadIndexRef.current;
    if (current >= TOTAL_SPREADS - 1) return;
    animateLeafTurn(current, "forward");
  }, [animateLeafTurn]);

  const handleTurnPrev = useCallback(() => {
    if (isAnimatingRef.current || bookStateRef.current !== "open") return;
    const current = spreadIndexRef.current;
    if (current <= 0) return;
    animateLeafTurn(current - 1, "backward");
  }, [animateLeafTurn]);

  // Keyboard navigation support (ArrowRight / ArrowLeft)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isAnimatingRef.current) return;
      if (bookStateRef.current === "open") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          handleTurnNext();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleTurnPrev();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleTurnNext, handleTurnPrev]);

  // Touch swipe navigation on open spread
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (bookState !== "open" || isAnimating) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (
      bookState !== "open" ||
      isAnimating ||
      touchStartXRef.current === null ||
      touchStartYRef.current === null
    ) {
      return;
    }

    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    const dy = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) {
        handleTurnNext();
      } else {
        handleTurnPrev();
      }
    }
  };

  const canGoPrev = bookState === "open" && spreadIndex > 0;
  const canGoNext = bookState === "open" && spreadIndex < TOTAL_SPREADS - 1;

  return (
    <section
      className="nb-experience-viewport"
      aria-label="Between Letters interactive notebook presentation"
    >
      {/* Subtle warm cream paper grain & ambient radial vignette */}
      <div className="nb-experience-backdrop" aria-hidden="true" />

      {/* Central 3D Notebook Stage */}
      <div
        className="nb-stage"
        style={{
          opacity: metrics.ready ? 1 : 0,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic soft desk shadow anchored beneath the notebook */}
        <div
          ref={deskShadowRef}
          className="nb-desk-shadow"
          style={{
            width: `${metrics.pageWidth * metrics.closedScale * 1.06}px`,
            height: `${Math.round(metrics.pageHeight * 0.94)}px`,
          }}
          aria-hidden="true"
        />

        {/* 3D Perspective Wrapper */}
        <div className="nb-perspective-camera">
          <div
            ref={bookRigRef}
            className={`nb-book-rig nb-book-rig--${bookState}`}
            style={{
              width: `${metrics.pageWidth}px`,
              height: `${metrics.pageHeight}px`,
            }}
          >
            {/* Back Hardcover Leather Board (Rustic Brown overhang) */}
            <div className="nb-back-board" aria-hidden="true">
              {/* Left open-board overhang visible once cover opens */}
              <div
                className={`nb-open-left-board ${
                  bookState === "open" || bookState === "opening"
                    ? "nb-open-left-board--visible"
                    : ""
                }`}
              />
            </div>

            {/* 3D Physical Spine Ridge along x = 0 */}
            <div className="nb-spine-hinge" aria-hidden="true" />

            {/* 3D Cream Page-Block Thickness (Fore-edge & Bottom Edge) */}
            <div className="nb-page-stack-right" aria-hidden="true" />
            <div className="nb-page-stack-bottom" aria-hidden="true" />

            {/* Fixed Right Base Page (Page 07 — Colophon Sanctuary) */}
            <div
              className="nb-base-page"
              style={{ transform: "translateZ(0.8px)" }}
            >
              <NotebookPage
                side="right"
                pageNumber="07"
                variant="endpaper"
                scale={metrics.scale}
              >
                <ColophonSanctuaryPage />
              </NotebookPage>
            </div>

            {/* Inner Flippable Leaves (Leaves 1, 2, 3) */}
            {INNER_LEAVES.map((leaf, idx) => {
              const FrontComp = leaf.FrontContent;
              const BackComp = leaf.BackContent;
              const isFirstInnerLeaf = idx === 0;
              const showRightCurl =
                hoverSide === "right" &&
                bookState === "open" &&
                !isAnimating &&
                spreadIndex === idx;
              const showLeftCurl =
                hoverSide === "left" &&
                bookState === "open" &&
                !isAnimating &&
                spreadIndex === idx + 1;

              return (
                <div
                  key={leaf.id}
                  ref={(el) => {
                    innerLeafRefs.current[idx] = el;
                  }}
                  className={`nb-leaf ${
                    showRightCurl ? "nb-leaf--peek-right" : ""
                  } ${showLeftCurl ? "nb-leaf--peek-left" : ""}`}
                  style={{
                    transform: `translateZ(${INNER_RIGHT_Z[idx]}px) rotateY(0deg)`,
                  }}
                >
                  {/* Front Face (Odd Right-Hand Page) */}
                  <div className="nb-leaf__face nb-leaf__face--front">
                    <NotebookPage
                      side="right"
                      pageNumber={leaf.frontNumber}
                      variant={leaf.frontVariant}
                      scale={metrics.scale}
                    >
                      <FrontComp />
                    </NotebookPage>

                    {/* Cover cast shadow during initial opening on Page 01 */}
                    {isFirstInnerLeaf && (
                      <div
                        ref={firstPageCastRef}
                        className="nb-cover-cast-shadow"
                        aria-hidden="true"
                      />
                    )}

                    {/* Dynamic page-turn light/shadow overlay */}
                    <div
                      ref={(el) => {
                        innerFrontShadeRefs.current[idx] = el;
                      }}
                      className="nb-leaf__shade nb-leaf__shade--front"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Back Face (Even Left-Hand Page) */}
                  <div className="nb-leaf__face nb-leaf__face--back">
                    <NotebookPage
                      side="left"
                      pageNumber={leaf.backNumber}
                      variant={leaf.backVariant}
                      scale={metrics.scale}
                    >
                      <BackComp />
                    </NotebookPage>

                    <div
                      ref={(el) => {
                        innerBackShadeRefs.current[idx] = el;
                      }}
                      className="nb-leaf__shade nb-leaf__shade--back"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}

            {/* Leaf 0: Physical Front Hardcover (Exterior Leather + Inside Ex-Libris) */}
            <div
              ref={coverLeafRef}
              className="nb-leaf nb-leaf--cover"
              style={{
                transform: "translateZ(9px) rotateY(0deg)",
                pointerEvents: bookState === "closed" ? "auto" : "none",
              }}
            >
              {/* Front Face: Pure CSS Rustic Leather Cover */}
              <div className="nb-leaf__face nb-leaf__face--front nb-leaf__face--cover-front">
                <ClosedNotebook
                  isClosed={bookState === "closed"}
                  isAnimating={isAnimating}
                  onOpen={handleOpenNotebook}
                  onHoverTilt={animateClosedHover}
                />
                <div
                  ref={coverFrontShadeRef}
                  className="nb-leaf__shade nb-leaf__shade--front"
                  aria-hidden="true"
                />
              </div>

              {/* Back Face: Inside Front Cover (Ex-Libris Frontispiece) */}
              <div className="nb-leaf__face nb-leaf__face--back nb-leaf__face--cover-back">
                <NotebookPage
                  side="left"
                  variant="endpaper"
                  scale={metrics.scale}
                >
                  <FrontispiecePage />
                </NotebookPage>
                <div
                  ref={coverBackShadeRef}
                  className="nb-leaf__shade nb-leaf__shade--back"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Dynamic Cast Shadows over Resting Left & Right Page Stacks */}
            <div
              ref={leftSpreadCastRef}
              className="nb-spread-cast nb-spread-cast--left"
              aria-hidden="true"
            />
            <div
              ref={rightSpreadCastRef}
              className="nb-spread-cast nb-spread-cast--right"
              aria-hidden="true"
            />

            {/* Left & Right Page Click Regions (Active when Notebook is Open) */}
            {bookState === "open" && (
              <>
                <button
                  type="button"
                  className={`nb-hit-zone nb-hit-zone--left ${
                    canGoPrev ? "nb-hit-zone--active" : "nb-hit-zone--bound"
                  }`}
                  onClick={handleTurnPrev}
                  onMouseEnter={() => canGoPrev && setHoverSide("left")}
                  onMouseLeave={() => setHoverSide(null)}
                  disabled={!canGoPrev || isAnimating}
                  aria-label={
                    canGoPrev
                      ? "Turn to previous spread"
                      : "First spread reached"
                  }
                  title={canGoPrev ? "Previous page" : undefined}
                >
                  {canGoPrev && (
                    <span
                      className="nb-edge-hint nb-edge-hint--left"
                      aria-hidden="true"
                    >
                      ‹
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`nb-hit-zone nb-hit-zone--right ${
                    canGoNext ? "nb-hit-zone--active" : "nb-hit-zone--bound"
                  }`}
                  onClick={handleTurnNext}
                  onMouseEnter={() => canGoNext && setHoverSide("right")}
                  onMouseLeave={() => setHoverSide(null)}
                  disabled={!canGoNext || isAnimating}
                  aria-label={
                    canGoNext ? "Turn to next spread" : "Last spread reached"
                  }
                  title={canGoNext ? "Next page" : undefined}
                >
                  {canGoNext && (
                    <span
                      className="nb-edge-hint nb-edge-hint--right"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Button & Whisper Indicator */}
      <NotebookControls
        isOpen={bookState === "open"}
        isAnimating={isAnimating}
        spreadIndex={spreadIndex}
        totalSpreads={TOTAL_SPREADS}
        onCloseBook={handleCloseNotebook}
      />
    </section>
  );
}

export default InteractiveNotebook;
