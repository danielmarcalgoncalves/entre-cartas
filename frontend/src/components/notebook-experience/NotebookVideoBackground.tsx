"use client";

import React, { useEffect, useRef, useState } from "react";

export interface VideoScene {
  id: string;
  desktopWebm: string;
  desktopMp4: string;
  mobileWebm: string;
  mobileMp4: string;
  poster: string;
}

const CINEMATIC_SCENES: readonly VideoScene[] = [
  {
    id: "wildflower-breeze",
    desktopWebm: "/videos/notebook-bg/memory-01-desktop.webm",
    desktopMp4: "/videos/notebook-bg/memory-01-desktop.mp4",
    mobileWebm: "/videos/notebook-bg/memory-01-mobile.webm",
    mobileMp4: "/videos/notebook-bg/memory-01-mobile.mp4",
    poster: "/videos/notebook-bg/memory-01-poster.jpg",
  },
  {
    id: "sunlit-canopy",
    desktopWebm: "/videos/notebook-bg/memory-02-desktop.webm",
    desktopMp4: "/videos/notebook-bg/memory-02-desktop.mp4",
    mobileWebm: "/videos/notebook-bg/memory-02-mobile.webm",
    mobileMp4: "/videos/notebook-bg/memory-02-mobile.mp4",
    poster: "/videos/notebook-bg/memory-02-poster.jpg",
  },
  {
    id: "dusk-shoreline",
    desktopWebm: "/videos/notebook-bg/memory-03-desktop.webm",
    desktopMp4: "/videos/notebook-bg/memory-03-desktop.mp4",
    mobileWebm: "/videos/notebook-bg/memory-03-mobile.webm",
    mobileMp4: "/videos/notebook-bg/memory-03-mobile.mp4",
    poster: "/videos/notebook-bg/memory-03-poster.jpg",
  },
  {
    id: "summer-meadow",
    desktopWebm: "/videos/notebook-bg/memory-04-desktop.webm",
    desktopMp4: "/videos/notebook-bg/memory-04-desktop.mp4",
    mobileWebm: "/videos/notebook-bg/memory-04-mobile.webm",
    mobileMp4: "/videos/notebook-bg/memory-04-mobile.mp4",
    poster: "/videos/notebook-bg/memory-04-poster.jpg",
  },
];

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

interface ExtendedNavigator extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
  deviceMemory?: number;
}

export interface NotebookVideoBackgroundProps {
  /**
   * Synchronous ref signaling that the user is opening, closing, or flipping
   * pages on the notebook so video transitions never occur mid-interaction.
   */
  isBusyRef: React.RefObject<boolean>;
}

const SCENE_HOLD_MS = 18000;
const CROSSFADE_MS = 3000;

/**
 * Releases all decoded buffers and media sources from a single <video> element.
 */
function releaseVideoElement(video: HTMLVideoElement | null) {
  if (!video) return;
  try {
    video.pause();
    video.removeAttribute("src");
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.load();
  } catch {
    // Ignore cleanup errors on detached nodes
  }
}

/**
 * Populates a single <video> element with WebM (VP9) primary and MP4 (H.264) fallback.
 */
function attachSceneSources(
  video: HTMLVideoElement,
  scene: VideoScene,
  useMobileProfile: boolean
) {
  while (video.firstChild) {
    video.removeChild(video.firstChild);
  }

  const webmSource = document.createElement("source");
  webmSource.src = useMobileProfile ? scene.mobileWebm : scene.desktopWebm;
  webmSource.type = "video/webm";

  const mp4Source = document.createElement("source");
  mp4Source.src = useMobileProfile ? scene.mobileMp4 : scene.desktopMp4;
  mp4Source.type = "video/mp4";

  video.appendChild(webmSource);
  video.appendChild(mp4Source);
  video.poster = scene.poster;
  video.load();
}

function preloadPosterImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * Dreamy 35mm / Super 8 atmospheric background controller.
 *
 * Strict memory & GPU discipline:
 * - Renders at most ONE <video> element in the DOM (zero hidden background videos).
 * - Uses a pre-blurred static poster bridge during 3s crossfades so two videos are
 *   never decoded simultaneously, releasing the previous stream before loading the next.
 * - Zero React state updates during playback or transitions.
 * - Pauses automatically via Page Visibility API when tab is hidden and unloads on unmount.
 * - Respects prefers-reduced-motion, Save-Data, low-memory mobile devices, and autoplay blocks.
 */
