"use client";

import { useCallback } from "react";
import gsap from "gsap";

export interface OpeningRefs {
  bookRigRef: React.RefObject<HTMLDivElement | null>;
  coverLeafRef: React.RefObject<HTMLDivElement | null>;
  coverFrontShadeRef: React.RefObject<HTMLDivElement | null>;
  coverBackShadeRef: React.RefObject<HTMLDivElement | null>;
  firstPageCastRef: React.RefObject<HTMLDivElement | null>;
  deskShadowRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseNotebookOpeningOptions {
  refs: OpeningRefs;
  pageWidth: number;
  closedScale: number;
  prefersReducedMotion: boolean;
}

export const CLOSED_REST_ROT_X = 7.5;
export const CLOSED_REST_ROT_Y = -9.5;
export const CLOSED_REST_ROT_Z = -1.8;

export const OPEN_REST_ROT_X = 3.2;
export const OPEN_REST_ROT_Y = 0;
export const OPEN_REST_ROT_Z = 0;

export const COVER_Z_CLOSED = 9;
export const COVER_Z_OPEN = 0.8;

/**
 * Encapsulates GSAP 3D animations for the physical notebook posture,
 * closed-state hover microinteractions, and the cover opening/closing sequence.
 */
export function useNotebookOpening({
  refs,
  pageWidth,
  closedScale,
  prefersReducedMotion,
}: UseNotebookOpeningOptions) {
  const applyPostureImmediate = useCallback(
    (isOpen: boolean) => {
      const {
        bookRigRef,
        coverLeafRef,
        coverFrontShadeRef,
        coverBackShadeRef,
        firstPageCastRef,
        deskShadowRef,
      } = refs;

      if (!bookRigRef.current || !coverLeafRef.current) return;

      if (!isOpen) {
        gsap.set(bookRigRef.current, {
          x: 0,
          y: 0,
          z: 0,
          rotationX: CLOSED_REST_ROT_X,
          rotationY: CLOSED_REST_ROT_Y,
          rotationZ: CLOSED_REST_ROT_Z,
          scale: closedScale,
        });
        gsap.set(coverLeafRef.current, {
          rotationY: 0,
          z: COVER_Z_CLOSED,
        });
        if (firstPageCastRef.current) {
          gsap.set(firstPageCastRef.current, { opacity: 0.72 });
        }
        if (coverFrontShadeRef.current) {
          gsap.set(coverFrontShadeRef.current, { opacity: 0 });
        }
        if (coverBackShadeRef.current) {
          gsap.set(coverBackShadeRef.current, { opacity: 0.35 });
        }
        if (deskShadowRef.current) {
          gsap.set(deskShadowRef.current, {
            width: pageWidth * closedScale * 1.06,
            x: 0,
            scale: 1,
            opacity: 0.82,
          });
        }
      } else {
        gsap.set(bookRigRef.current, {
          x: pageWidth / 2,
          y: 0,
          z: 0,
          rotationX: OPEN_REST_ROT_X,
          rotationY: OPEN_REST_ROT_Y,
          rotationZ: OPEN_REST_ROT_Z,
          scale: 1,
        });
        gsap.set(coverLeafRef.current, {
          rotationY: -180,
          z: COVER_Z_OPEN,
        });
        if (firstPageCastRef.current) {
          gsap.set(firstPageCastRef.current, { opacity: 0 });
        }
        if (coverFrontShadeRef.current) {
          gsap.set(coverFrontShadeRef.current, { opacity: 0 });
        }
        if (coverBackShadeRef.current) {
          gsap.set(coverBackShadeRef.current, { opacity: 0 });
        }
        if (deskShadowRef.current) {
          gsap.set(deskShadowRef.current, {
            width: pageWidth * 2.04,
            x: 0,
            scale: 1,
            opacity: 0.9,
          });
        }
      }
    },
    [refs, pageWidth, closedScale]
  );

  const animateClosedHover = useCallback(
    (deltaRotX: number, deltaRotY: number, isHovering: boolean) => {
      const { bookRigRef, deskShadowRef } = refs;
      if (!bookRigRef.current || prefersReducedMotion) return;

      gsap.to(bookRigRef.current, {
        y: isHovering ? -6 : 0,
        z: isHovering ? 10 : 0,
        rotationX: CLOSED_REST_ROT_X + deltaRotX,
        rotationY: CLOSED_REST_ROT_Y + deltaRotY,
        rotationZ: isHovering ? -1.1 : CLOSED_REST_ROT_Z,
        scale: isHovering ? closedScale * 1.018 : closedScale,
        duration: 0.42,
        ease: "power2.out",
        overwrite: "auto",
      });

      if (deskShadowRef.current) {
        gsap.to(deskShadowRef.current, {
          scale: isHovering ? 1.05 : 1,
          opacity: isHovering ? 0.65 : 0.82,
          x: deltaRotY * -1.4,
          duration: 0.42,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    },
    [refs, closedScale, prefersReducedMotion]
  );

  const runOpeningSequence = useCallback(
    (onComplete: () => void) => {
      const {
        bookRigRef,
        coverLeafRef,
        coverFrontShadeRef,
        coverBackShadeRef,
        firstPageCastRef,
        deskShadowRef,
      } = refs;

      if (!bookRigRef.current || !coverLeafRef.current) {
        onComplete();
        return;
      }

      const duration = prefersReducedMotion ? 0.35 : 1.26;
      const proxy = { progress: 0 };

      const tl = gsap.timeline({
        onComplete: () => {
          applyPostureImmediate(true);
          onComplete();
        },
      });

      // 1. Center the spine & settle 3D perspective into an open two-page spread
      tl.to(
        bookRigRef.current,
        {
          x: pageWidth / 2,
          y: 0,
          z: 0,
          rotationX: OPEN_REST_ROT_X,
          rotationY: OPEN_REST_ROT_Y,
          rotationZ: OPEN_REST_ROT_Z,
          scale: 1,
          duration,
          ease: "power3.inOut",
        },
        0
      );

      // 2. Widen ambient floor shadow beneath the opening spread
      if (deskShadowRef.current) {
        tl.to(
          deskShadowRef.current,
          {
            width: pageWidth * 2.04,
            x: 0,
            scale: 1,
            opacity: 0.9,
            duration,
            ease: "power3.inOut",
          },
          0
        );
      }

      // 3. Rotate hardcover leaf -180deg around spine with dynamic z-arc & real-time light shading
      tl.to(
        proxy,
        {
          progress: 1,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            const p = proxy.progress;
            const angle = -180 * p;
            const zBase =
              COVER_Z_CLOSED + (COVER_Z_OPEN - COVER_Z_CLOSED) * p;
            const zArc = prefersReducedMotion
              ? 0
              : Math.sin(p * Math.PI) * 10;

            if (coverLeafRef.current) {
              gsap.set(coverLeafRef.current, {
                rotationY: angle,
                z: zBase + zArc,
              });
            }

            // Cast shadow on Page 01 sweeps away as cover opens
            if (firstPageCastRef.current) {
              const castOpacity = Math.max(0, (1 - p * 1.18) * 0.72);
              gsap.set(firstPageCastRef.current, {
                opacity: castOpacity,
              });
            }

            // Cover exterior shade deepens toward vertical (-90deg)
            if (coverFrontShadeRef.current) {
              const frontShade = p < 0.5 ? p * 0.55 : 0;
              gsap.set(coverFrontShadeRef.current, { opacity: frontShade });
            }

            // Inside front cover (Ex-Libris) brightens as it settles flat on the left
            if (coverBackShadeRef.current) {
              const backShade = p >= 0.5 ? (1 - p) * 0.65 : 0.35;
              gsap.set(coverBackShadeRef.current, { opacity: backShade });
            }
          },
        },
        0
      );
    },
    [refs, pageWidth, prefersReducedMotion, applyPostureImmediate]
  );

  const runClosingSequence = useCallback(
    (onComplete: () => void) => {
      const {
        bookRigRef,
        coverLeafRef,
        coverFrontShadeRef,
        coverBackShadeRef,
        firstPageCastRef,
        deskShadowRef,
      } = refs;

      if (!bookRigRef.current || !coverLeafRef.current) {
        onComplete();
        return;
      }

      const duration = prefersReducedMotion ? 0.3 : 1.08;
      const proxy = { progress: 1 };

      const tl = gsap.timeline({
        onComplete: () => {
          applyPostureImmediate(false);
          onComplete();
        },
      });

      tl.to(
        bookRigRef.current,
        {
          x: 0,
          y: 0,
          z: 0,
          rotationX: CLOSED_REST_ROT_X,
          rotationY: CLOSED_REST_ROT_Y,
          rotationZ: CLOSED_REST_ROT_Z,
          scale: closedScale,
          duration,
          ease: "power3.inOut",
        },
        0
      );

      if (deskShadowRef.current) {
        tl.to(
          deskShadowRef.current,
          {
            width: pageWidth * closedScale * 1.06,
            x: 0,
            scale: 1,
            opacity: 0.82,
            duration,
            ease: "power3.inOut",
          },
          0
        );
      }

      tl.to(
        proxy,
        {
          progress: 0,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            const p = proxy.progress;
            const angle = -180 * p;
            const zBase =
              COVER_Z_CLOSED + (COVER_Z_OPEN - COVER_Z_CLOSED) * p;
            const zArc = prefersReducedMotion
              ? 0
              : Math.sin(p * Math.PI) * 10;

            if (coverLeafRef.current) {
              gsap.set(coverLeafRef.current, {
                rotationY: angle,
                z: zBase + zArc,
              });
            }

            if (firstPageCastRef.current) {
              const castOpacity = Math.max(0, (1 - p * 1.15) * 0.72);
              gsap.set(firstPageCastRef.current, { opacity: castOpacity });
            }

            if (coverFrontShadeRef.current) {
              const frontShade = p < 0.5 ? p * 0.5 : 0;
              gsap.set(coverFrontShadeRef.current, { opacity: frontShade });
            }

            if (coverBackShadeRef.current) {
              const backShade = p >= 0.5 ? (1 - p) * 0.6 : 0.35;
              gsap.set(coverBackShadeRef.current, { opacity: backShade });
            }
          },
        },
        0
      );
    },
    [refs, pageWidth, closedScale, prefersReducedMotion, applyPostureImmediate]
  );

  return {
    applyPostureImmediate,
    animateClosedHover,
    runOpeningSequence,
    runClosingSequence,
  };
}
