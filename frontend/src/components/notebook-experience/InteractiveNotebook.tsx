"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { ClosedNotebook } from "./ClosedNotebook";
import { useNotebookOpening } from "./NotebookOpening";
import {
  NotebookPage,
  CANONICAL_PAGE_WIDTH,
  CANONICAL_PAGE_HEIGHT,
  JournalUserPage,
  JournalFrontispiecePage,
  JournalColophonPage,
  JournalEmptyPromptPage,
} from "./NotebookPage";
import { NotebookControls } from "./NotebookControls";
import { NotebookVideoBackground } from "./NotebookVideoBackground";
import {
  type Notebook,
  ACTIVE_NOTEBOOK_ID_KEY,
  JOURNAL_UPDATED_EVENT,
  SESSION_CLEARED_EVENT,
  filterWrittenPages,
  getNotebookById,
  getNotebookTheme,
  loadUserNotebooks,
  playPaperSound,
} from "@/lib/journal-storage";
import { useAuth } from "@/hooks/useAuth";
import "./notebook-experience.css";

type BookState = "closed" | "opening" | "open" | "closing";

const EMPTY_NOTEBOOK_FALLBACK: Notebook = {
  id: "default-journal",
  nome: "My Journal",
  corCapa: "marrom",
  paginas: [],
  criadoEm: "",
};