export function NotebookVideoBackground({
  isBusyRef,
}: NotebookVideoBackgroundProps) {
  const [playbackMode, setPlaybackMode] = useState<
    "evaluating" | "static" | "video"
  >("evaluating");
  const [isMobileProfile, setIsMobileProfile] = useState(false);

  const bridgeRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Evaluate user preferences, network Save-Data, and device capabilities once on mount
  useEffect(() => {
    const reducedMotionMq = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const evaluateCapabilities = () => {
      if (reducedMotionMq.matches) {
        setPlaybackMode("static");
        return;
      }

      const nav = navigator as ExtendedNavigator;
      const conn =
        nav.connection || nav.mozConnection || nav.webkitConnection;
      if (
        conn?.saveData ||
        conn?.effectiveType === "slow-2g" ||
        conn?.effectiveType === "2g"
      ) {
        setPlaybackMode("static");
        return;
      }

      const mobileViewport =
        window.innerWidth <= 820 ||
        window.matchMedia("(pointer: coarse)").matches;

      // On severely resource-constrained mobile hardware, prefer static nostalgic backdrop
      const lowCores =
        typeof nav.hardwareConcurrency === "number" &&
        nav.hardwareConcurrency <= 2;
      const lowMemory =
        typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;

      if (mobileViewport && (lowCores || lowMemory)) {
        setPlaybackMode("static");
        return;
      }

      setIsMobileProfile(mobileViewport);
      setPlaybackMode("video");
    };

    evaluateCapabilities();
    reducedMotionMq.addEventListener("change", evaluateCapabilities);
    return () => {
      reducedMotionMq.removeEventListener("change", evaluateCapabilities);
    };
  }, []);

  // Imperative single-decoder playback, visibility pause, & static-bridge crossfade loop
  useEffect(() => {
    if (playbackMode !== "video") {
      releaseVideoElement(videoRef.current);
      return;
    }

    const video = videoRef.current;
    const bridge = bridgeRef.current;
    if (!video || !bridge) return;

    let disposed = false;
    let sceneIndex = 0;
    let isTransitioning = false;
    let cycleTimer: ReturnType<typeof setTimeout> | null = null;
    let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (cycleTimer) {
        clearTimeout(cycleTimer);
        cycleTimer = null;
      }
      if (fadeOutTimer) {
        clearTimeout(fadeOutTimer);
        fadeOutTimer = null;
      }
    };

    const scheduleNextTransition = (delayMs = SCENE_HOLD_MS) => {
      if (disposed) return;
      if (cycleTimer) clearTimeout(cycleTimer);
      cycleTimer = setTimeout(() => {
        void runBridgeTransition();
      }, delayMs);
    };

    const playCurrentSafely = async () => {
      if (disposed || document.hidden) return;
      try {
        video.muted = true;
        await video.play();
        if (!disposed) {
          video.style.opacity = "1";
        }
      } catch {
        // Autoplay prevented (e.g., OS Low Power Mode) or decode failure:
        // keep serene static poster visible and avoid spinning timers.
        if (!disposed) {
          video.style.opacity = "0";
          releaseVideoElement(video);
          setPlaybackMode("static");
        }
      }
    };

    const loadSceneIntoSinglePlayer = (
      targetScene: VideoScene,
      onReady: () => void
    ) => {
      let settled = false;
      const cleanupListeners = () => {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("error", handleError);
      };

      const handleCanPlay = () => {
        if (settled || disposed) return;
        settled = true;
        cleanupListeners();
        onReady();
      };

      const handleError = () => {
        if (settled || disposed) return;
        settled = true;
        cleanupListeners();
        // Gracefully remain on static poster bridge and try next scene later
        video.style.opacity = "0";
        releaseVideoElement(video);
        isTransitioning = false;
        scheduleNextTransition(SCENE_HOLD_MS);
      };

      video.addEventListener("canplay", handleCanPlay, { once: true });
      video.addEventListener("error", handleError, { once: true });

      attachSceneSources(video, targetScene, isMobileProfile);
    };

    const runBridgeTransition = async () => {
      if (disposed || isTransitioning) return;

      // Postpone quietly if tab is hidden or user is actively opening/turning pages
      if (document.hidden || isBusyRef.current) {
        scheduleNextTransition(3500);
        return;
      }

      isTransitioning = true;
      const nextIndex = (sceneIndex + 1) % CINEMATIC_SCENES.length;
      const nextScene = CINEMATIC_SCENES[nextIndex];

      // 1. Preload tiny blurred static frame of incoming scene & place on bridge layer
      await preloadPosterImage(nextScene.poster);
      if (disposed) return;

      if (document.hidden || isBusyRef.current) {
        isTransitioning = false;
        scheduleNextTransition(3500);
        return;
      }

      bridge.style.backgroundImage = `url("${nextScene.poster}")`;

      // 2. Smooth 3s CSS opacity fade-out of active video onto incoming static bridge
      video.style.opacity = "0";

      fadeOutTimer = setTimeout(() => {
        if (disposed) return;

        // 3. Strictly release previous video decoder & buffers BEFORE loading next clip
        releaseVideoElement(video);
        sceneIndex = nextIndex;

        if (document.hidden) {
          isTransitioning = false;
          return;
        }

        // 4. Attach new clip to the single <video> element and fade back in over 3s
        loadSceneIntoSinglePlayer(nextScene, () => {
          void playCurrentSafely().then(() => {
            if (!disposed) {
              isTransitioning = false;
              scheduleNextTransition(SCENE_HOLD_MS);
            }
          });
        });
      }, CROSSFADE_MS + 80);
    };

    // Page Visibility API: pause immediately in background tabs, resume gently on return
    const handleVisibilityChange = () => {
      if (disposed) return;
      if (document.hidden) {
        clearTimers();
        isTransitioning = false;
        video.pause();
      } else {
        // If sources were unloaded while mid-transition, reload current scene cleanly
        if (!video.firstChild) {
          const activeScene = CINEMATIC_SCENES[sceneIndex];
          bridge.style.backgroundImage = `url("${activeScene.poster}")`;
          loadSceneIntoSinglePlayer(activeScene, () => {
            void playCurrentSafely().then(() => {
              if (!disposed) scheduleNextTransition(SCENE_HOLD_MS);
            });
          });
        } else {
          void playCurrentSafely().then(() => {
            if (!disposed) scheduleNextTransition(SCENE_HOLD_MS);
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Boot initial scene (Scene 0)
    const initialScene = CINEMATIC_SCENES[0];
    bridge.style.backgroundImage = `url("${initialScene.poster}")`;
    loadSceneIntoSinglePlayer(initialScene, () => {
      void playCurrentSafely().then(() => {
        if (!disposed) {
          scheduleNextTransition(SCENE_HOLD_MS);
        }
      });
    });

    return () => {
      disposed = true;
      clearTimers();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseVideoElement(video);
    };
  }, [playbackMode, isMobileProfile, isBusyRef]);

  return (
    <div
      className={`nb-video-bg ${
        isMobileProfile ? "nb-video-bg--mobile" : "nb-video-bg--desktop"
      }`}
      aria-hidden="true"
    >
      {/* Layer 1A: Blurred Static Bridge & Fallback Memory Frame */}
      <div
        ref={bridgeRef}
        className="nb-video-bg__bridge"
        style={{
          backgroundImage: `url("${CINEMATIC_SCENES[0].poster}")`,
        }}
      />

      {/* Layer 1B: Single Hardware-Decoded HTML5 Video (unmounted in static/reduced-motion mode) */}
      {playbackMode === "video" && (
        <video
          ref={videoRef}
          className="nb-video-bg__player"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
        />
      )}

      {/* Layer 2 & 3: Moody Dark Warm Glaze, Vignette & Static 35mm Emulsion Grain */}
      <div className="nb-video-bg__cream-veil" />
      <div className="nb-video-bg__grain" />
    </div>
  );
}

export default NotebookVideoBackground;
