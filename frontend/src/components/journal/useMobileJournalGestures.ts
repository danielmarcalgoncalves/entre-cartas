"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MobileOverlayState = "closed" | "nav" | "tools" | "save";

interface UseMobileJournalGesturesOptions {
  enabled: boolean;
  isMediaSelected: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}

const MIN_SWIPE_PX = 64;
const DIRECTION_RATIO = 1.55;
const MAX_SWIPE_MS = 650;

export function useMobileJournalGestures({
  enabled,
  isMediaSelected,
  textareaRef,
  titleInputRef,
}: UseMobileJournalGesturesOptions) {
  const [activeOverlay, setActiveOverlay] = useState<MobileOverlayState>("closed");
  const [cursorOffsetY, setCursorOffsetY] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cursorOffsetRef = useRef(0);
  cursorOffsetRef.current = cursorOffsetY;
  const maxObservedHeightRef = useRef(0);

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    ignored: boolean;
    startedInTextarea: boolean;
    textareaScrollTop: number;
    textareaAtBottom: boolean;
  } | null>(null);

  const openOverlay = useCallback((next: MobileOverlayState) => {
    setActiveOverlay((prev) => (prev === next ? "closed" : next));
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay("closed");
  }, []);

  // Reset overlays when leaving mobile breakpoint
  useEffect(() => {
    if (!enabled) {
      setActiveOverlay("closed");
      setCursorOffsetY(0);
      setKeyboardHeight(0);
    }
  }, [enabled]);

  // VisualViewport keyboard detection + follow-the-cursor calculation for scaled 580x820 paper
  const syncCursorVisibility = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const layoutH = window.innerHeight;
    maxObservedHeightRef.current = Math.max(maxObservedHeightRef.current, layoutH);
    const referenceFullH = Math.max(layoutH, maxObservedHeightRef.current);
    const visibleH = vv ? vv.height : layoutH;
    const kbHeight = Math.max(0, Math.round(referenceFullH - visibleH));
    setKeyboardHeight(kbHeight);

    const titleEl = titleInputRef?.current;
    const ta = textareaRef.current;
    const activeEl = document.activeElement;

    // When editing the title area at the top of the sheet, keep top of sheet visible
    if (titleEl && activeEl === titleEl) {
      if (cursorOffsetRef.current !== 0) {
        setCursorOffsetY(0);
      }
      return;
    }

    const isKeyboardOpen = kbHeight >= 70 || (activeEl === ta && visibleH < referenceFullH * 0.82);
    if (!ta || activeEl !== ta || !isKeyboardOpen) {
      if (cursorOffsetRef.current !== 0) {
        setCursorOffsetY(0);
      }
      return;
    }

    const rect = ta.getBoundingClientRect();
    const style = window.getComputedStyle(ta);
    const canonicalLineHeight = parseFloat(style.lineHeight) || 28;
    const canonicalPaddingTop = parseFloat(style.paddingTop) || 0;

    // Visual scale factor of the canonical 580x820 sheet on this mobile screen
    const scaleFactor = ta.clientHeight > 0 ? rect.height / ta.clientHeight : 1;
    const visualLineHeight = canonicalLineHeight * scaleFactor;
    const visualPaddingTop = canonicalPaddingTop * scaleFactor;

    const textBeforeCaret = ta.value.slice(0, ta.selectionStart ?? ta.value.length);
    // Calculate line wrapping in the canonical 580x820 coordinate system (ta.clientWidth ~ 488px)
    const canonicalWidth = ta.clientWidth || 488;
    const avgCharsPerLine = Math.max(24, Math.floor((canonicalWidth - 8) / 9.2));
    const linesBeforeCaret = textBeforeCaret.split("\n").reduce((acc, seg) => {
      return acc + Math.max(1, Math.ceil((seg.length || 1) / avgCharsPerLine));
    }, 0);

    const currentOffset = cursorOffsetRef.current;
    const naturalTextareaTop = rect.top + currentOffset;
    const caretBottomY =
      naturalTextareaTop +
      visualPaddingTop +
      linesBeforeCaret * visualLineHeight -
      ta.scrollTop * scaleFactor;
    const caretTopY = caretBottomY - visualLineHeight;

    const safeBottom = visibleH - 28;
    const safeTop = 24;

    if (caretBottomY - currentOffset > safeBottom) {
      const neededOffset = Math.min(
        Math.round(rect.height * 0.78),
        Math.max(0, Math.round(caretBottomY - safeBottom))
      );
      setCursorOffsetY(neededOffset);
    } else if (caretTopY - currentOffset < safeTop && currentOffset > 0) {
      const neededOffset = Math.max(0, Math.round(caretTopY - safeTop));
      setCursorOffsetY(neededOffset);
    }
  }, [enabled, textareaRef, titleInputRef]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const onViewportChange = () => syncCursorVisibility();

    if (vv) {
      vv.addEventListener("resize", onViewportChange);
      vv.addEventListener("scroll", onViewportChange);
    }
    window.addEventListener("resize", onViewportChange);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
      }
      window.removeEventListener("resize", onViewportChange);
    };
  }, [enabled, syncCursorVisibility]);

  // Directional touch gesture handlers with conflict prevention
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 1 || isMediaSelected) {
        touchStartRef.current = null;
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest(
          'button, a, select, input[type="range"], [data-scrapbook-item], .scrapbook-item, .mobile-journal-overlay-panel, .mobile-journal-bottom-nav'
        )
      );

      // Do not hijack when user has an active text selection
      const ta = textareaRef.current;
      const titleEl = titleInputRef?.current;
      const hasTextareaSelection = Boolean(
        ta && ta.selectionStart !== ta.selectionEnd
      );
      const hasTitleSelection = Boolean(
        titleEl && titleEl.selectionStart !== titleEl.selectionEnd
      );
      const hasWindowSelection = Boolean(
        typeof window !== "undefined" && window.getSelection()?.toString().length
      );

      const startedInTextarea = Boolean(target && ta && (target === ta || ta.contains(target)));
      const textareaScrollTop = ta ? ta.scrollTop : 0;
      const textareaAtBottom = ta
        ? ta.scrollHeight - ta.scrollTop - ta.clientHeight <= 4
        : true;

      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
        ignored:
          isInteractive ||
          hasTextareaSelection ||
          hasTitleSelection ||
          hasWindowSelection,
        startedInTextarea,
        textareaScrollTop,
        textareaAtBottom,
      };
    },
    [enabled, isMediaSelected, textareaRef, titleInputRef]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!enabled || !start || start.ignored || e.changedTouches.length !== 1) return;

      // Re-check text selection at touchend (user may have dragged to select text)
      const ta = textareaRef.current;
      const titleEl = titleInputRef?.current;
      if (ta && ta.selectionStart !== ta.selectionEnd) return;
      if (titleEl && titleEl.selectionStart !== titleEl.selectionEnd) return;
      if (typeof window !== "undefined" && window.getSelection()?.toString().length) return;

      const dt = Date.now() - start.time;
      if (dt > MAX_SWIPE_MS) return;

      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Horizontal swipe: Right-to-Left opens left navigation submenu
      if (absX >= MIN_SWIPE_PX && absX >= absY * DIRECTION_RATIO) {
        if (dx < 0) {
          setActiveOverlay("nav");
        } else if (dx > 0 && activeOverlay === "nav") {
          setActiveOverlay("closed");
        }
        return;
      }

      // Vertical swipes: Down -> Writing Tools, Up -> Save Journal Page
      const verticalThreshold = start.startedInTextarea ? MIN_SWIPE_PX + 12 : MIN_SWIPE_PX;
      if (absY >= verticalThreshold && absY >= absX * DIRECTION_RATIO) {
        if (dy > 0) {
          if (activeOverlay === "save") {
            setActiveOverlay("closed");
          } else if (!start.startedInTextarea || start.textareaScrollTop <= 2) {
            setActiveOverlay("tools");
          }
        } else if (dy < 0) {
          if (activeOverlay === "tools") {
            setActiveOverlay("closed");
          } else if (!start.startedInTextarea || start.textareaAtBottom) {
            setActiveOverlay("save");
          }
        }
      }
    },
    [enabled, activeOverlay, textareaRef, titleInputRef]
  );

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return {
    activeOverlay,
    setActiveOverlay,
    openOverlay,
    closeOverlay,
    cursorOffsetY,
    keyboardHeight,
    syncCursorVisibility,
    gestureHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
}
