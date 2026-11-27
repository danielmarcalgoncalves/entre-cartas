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
  JournalBlankContinuationPage,
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
  loadAllRawNotebooks,
  loadUserNotebooks,
  playPaperSound,
} from "@/lib/journal-storage";
import { useAuth } from "@/hooks/useAuth";
import { useGuestDemo } from "@/hooks/useGuestDemo";
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
  const { guestNotebooks, guestActiveNotebookId } = useGuestDemo();
  const userId = user?.id ? String(user.id) : null;
  const searchParams = useSearchParams();
  const requestedNotebookId = searchParams ? searchParams.get("id") || searchParams.get("notebook") : null;

  // Active Notebook resolution from authenticated user's storage (or guest/local fallback)
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

  // Sync with persistent storage (authenticated or guest session)
  useEffect(() => {
    const handleSync = () => {
      if (userId) {
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
          return;
        }
      }

      // Guest / local storage resolution
      const rawAll = loadAllRawNotebooks();
      const pool = rawAll.length > 0 ? rawAll : guestNotebooks;
      const targetId =
        requestedNotebookId ||
        window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY) ||
        guestActiveNotebookId;
      if (targetId) {
        const found = pool.find((nb) => nb.id === targetId);
        if (found) {
          setActiveNotebook(found);
          return;
        }
      }
      if (pool.length > 0) {
        setActiveNotebook(pool[0]);
      }
    };

    handleSync();
    window.addEventListener(JOURNAL_UPDATED_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [authLoading, requestedNotebookId, userId, guestNotebooks, guestActiveNotebookId]);

  // Derive theme from active journal's cover color (Brown, Green, Wine, Black)
  const theme = useMemo(
    () => getNotebookTheme(activeNotebook.corCapa),
    [activeNotebook.corCapa]
  );

  // Extract real written pages only (never generate fake or placeholder pages)
  const writtenPages = useMemo(
    () => filterWrittenPages(activeNotebook.paginas),
    [activeNotebook.paginas]
  );

  const totalSpreads = Math.max(1, Math.ceil(writtenPages.length / 2));

  // Spread s shows writtenPages[2*s] on the left and writtenPages[2*s + 1] on the right.
  // Cover back face is left of Spread 0 (writtenPages[0]).
  // Inner flippable leaf i (0 .. totalSpreads - 2) has:
  //   frontPage = right of Spread i (writtenPages[2*i + 1])
  //   backPage  = left of Spread i+1 (writtenPages[2*(i + 1)])
  // Fixed right base page is right of final Spread (writtenPages[2*(totalSpreads - 1) + 1]).
  const leavesData = useMemo(() => {
    const innerCount = Math.max(0, totalSpreads - 1);
    return Array.from({ length: innerCount }).map((_, i) => ({
      id: `user-leaf-${i}`,
      frontPage: writtenPages[2 * i + 1] || null,
      frontNumber: String(2 * i + 2).padStart(2, "0"),
      backPage: writtenPages[2 * (i + 1)] || null,
      backNumber: String(2 * (i + 1) + 1).padStart(2, "0"),
    }));
  }, [writtenPages, totalSpreads]);

  const firstLeftPage = writtenPages[0] || null;
  const finalRightPage = writtenPages[2 * (totalSpreads - 1) + 1] || null;
  const finalRightPageNumber = String(2 * totalSpreads).padStart(2, "0");
  // Visual-only blank continuation page shown on the right of the final spread
  // strictly when the last actual written page lands on the left (odd count > 0).
  const lastWrittenPage = writtenPages.length > 0 ? writtenPages[writtenPages.length - 1] : null;
  const showBlankContinuationPage =
    writtenPages.length > 0 && writtenPages.length % 2 === 1 && !finalRightPage;

  const totalLeaves = leavesData.length;

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
  const [mobileSpreadSide, setMobileSpreadSide] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Responsive metrics computed to fit 100vw x 100dvh with zero scroll
  const [metrics, setMetrics] = useState({
    pageWidth: CANONICAL_PAGE_WIDTH,
    pageHeight: CANONICAL_PAGE_HEIGHT,
    scale: 1,
    closedScale: 1,
    isSinglePageView: false,
    ready: false,
  });

  const isAnimatingRef = useRef(false);
  const videoBusyRef = useRef(false);
  const busyCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spreadIndexRef = useRef(0);
  const mobileSpreadSideRef = useRef<"left" | "right">("left");
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
    mobileSpreadSideRef.current = mobileSpreadSide;
  }, [mobileSpreadSide]);

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
      const isSinglePageView = vw < 640;

      const controlsReserve = vh < 660 ? 116 : 146;
      const verticalBreathing = vh < 660 ? 24 : 52;
      const horizontalMargin = isSinglePageView ? 28 : vw < 900 ? 48 : 112;

      const maxSingleWidth = isSinglePageView
        ? vw - horizontalMargin
        : (vw - horizontalMargin) / 2;
      const maxBookHeight = vh - controlsReserve - verticalBreathing;

      let pageHeight = Math.min(640, maxBookHeight, maxSingleWidth / aspect);
      pageHeight = Math.max(206, pageHeight);
      const pageWidth = Math.round(pageHeight * aspect);
      pageHeight = Math.round(pageHeight);

      const scale = pageWidth / CANONICAL_PAGE_WIDTH;
      const closedScale = isSinglePageView
        ? Math.min(1.04, Math.max(0.92, (vw - 36) / Math.max(1, pageWidth)))
        : vw < 768
        ? Math.min(1.16, Math.max(1, (vw - 68) / Math.max(1, pageWidth)))
        : 1;

      setMetrics({
        pageWidth,
        pageHeight,
        scale,
        closedScale,
        isSinglePageView,
        ready: true,
      });
    };

    computeSize();
    window.addEventListener("resize", computeSize);
    return () => window.removeEventListener("resize", computeSize);
  }, []);

  const openShiftX = metrics.isSinglePageView
    ? mobileSpreadSide === "left"
      ? metrics.pageWidth
      : 0
    : metrics.pageWidth / 2;

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
    openShiftX,
    isSinglePageView: metrics.isSinglePageView,
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
    mobileSpreadSideRef.current = "left";
    setMobileSpreadSide("left");
    setBookState("opening");

    runOpeningSequence(() => {
      setBookState("open");
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setVideoBusy(false);
    });
  }, [runOpeningSequence, setVideoBusy]);

  // Close back to cover (from any spread, including closing at the end of the journal)
  const handleCloseNotebook = useCallback(() => {
    if (isAnimatingRef.current || bookStateRef.current !== "open") {
      return;
    }

    playPaperSound();
    isAnimatingRef.current = true;
    setVideoBusy(true);
    setIsAnimating(true);
    setHoverSide(null);
    setBookState("closing");

    const closeDuration = prefersReducedMotion ? 0.25 : 0.72;
    leavesData.forEach((_, idx) => {
      const leafEl = innerLeafRefs.current[idx];
      if (!leafEl) return;
      gsap.to(leafEl, {
        rotationY: 0,
        z: getRightZ(idx),
        duration: closeDuration,
        ease: "power2.inOut",
      });
      const fShade = innerFrontShadeRefs.current[idx];
      const bShade = innerBackShadeRefs.current[idx];
      if (fShade) gsap.set(fShade, { opacity: 0 });
      if (bShade) gsap.set(bShade, { opacity: 0 });
    });

    runClosingSequence(() => {
      spreadIndexRef.current = 0;
      setSpreadIndex(0);
      mobileSpreadSideRef.current = "left";
      setMobileSpreadSide("left");
      setBookState("closed");
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setVideoBusy(false);
    });
  }, [runClosingSequence, setVideoBusy, leavesData, getRightZ, prefersReducedMotion]);

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

  const glideMobileRigSide = useCallback(
    (targetSide: "left" | "right") => {
      mobileSpreadSideRef.current = targetSide;
      setMobileSpreadSide(targetSide);
      if (bookRigRef.current) {
        gsap.to(bookRigRef.current, {
          x: targetSide === "left" ? metrics.pageWidth : 0,
          duration: prefersReducedMotion ? 0.14 : 0.42,
          ease: "power2.inOut",
        });
      }
    },
    [metrics.pageWidth, prefersReducedMotion]
  );

  const handleTurnNext = useCallback(() => {
    if (bookStateRef.current !== "open" || isAnimatingRef.current) return;

    if (metrics.isSinglePageView) {
      if (mobileSpreadSideRef.current === "left") {
        const hasRightPageOnCurrentSpread =
          spreadIndexRef.current < totalSpreads - 1 ||
          Boolean(finalRightPage) ||
          showBlankContinuationPage;
        if (hasRightPageOnCurrentSpread) {
          playPaperSound();
          glideMobileRigSide("right");
          return;
        }
        handleCloseNotebook();
        return;
      }

      if (spreadIndexRef.current < totalSpreads - 1) {
        glideMobileRigSide("left");
        animateLeafTurn(spreadIndexRef.current, "forward");
      } else {
        handleCloseNotebook();
      }
      return;
    }

    if (spreadIndexRef.current < totalSpreads - 1) {
      animateLeafTurn(spreadIndexRef.current, "forward");
    } else if (bookStateRef.current === "open") {
      handleCloseNotebook();
    }
  }, [
    metrics.isSinglePageView,
    totalSpreads,
    finalRightPage,
    showBlankContinuationPage,
    glideMobileRigSide,
    animateLeafTurn,
    handleCloseNotebook,
  ]);

  const handleTurnPrev = useCallback(() => {
    if (bookStateRef.current !== "open" || isAnimatingRef.current) return;

    if (metrics.isSinglePageView) {
      if (mobileSpreadSideRef.current === "right") {
        playPaperSound();
        glideMobileRigSide("left");
        return;
      }
      if (spreadIndexRef.current > 0) {
        glideMobileRigSide("right");
        animateLeafTurn(spreadIndexRef.current - 1, "backward");
      }
      return;
    }

    if (spreadIndexRef.current > 0) {
      animateLeafTurn(spreadIndexRef.current - 1, "backward");
    }
  }, [metrics.isSinglePageView, glideMobileRigSide, animateLeafTurn]);

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

  const canGoPrev =
    bookState === "open" &&
    (spreadIndex > 0 || (metrics.isSinglePageView && mobileSpreadSide === "right"));
  const canGoNext =
    bookState === "open" &&
    (spreadIndex < totalSpreads - 1 ||
      (metrics.isSinglePageView &&
        mobileSpreadSide === "left" &&
        (Boolean(finalRightPage) || showBlankContinuationPage)));

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

            {/* Fixed Right Base Page (Real final right page, or visual-only blank continuation page when last written page is on the left) */}
            {(finalRightPage || showBlankContinuationPage) && (
              <div className="nb-base-page" style={{ transform: "translateZ(0.8px)" }}>
                <NotebookPage
                  side="right"
                  pageNumber={finalRightPage ? finalRightPageNumber : ""}
                  variant={
                    (finalRightPage?.tipoPapel || lastWrittenPage?.tipoPapel) === "cream"
                      ? "parchment"
                      : "ruled"
                  }
                  scale={metrics.scale}
                  hideFolio
                >
                  {finalRightPage ? (
                    <JournalUserPage
                      page={finalRightPage}
                      pageNumber={finalRightPageNumber}
                      side="right"
                      notebookName={activeNotebook.nome}
                    />
                  ) : (
                    <JournalBlankContinuationPage tipoPapel={lastWrittenPage?.tipoPapel} />
                  )}
                </NotebookPage>
              </div>
            )}

            {/* Dynamic Flippable Leaves with Real User Content Only */}
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
                  {/* Front Face (Right-Hand Page of Spread idx) */}
                  <div className="nb-leaf__face nb-leaf__face--front">
                    <NotebookPage
                      side="right"
                      pageNumber={leaf.frontNumber}
                      variant={leaf.frontPage?.tipoPapel === "cream" ? "parchment" : "ruled"}
                      scale={metrics.scale}
                      hideFolio
                    >
                      {leaf.frontPage ? (
                        <JournalUserPage
                          page={leaf.frontPage}
                          pageNumber={leaf.frontNumber}
                          side="right"
                          notebookName={activeNotebook.nome}
                        />
                      ) : null}
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

                  {/* Back Face (Left-Hand Page of Spread idx + 1) */}
                  <div className="nb-leaf__face nb-leaf__face--back">
                    <NotebookPage
                      side="left"
                      pageNumber={leaf.backNumber}
                      variant={leaf.backPage?.tipoPapel === "cream" ? "parchment" : "ruled"}
                      scale={metrics.scale}
                      hideFolio
                    >
                      {leaf.backPage ? (
                        <JournalUserPage
                          page={leaf.backPage}
                          pageNumber={leaf.backNumber}
                          side="left"
                          notebookName={activeNotebook.nome}
                        />
                      ) : null}
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

            {/* Front Hardcover Leaf (Closed Cover on Front / User Page 1 on Back) */}
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

              {/* Back Face: First User Page (writtenPages[0]) — No Hardcoded Back-Cover Text */}
              <div className="nb-leaf__face nb-leaf__face--back nb-leaf__face--cover-back">
                {firstLeftPage ? (
                  <NotebookPage
                    side="left"
                    pageNumber="01"
                    variant={firstLeftPage.tipoPapel === "cream" ? "parchment" : "ruled"}
                    scale={metrics.scale}
                    hideFolio
                  >
                    <JournalUserPage
                      page={firstLeftPage}
                      pageNumber="01"
                      side="left"
                      notebookName={activeNotebook.nome}
                    />
                  </NotebookPage>
                ) : null}
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
                  style={
                    metrics.isSinglePageView
                      ? mobileSpreadSide === "left"
                        ? { left: "-100%", width: "42%" }
                        : { left: "0%", width: "42%" }
                      : undefined
                  }
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
                  className="nb-hit-zone nb-hit-zone--right nb-hit-zone--active"
                  style={
                    metrics.isSinglePageView
                      ? mobileSpreadSide === "left"
                        ? { left: "-58%", width: "58%" }
                        : { left: "42%", width: "58%" }
                      : undefined
                  }
                  onClick={handleTurnNext}
                  onMouseEnter={() => setHoverSide("right")}
                  onMouseLeave={() => setHoverSide(null)}
                  disabled={isAnimating}
                  aria-label={canGoNext ? "Turn to next spread" : "Close journal"}
                  title={canGoNext ? "Next page" : "Close journal"}
                >
                  <span className="nb-edge-hint nb-edge-hint--right" aria-hidden="true">
                    ›
                  </span>
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