export function InteractiveNotebook() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const searchParams = useSearchParams();
  const requestedNotebookId = searchParams ? searchParams.get("id") || searchParams.get("notebook") : null;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  // Active Notebook resolution strictly from authenticated user's storage
  const [activeNotebook, setActiveNotebook] = useState<Notebook>(() => ({
    ...EMPTY_NOTEBOOK_FALLBACK,
    id: requestedNotebookId || "default-journal",
    criadoEm: new Date().toISOString(),
  }));

  useEffect(() => {
    const handleClear = () => {
      setActiveNotebook({
        ...EMPTY_NOTEBOOK_FALLBACK,
        id: "default-journal",
        criadoEm: new Date().toISOString(),
      });
    };
    window.addEventListener(SESSION_CLEARED_EVENT, handleClear);
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, handleClear);
    };
  }, []);

  // Sync with authenticated user's persistent storage
  useEffect(() => {
    if (authLoading || !userId) {
      if (!authLoading && !userId) {
        setActiveNotebook({
          ...EMPTY_NOTEBOOK_FALLBACK,
          id: "default-journal",
          criadoEm: new Date().toISOString(),
        });
      }
      return;
    }

    const handleSync = () => {
      if (requestedNotebookId) {
        const found = getNotebookById(requestedNotebookId, userId);
        if (found) {
          setActiveNotebook(found);
          return;
        }
      }
      const activeId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
      if (activeId) {
        const found = getNotebookById(activeId, userId);
        if (found) {
          setActiveNotebook(found);
          return;
        }
      }
      const all = loadUserNotebooks(userId);
      if (all.length > 0) {
        setActiveNotebook(all[0]);
      }
    };

    handleSync();
    window.addEventListener(JOURNAL_UPDATED_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [authLoading, requestedNotebookId, userId]);

  // Derive theme from active journal's cover color (Brown, Green, Wine, Black)
  const theme = useMemo(
    () => getNotebookTheme(activeNotebook.corCapa),
    [activeNotebook.corCapa]
  );

  // Extract real written pages
  const writtenPages = useMemo(
    () => filterWrittenPages(activeNotebook.paginas),
    [activeNotebook.paginas]
  );

  // Dynamic leaf calculation: 2 pages per leaf
  const leavesData = useMemo(() => {
    if (writtenPages.length === 0) {
      return [
        {
          id: "empty-leaf-0",
          frontPage: null,
          frontNumber: "01",
          backPage: null,
          backNumber: "02",
        },
      ];
    }

    const count = Math.ceil(writtenPages.length / 2);
    return Array.from({ length: count }).map((_, i) => ({
      id: `user-leaf-${i}`,
      frontPage: writtenPages[2 * i] || null,
      frontNumber: String(2 * i + 1).padStart(2, "0"),
      backPage: writtenPages[2 * i + 1] || null,
      backNumber: String(2 * i + 2).padStart(2, "0"),
    }));
  }, [writtenPages]);

  const totalLeaves = leavesData.length;
  const totalSpreads = totalLeaves + 1;

  // Dynamic Z coordinates based on leaves count
  const getRightZ = useCallback(
    (idx: number) => 2.0 + (totalLeaves - 1 - idx) * (5.0 / Math.max(totalLeaves, 1)),
    [totalLeaves]
  );
  const getLeftZ = useCallback(
    (idx: number) => 2.0 + idx * (5.0 / Math.max(totalLeaves, 1)),
    [totalLeaves]
  );

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

  const isAnimatingRef = useRef(false);
  const videoBusyRef = useRef(false);
  const busyCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spreadIndexRef = useRef(0);
  const bookStateRef = useRef<BookState>("closed");
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const setVideoBusy = useCallback((busy: boolean) => {
    if (busyCooldownTimerRef.current) {
      clearTimeout(busyCooldownTimerRef.current);
      busyCooldownTimerRef.current = null;
    }
    if (busy) {
      videoBusyRef.current = true;
    } else {
      busyCooldownTimerRef.current = setTimeout(() => {
        videoBusyRef.current = false;
        busyCooldownTimerRef.current = null;
      }, 1800);
    }
  }, []);

  // 3D DOM Refs
  const bookRigRef = useRef<HTMLDivElement | null>(null);
  const coverLeafRef = useRef<HTMLDivElement | null>(null);
  const coverFrontShadeRef = useRef<HTMLDivElement | null>(null);
  const coverBackShadeRef = useRef<HTMLDivElement | null>(null);
  const firstPageCastRef = useRef<HTMLDivElement | null>(null);
  const deskShadowRef = useRef<HTMLDivElement | null>(null);

  const innerLeafRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerFrontShadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerBackShadeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leftSpreadCastRef = useRef<HTMLDivElement | null>(null);
  const rightSpreadCastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    spreadIndexRef.current = spreadIndex;
  }, [spreadIndex]);

  useEffect(() => {
    bookStateRef.current = bookState;
  }, [bookState]);

  // Viewport lock
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onMqChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onMqChange);

    return () => {
      if (busyCooldownTimerRef.current) {
        clearTimeout(busyCooldownTimerRef.current);
      }
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      mq.removeEventListener("change", onMqChange);
    };
  }, []);

  // Responsive sizing
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

      let pageHeight = Math.min(640, maxBookHeight, maxSingleWidth / aspect);
      pageHeight = Math.max(206, pageHeight);
      const pageWidth = Math.round(pageHeight * aspect);
      pageHeight = Math.round(pageHeight);

      const scale = pageWidth / CANONICAL_PAGE_WIDTH;
      const closedScale = vw < 580 ? Math.min(1.26, Math.max(1, (vw - 68) / pageWidth)) : 1;

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

  // Sync resting transforms when metrics update
  useEffect(() => {
    if (!metrics.ready || isAnimatingRef.current) return;

    const isOpen = bookStateRef.current === "open";
    applyPostureImmediate(isOpen);

    leavesData.forEach((_, idx) => {
      const leafEl = innerLeafRefs.current[idx];
      if (!leafEl) return;
      const isTurnedLeft = idx < spreadIndexRef.current;
      gsap.set(leafEl, {
        rotationY: isTurnedLeft ? -180 : 0,
        z: isTurnedLeft ? getLeftZ(idx) : getRightZ(idx),
      });
      const fShade = innerFrontShadeRefs.current[idx];
      const bShade = innerBackShadeRefs.current[idx];
      if (fShade) gsap.set(fShade, { opacity: 0 });
      if (bShade) gsap.set(bShade, { opacity: 0 });
    });

    if (leftSpreadCastRef.current) gsap.set(leftSpreadCastRef.current, { opacity: 0 });
    if (rightSpreadCastRef.current) gsap.set(rightSpreadCastRef.current, { opacity: 0 });
  }, [metrics, leavesData, applyPostureImmediate, getLeftZ, getRightZ]);

  // Open notebook
  const handleOpenNotebook = useCallback(() => {
    if (isAnimatingRef.current || bookStateRef.current !== "closed") return;

    playPaperSound();
    isAnimatingRef.current = true;
    setVideoBusy(true);
    setIsAnimating(true);
    setBookState("opening");

    runOpeningSequence(() => {
      setBookState("open");
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setVideoBusy(false);
    });
  }, [runOpeningSequence, setVideoBusy]);

  // Close back to cover
  const handleCloseNotebook = useCallback(() => {
    if (
      isAnimatingRef.current ||
      bookStateRef.current !== "open" ||
      spreadIndexRef.current !== 0
    ) {
      return;
    }

    playPaperSound();
    isAnimatingRef.current = true;
    setVideoBusy(true);
    setIsAnimating(true);
    setHoverSide(null);
    setBookState("closing");

    runClosingSequence(() => {
      setBookState("closed");
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setVideoBusy(false);
    });
  }, [runClosingSequence, setVideoBusy]);

  // Page turning physics
  const animateLeafTurn = useCallback(
    (leafIdx: number, direction: "forward" | "backward") => {
      if (isAnimatingRef.current || bookStateRef.current !== "open") return;

      const leafEl = innerLeafRefs.current[leafIdx];
      if (!leafEl) return;

      playPaperSound();
      isAnimatingRef.current = true;
      setVideoBusy(true);
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
          const p = proxy.p;
          const angle = -180 * p;
          const zStart = getRightZ(leafIdx);
          const zEnd = getLeftZ(leafIdx);
          const zLinear = zStart + (zEnd - zStart) * p;
          const zArc = prefersReducedMotion ? 0 : Math.sin(p * Math.PI) * 9.5;

          gsap.set(leafEl, {
            rotationY: angle,
            z: zLinear + zArc,
          });

          if (frontShade) {
            const frontOpacity = Math.sin(p * Math.PI) * 0.44 * (1 - p * 0.3);
            gsap.set(frontShade, { opacity: frontOpacity });
          }

          if (backShade) {
            const backOpacity = Math.sin(p * Math.PI) * 0.48 * (0.3 + p * 0.7);
            gsap.set(backShade, { opacity: backOpacity });
          }

          if (direction === "forward") {
            if (rightCast) {
              const rOpacity = Math.sin(p * Math.PI * 0.8) * 0.28 * (1 - p);
              gsap.set(rightCast, { opacity: rOpacity });
            }
            if (leftCast && p > 0.45) {
              const lOpacity = Math.sin((p - 0.45) * 1.8) * 0.32;
              gsap.set(leftCast, { opacity: lOpacity });
            }
          } else {
            if (leftCast) {
              const lOpacity = Math.sin((1 - p) * Math.PI * 0.8) * 0.28 * p;
              gsap.set(leftCast, { opacity: lOpacity });
            }
            if (rightCast && p < 0.55) {
              const rOpacity = Math.sin((0.55 - p) * 1.8) * 0.32;
              gsap.set(rightCast, { opacity: rOpacity });
            }
          }
        },
        onComplete: () => {
          const newIndex = direction === "forward" ? leafIdx + 1 : leafIdx;
          setSpreadIndex(newIndex);
          spreadIndexRef.current = newIndex;

          gsap.set(leafEl, {
            rotationY: direction === "forward" ? -180 : 0,
            z: direction === "forward" ? getLeftZ(leafIdx) : getRightZ(leafIdx),
          });
          if (frontShade) gsap.set(frontShade, { opacity: 0 });
          if (backShade) gsap.set(backShade, { opacity: 0 });
          if (leftCast) gsap.set(leftCast, { opacity: 0 });
          if (rightCast) gsap.set(rightCast, { opacity: 0 });

          isAnimatingRef.current = false;
          setIsAnimating(false);
          setVideoBusy(false);
        },
      });
    },
    [prefersReducedMotion, setVideoBusy, getRightZ, getLeftZ]
  );

  const handleTurnNext = useCallback(() => {
    if (spreadIndexRef.current < totalSpreads - 1) {
      animateLeafTurn(spreadIndexRef.current, "forward");
    }
  }, [animateLeafTurn, totalSpreads]);

  const handleTurnPrev = useCallback(() => {
    if (spreadIndexRef.current > 0) {
      animateLeafTurn(spreadIndexRef.current - 1, "backward");
    }
  }, [animateLeafTurn]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (bookStateRef.current === "closed") {
          handleOpenNotebook();
        } else if (bookStateRef.current === "open") {
          handleTurnNext();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (bookStateRef.current === "open") {
          if (spreadIndexRef.current === 0) {
            handleCloseNotebook();
          } else {
            handleTurnPrev();
          }
        }
      } else if (e.key === "Escape") {
        if (bookStateRef.current === "open" && spreadIndexRef.current === 0) {
          handleCloseNotebook();
        } else {
          router.push("/my-shelf");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenNotebook, handleTurnNext, handleTurnPrev, handleCloseNotebook, router]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        if (bookState === "closed") handleOpenNotebook();
        else handleTurnNext();
      } else {
        if (bookState === "open") {
          if (spreadIndex === 0) handleCloseNotebook();
          else handleTurnPrev();
        }
      }
    }
  };

  const canGoPrev = bookState === "open" && spreadIndex > 0;
  const canGoNext = bookState === "open" && spreadIndex < totalSpreads - 1;

  const navigateToEditor = () => {
    try {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_ID_KEY, activeNotebook.id);
    } catch {}
    router.push(`/journal?notebook=${encodeURIComponent(activeNotebook.id)}`);
  };

  const navigateToShelf = () => {
    router.push("/my-shelf");
  };

  return (
    <section
      className="nb-experience-viewport"
      aria-label={`Realistic 3D journal: ${activeNotebook.nome}`}
    >
      {/* Topbar Navigation Bar */}
      <nav className="nb-topbar-nav" aria-label="Viewer navigation">
        <button
          type="button"
          className="nb-topbar-back-btn"
          onClick={navigateToShelf}
          title="Return to My Shelf archive"
        >
          <span>← Back to My Shelf</span>
        </button>

        <span className="nb-topbar-meta-title">
          {activeNotebook.nome} · {theme.nome} Leather
        </span>

        <button
          type="button"
          className="nb-topbar-edit-btn"
          onClick={navigateToEditor}
          title="Open this journal in writing desk"
        >
          <span>✎ Edit in Desk</span>
        </button>
      </nav>

      {/* Dreamy 35mm / Super 8 cinematic background video layer */}
      <NotebookVideoBackground isBusyRef={videoBusyRef} />

      {/* Central 3D Notebook Stage */}
      <div
        className="nb-stage"
        style={{ opacity: metrics.ready ? 1 : 0 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic floor shadow */}
        <div
          ref={deskShadowRef}
          className="nb-desk-shadow"
          style={{
            width: `${metrics.pageWidth * metrics.closedScale * 1.06}px`,
            height: `${Math.round(metrics.pageHeight * 0.94)}px`,
          }}
          aria-hidden="true"
        />

        {/* 3D Perspective Rig */}
        <div className="nb-perspective-camera">
          <div
            ref={bookRigRef}
            className={`nb-book-rig nb-book-rig--${bookState}`}
            style={{
              width: `${metrics.pageWidth}px`,
              height: `${metrics.pageHeight}px`,
            }}
          >
            {/* Back Hardcover Board in matching leather theme */}
            <div className={`nb-back-board nb-back-board--${theme.id}`} aria-hidden="true">
              <div
                className={`nb-open-left-board nb-open-left-board--${theme.id} ${
                  bookState === "open" || bookState === "opening"
                    ? "nb-open-left-board--visible"
                    : ""
                }`}
              />
            </div>

            {/* 3D Physical Spine Hinge */}
            <div className="nb-spine-hinge" aria-hidden="true" />

            {/* 3D Page Stacks */}
            <div className="nb-page-stack-right" aria-hidden="true" />
            <div className="nb-page-stack-bottom" aria-hidden="true" />

            {/* Fixed Right Base Page (Colophon Sanctuary Plate) */}
            <div className="nb-base-page" style={{ transform: "translateZ(0.8px)" }}>
              <NotebookPage
                side="right"
                pageNumber={String(totalLeaves * 2 + 1).padStart(2, "0")}
                variant="endpaper"
                scale={metrics.scale}
              >
                <JournalColophonPage
                  notebook={activeNotebook}
                  onContinueWriting={navigateToEditor}
                  onBackToShelf={navigateToShelf}
                />
              </NotebookPage>
            </div>

            {/* Dynamic Flippable Leaves with Real User Content */}
            {leavesData.map((leaf, idx) => {
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
                    transform: `translateZ(${getRightZ(idx)}px) rotateY(0deg)`,
                  }}
                >
                  {/* Front Face (Odd Right-Hand Page) */}
                  <div className="nb-leaf__face nb-leaf__face--front">
                    <NotebookPage
                      side="right"
                      pageNumber={leaf.frontNumber}
                      variant={leaf.frontPage?.tipoPapel === "cream" ? "parchment" : "ruled"}
                      scale={metrics.scale}
                      hideFolio={Boolean(leaf.frontPage)}
                    >
                      {leaf.frontPage ? (
                        <JournalUserPage
                          page={leaf.frontPage}
                          pageNumber={leaf.frontNumber}
                          side="right"
                          notebookName={activeNotebook.nome}
                        />
                      ) : (
                        <JournalEmptyPromptPage
                          notebook={activeNotebook}
                          onContinueWriting={navigateToEditor}
                        />
                      )}
                    </NotebookPage>

                    {isFirstInnerLeaf && (
                      <div
                        ref={firstPageCastRef}
                        className="nb-cover-cast-shadow"
                        aria-hidden="true"
                      />
                    )}

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
                      variant={leaf.backPage?.tipoPapel === "cream" ? "parchment" : "ruled"}
                      scale={metrics.scale}
                      hideFolio={Boolean(leaf.backPage)}
                    >
                      {leaf.backPage ? (
                        <JournalUserPage
                          page={leaf.backPage}
                          pageNumber={leaf.backNumber}
                          side="left"
                          notebookName={activeNotebook.nome}
                        />
                      ) : (
                        <JournalColophonPage
                          notebook={activeNotebook}
                          onContinueWriting={navigateToEditor}
                          onBackToShelf={navigateToShelf}
                        />
                      )}
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

            {/* Front Hardcover Leaf (Closed Cover on Front / Ex-Libris on Back) */}
            <div
              ref={coverLeafRef}
              className="nb-leaf nb-leaf--cover"
              style={{
                transform: "translateZ(9px) rotateY(0deg)",
                pointerEvents: bookState === "closed" ? "auto" : "none",
              }}
            >
              {/* Front Face: Pure CSS Leather Cover in Selected User Color */}
              <div className="nb-leaf__face nb-leaf__face--front nb-leaf__face--cover-front">
                <ClosedNotebook
                  isClosed={bookState === "closed"}
                  isAnimating={isAnimating}
                  onOpen={handleOpenNotebook}
                  onHoverTilt={animateClosedHover}
                  notebookTitle={activeNotebook.nome}
                  notebookColor={activeNotebook.corCapa}
                  theme={theme}
                  totalPages={writtenPages.length}
                />
                <div
                  ref={coverFrontShadeRef}
                  className="nb-leaf__shade nb-leaf__shade--front"
                  aria-hidden="true"
                />
              </div>

              {/* Back Face: Inside Front Cover (Personalized Ex-Libris Frontispiece) */}
              <div className="nb-leaf__face nb-leaf__face--back nb-leaf__face--cover-back">
                <NotebookPage
                  side="left"
                  variant="endpaper"
                  scale={metrics.scale}
                >
                  <JournalFrontispiecePage notebook={activeNotebook} />
                </NotebookPage>
                <div
                  ref={coverBackShadeRef}
                  className="nb-leaf__shade nb-leaf__shade--back"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Dynamic Spread Cast Shadows */}
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

            {/* Left & Right Page Click Regions */}
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
                  aria-label={canGoPrev ? "Turn to previous spread" : "First spread"}
                  title={canGoPrev ? "Previous page" : undefined}
                >
                  {canGoPrev && (
                    <span className="nb-edge-hint nb-edge-hint--left" aria-hidden="true">
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
                  aria-label={canGoNext ? "Turn to next spread" : "Last spread reached"}
                  title={canGoNext ? "Next page" : undefined}
                >
                  {canGoNext && (
                    <span className="nb-edge-hint nb-edge-hint--right" aria-hidden="true">
                      ›
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <NotebookControls
        isOpen={bookState === "open"}
        isAnimating={isAnimating}
        spreadIndex={spreadIndex}
        totalSpreads={totalSpreads}
        notebookName={activeNotebook.nome}
        notebookId={activeNotebook.id}
        onCloseBook={handleCloseNotebook}
        onBackToShelf={navigateToShelf}
        onContinueWriting={navigateToEditor}
      />
    </section>
  );
}

export default InteractiveNotebook;
