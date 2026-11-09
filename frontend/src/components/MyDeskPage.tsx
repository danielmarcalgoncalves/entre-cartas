"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import "./my-desk/my-desk.css";

interface DeskToast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface PolaroidCropState {
  offsetX: number; // -45 to +45 (%)
  offsetY: number; // -45 to +45 (%)
  scale: number;   // 1.0 to 2.2
}

const DEFAULT_CROP: PolaroidCropState = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

/**
 * Formats the user's full name to a strict visual maximum (13 characters)
 * so it never overflows the Polaroid caption area, while keeping the full
 * name intact in the user's profile.
 */
function formatPolaroidCaption(rawName: string): string {
  const cleaned = (rawName || "NAME").trim().toUpperCase();
  if (cleaned.length <= 13) return cleaned;

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstWithInitial = `${parts[0]} ${parts[parts.length - 1][0]}.`;
    if (firstWithInitial.length <= 13) return firstWithInitial;
  }
  if (parts[0] && parts[0].length <= 13) {
    return parts[0];
  }
  return `${cleaned.slice(0, 12)}…`;
}

export default function MyDeskPage() {
  const { user, refreshUser } = useAuth();

  // DOM Refs for GSAP physical animations
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const polaroidWrapperRef = useRef<HTMLDivElement>(null);
  const polaroidShadowRef = useRef<HTMLDivElement>(null);
  const journalObjectRef = useRef<HTMLAnchorElement>(null);
  const journalVisualRef = useRef<HTMLDivElement>(null);
  const journalShadowRef = useRef<HTMLDivElement>(null);
  const envelopeObjectRef = useRef<HTMLAnchorElement>(null);
  const envelopeVisualRef = useRef<HTMLDivElement>(null);
  const envelopeShadowRef = useRef<HTMLDivElement>(null);
  const aboutTriggerRef = useRef<HTMLButtonElement>(null);
  const aboutStripRef = useRef<HTMLDivElement>(null);

  // Biography state
  const [bio, setBio] = useState<string>("");
  const [isBioOpen, setIsBioOpen] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Polaroid Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Polaroid Photo upload, drag-drop, and crop/reposition state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState<PolaroidCropState>(DEFAULT_CROP);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; origX: number; origY: number }>({
    x: 0,
    y: 0,
    origX: 0,
    origY: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast feedback
  const [toast, setToast] = useState<DeskToast | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // First-login guided onboarding
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);

  const cropStorageKey = `entre-cartas:polaroid-crop:${user?.id || "guest"}`;

  // Load saved crop state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(cropStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.offsetX === "number" &&
          typeof parsed.offsetY === "number" &&
          typeof parsed.scale === "number"
        ) {
          setCrop(parsed);
        }
      }
    } catch {
      // Ignore storage parse issues
    }
  }, [cropStorageKey]);

  // Sync user profile data
  useEffect(() => {
    if (user) {
      setNameValue(user.nome || "");
      if (user.bio !== undefined && user.bio !== null) {
        setBio(user.bio);
      }
      if (user.foto_url) {
        setLocalPhotoUrl(user.foto_url);
      }
      const isDone = user.onboarding_concluido === 1 || user.onboarding_concluido === true;
      if (!isDone && onboardingStep === null) {
        setOnboardingStep(1);
      }
    }
  }, [user, onboardingStep]);

  // Fetch authoritative profile from backend on mount
  useEffect(() => {
    let mounted = true;
    api.profile
      .get()
      .then((data: any) => {
        if (!mounted || !data?.usuario) return;
        const u = data.usuario;
        if (typeof u.bio === "string") setBio(u.bio);
        if (u.nome) setNameValue(u.nome);
        if (u.foto_url) setLocalPhotoUrl(u.foto_url);
        const isDone = u.onboarding_concluido === 1 || u.onboarding_concluido === true;
        if (!isDone) {
          setOnboardingStep(1);
        } else {
          setOnboardingStep(null);
        }
      })
      .catch(() => {
        // Unauthenticated visitor or offline preview
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Initial GSAP Desk Placement & Settle Animation
  useEffect(() => {
    if (typeof window === "undefined" || !stageRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      // Set resting rotation of journal
      if (journalVisualRef.current) {
        gsap.set(journalVisualRef.current, { rotation: -3.6, transformOrigin: "50% 50%" });
      }
      if (journalShadowRef.current) {
        gsap.set(journalShadowRef.current, {
          rotation: -3.6,
          x: 6,
          y: 10,
          transformOrigin: "50% 50%",
        });
      }
      if (polaroidWrapperRef.current) {
        gsap.set(polaroidWrapperRef.current, {
          rotation: -17.25,
          transformOrigin: "48% 12%",
        });
      }
      if (aboutStripRef.current) {
        gsap.set(aboutStripRef.current, { yPercent: 104 });
      }

      if (prefersReducedMotion) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (cameraRef.current) {
        tl.fromTo(
          cameraRef.current,
          { opacity: 0, x: -18, y: -18 },
          { opacity: 1, x: 0, y: 0, duration: 0.65 },
          0.05
        );
      }
      if (polaroidWrapperRef.current) {
        tl.fromTo(
          polaroidWrapperRef.current,
          { opacity: 0, y: -22, rotation: -21 },
          { opacity: 1, y: 0, rotation: -17.25, duration: 0.72 },
          0.14
        );
      }
      if (journalObjectRef.current) {
        tl.fromTo(
          journalObjectRef.current,
          { opacity: 0, y: 24, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.75 },
          0.2
        );
      }
      if (envelopeObjectRef.current) {
        tl.fromTo(
          envelopeObjectRef.current,
          { opacity: 0, y: 22, x: 14, scale: 0.96 },
          { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.72 },
          0.3
        );
      }
      if (aboutTriggerRef.current) {
        tl.fromTo(
          aboutTriggerRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55 },
          0.42
        );
      }
    }, stageRef);

    return () => ctx.revert();
  }, []);

  // ==========================================================================
  // GSAP Physical Hover Handlers: Central Leather Journal
  // ==========================================================================
  const handleJournalMouseEnter = () => {
    if (!journalVisualRef.current || !journalShadowRef.current) return;
    gsap.killTweensOf([journalVisualRef.current, journalShadowRef.current]);

    gsap.to(journalVisualRef.current, {
      y: -15,
      scale: 1.038,
      rotation: -1.6,
      rotationY: -7,
      rotationX: 4,
      duration: 0.38,
      ease: "power2.out",
    });

    gsap.to(journalShadowRef.current, {
      x: 16,
      y: 26,
      scale: 1.065,
      rotation: -1.6,
      opacity: 0.9,
      filter: "blur(22px)",
      duration: 0.38,
      ease: "power2.out",
    });
  };

  const handleJournalMouseLeave = () => {
    if (!journalVisualRef.current || !journalShadowRef.current) return;
    gsap.killTweensOf([journalVisualRef.current, journalShadowRef.current]);

    gsap.to(journalVisualRef.current, {
      y: 0,
      scale: 1,
      rotation: -3.6,
      rotationY: 0,
      rotationX: 0,
      duration: 0.44,
      ease: "power2.out",
    });

    gsap.to(journalShadowRef.current, {
      x: 6,
      y: 10,
      scale: 1,
      rotation: -3.6,
      opacity: 0.82,
      filter: "blur(14px)",
      duration: 0.44,
      ease: "power2.out",
    });
  };

  // ==========================================================================
  // GSAP Physical Hover Handlers: Vintage Handwritten Envelope
  // ==========================================================================
  const handleEnvelopeMouseEnter = () => {
    if (!envelopeVisualRef.current || !envelopeShadowRef.current) return;
    gsap.killTweensOf([envelopeVisualRef.current, envelopeShadowRef.current]);

    gsap.to(envelopeVisualRef.current, {
      y: -13,
      scale: 1.044,
      rotation: 2.8,
      rotationX: 5,
      rotationY: 4,
      duration: 0.36,
      ease: "power2.out",
    });

    gsap.to(envelopeShadowRef.current, {
      x: 12,
      y: 22,
      scale: 1.06,
      opacity: 0.86,
      filter: "blur(20px)",
      duration: 0.36,
      ease: "power2.out",
    });
  };

  const handleEnvelopeMouseLeave = () => {
    if (!envelopeVisualRef.current || !envelopeShadowRef.current) return;
    gsap.killTweensOf([envelopeVisualRef.current, envelopeShadowRef.current]);

    gsap.to(envelopeVisualRef.current, {
      y: 0,
      scale: 1,
      rotation: 0,
      rotationX: 0,
      rotationY: 0,
      duration: 0.42,
      ease: "power2.out",
    });

    gsap.to(envelopeShadowRef.current, {
      x: 4,
      y: 10,
      scale: 1,
      opacity: 0.72,
      filter: "blur(13px)",
      duration: 0.42,
      ease: "power2.out",
    });
  };

  // ==========================================================================
  // GSAP Physical Hover Handlers: Polaroid
  // ==========================================================================
  const handlePolaroidMouseEnter = () => {
    if (isCropMode || !polaroidWrapperRef.current || !polaroidShadowRef.current) return;
    gsap.killTweensOf([polaroidWrapperRef.current, polaroidShadowRef.current]);

    gsap.to(polaroidWrapperRef.current, {
      y: -6,
      scale: 1.024,
      rotation: -15.8,
      duration: 0.32,
      ease: "power2.out",
    });

    gsap.to(polaroidShadowRef.current, {
      x: 5,
      y: 10,
      scale: 1.04,
      filter: "blur(15px)",
      duration: 0.32,
      ease: "power2.out",
    });
  };

  const handlePolaroidMouseLeave = () => {
    if (isCropMode || !polaroidWrapperRef.current || !polaroidShadowRef.current) return;
    gsap.killTweensOf([polaroidWrapperRef.current, polaroidShadowRef.current]);

    gsap.to(polaroidWrapperRef.current, {
      y: 0,
      scale: 1,
      rotation: -17.25,
      duration: 0.36,
      ease: "power2.out",
    });

    gsap.to(polaroidShadowRef.current, {
      x: 0,
      y: 0,
      scale: 1,
      filter: "blur(11px)",
      duration: 0.36,
      ease: "power2.out",
    });
  };

  // ==========================================================================
  // GSAP Physical Animation: About Me Paper Emerging from Below Viewport
  // ==========================================================================
  const openAboutPaper = () => {
    if (!aboutStripRef.current) return;
    setIsBioOpen(true);

    gsap.killTweensOf([aboutStripRef.current, aboutTriggerRef.current]);

    if (aboutTriggerRef.current) {
      gsap.to(aboutTriggerRef.current, {
        y: 44,
        opacity: 0,
        duration: 0.24,
        ease: "power2.in",
      });
    }

    gsap.to(aboutStripRef.current, {
      yPercent: 0,
      duration: 0.68,
      ease: "power3.out",
    });
  };

  const closeAboutPaper = () => {
    if (!aboutStripRef.current) return;

    gsap.killTweensOf([aboutStripRef.current, aboutTriggerRef.current]);

    gsap.to(aboutStripRef.current, {
      yPercent: 104,
      duration: 0.54,
      ease: "power3.inOut",
      onComplete: () => {
        setIsBioOpen(false);
      },
    });

    if (aboutTriggerRef.current) {
      gsap.to(aboutTriggerRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.36,
        delay: 0.22,
        ease: "power2.out",
      });
    }
  };

  // ==========================================================================
  // Polaroid Photograph Upload, Drag-and-Drop & Crop/Repositioning
  // ==========================================================================
  const handlePhotoFile = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      showToast("Please choose a JPEG, PNG, or WebP photograph.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Photograph must be under 5 MB.", "error");
      return;
    }

    // Immediate local object URL preview inside the Polaroid window
    const previewUrl = URL.createObjectURL(file);
    setLocalPhotoUrl(previewUrl);
    const resetCrop: PolaroidCropState = { offsetX: 0, offsetY: 0, scale: 1 };
    setCrop(resetCrop);
    setIsCropMode(true);

    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append("avatar", file);

      const response: any = await api.profile.uploadAvatar(formData);
      if (response?.foto_url) {
        setLocalPhotoUrl(response.foto_url);
      }
      await refreshUser();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(cropStorageKey, JSON.stringify(resetCrop));
      }
      showToast("Photo uploaded — drag to adjust framing", "success");
    } catch (err: any) {
      showToast(err.message || "Could not upload photograph to server.", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    e.target.value = "";
  };

  // Pointer drag inside the Polaroid window to reposition the photograph
  const handlePhotoPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isCropMode) return;
    e.preventDefault();
    e.stopPropagation();
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: crop.offsetX,
      origY: crop.offsetY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePhotoPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isCropMode || !isPanningRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    // Convert screen delta into Polaroid-aligned delta (-17.25deg)
    const angle = 17.25 * (Math.PI / 180);
    const localDx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localDy = dx * Math.sin(angle) + dy * Math.cos(angle);

    const nextX = Math.max(-45, Math.min(45, panStartRef.current.origX + localDx * 0.45));
    const nextY = Math.max(-45, Math.min(45, panStartRef.current.origY + localDy * 0.45));

    setCrop((prev) => ({
      ...prev,
      offsetX: Math.round(nextX * 10) / 10,
      offsetY: Math.round(nextY * 10) / 10,
    }));
  };

  const handlePhotoPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleConfirmCrop = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(cropStorageKey, JSON.stringify(crop));
    }
    setIsCropMode(false);
    showToast("Photo framing saved", "success");
  };

  // ==========================================================================
  // Polaroid Name Editing
  // ==========================================================================
  const handleStartEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameValue(user?.nome || nameValue || "");
    setIsEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 40);
  };

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameValue(user?.nome || "");
      setIsEditingName(false);
      return;
    }
    if (trimmed.length < 2) {
      showToast("Name must contain at least 2 characters.", "error");
      setNameValue(user?.nome || "");
      setIsEditingName(false);
      return;
    }
    if (trimmed === user?.nome) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSavingName(true);
      await api.profile.update({ nome: trimmed });
      await refreshUser();
      showToast("Name saved", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save name.", "error");
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === "Escape") {
      setNameValue(user?.nome || "");
      setIsEditingName(false);
    }
  };

  // ==========================================================================
  // Save Biography to Backend (Only confirms after DB persistence succeeds)
  // ==========================================================================
  const handleSaveBio = async () => {
    if (isSavingBio) return;
    try {
      setIsSavingBio(true);
      await api.profile.update({ bio: bio.slice(0, 500) });
      await refreshUser();
      showToast("Bio saved", "success");
    } catch (err: any) {
      showToast(err.message || "Could not save biography.", "error");
    } finally {
      setIsSavingBio(false);
    }
  };

  // ==========================================================================
  // Guided First-Login Onboarding
  // ==========================================================================
  const handleNextOnboarding = () => {
    if (onboardingStep === null) return;
    if (onboardingStep < 4) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  const handleFinishOnboarding = async () => {
    setOnboardingStep(null);
    try {
      await api.profile.update({ onboarding_concluido: true });
      await refreshUser();
    } catch {
      // Ignore if guest
    }
  };

  const activePhotoUrl = localPhotoUrl || user?.foto_url || null;
  const fullUserName = user?.nome || nameValue || "NAME";
  const polaroidCaptionText = formatPolaroidCaption(fullUserName);

  return (
    <main
      className="desk-page-container"
      aria-label="My Desk — Personal Writing Desk"
      onClick={() => {
        if (isBioOpen) closeAboutPaper();
      }}
    >
      {/* Hidden File Input for Native Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={onFileInputChange}
        aria-hidden="true"
      />

      {/* Warm Ambient Overhead Desk Lighting & Vignette */}
      <div className="desk-ambient-lighting" aria-hidden="true" />

      {/* Master Overhead Desk Composition Stage */}
      <div ref={stageRef} className="desk-composition-stage">
        {/* ================================================================
            1. INDEPENDENT VINTAGE INSTANT CAMERA (UPPER-LEFT)
            ================================================================ */}
        <div ref={cameraRef} className="desk-camera-object" aria-hidden="true">
          <img
            src="/images/nova-ui/desk-camera-only.png"
            alt=""
            className="desk-camera-img"
            draggable={false}
          />
        </div>

        {/* ================================================================
            2. INDEPENDENT VINTAGE POLAROID (UPPER-LEFT)
            - Dedicated inner photo window (left: 7.73%, top: 5.97%, w: 84.55%, h: 68.28%)
            - Masked by desk-polaroid-frame.png so the photo never touches
              the white frame or caption area
            - Supports click upload, drag-and-drop, and crop/repositioning
            ================================================================ */}
        <div
          ref={polaroidWrapperRef}
          className="desk-polaroid-wrapper"
          onMouseEnter={handlePolaroidMouseEnter}
          onMouseLeave={handlePolaroidMouseLeave}
          onClick={(e) => {
            e.stopPropagation();
            if (!isEditingName && !isUploadingPhoto && !isCropMode) {
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingFile(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingFile(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingFile(false);
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile) handlePhotoFile(droppedFile);
          }}
          role="button"
          tabIndex={0}
          aria-label="Polaroid portrait — Click or drag an image to upload your photograph"
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isEditingName && !isCropMode) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          {/* Independent Physical Shadow beneath the Polaroid */}
          <div ref={polaroidShadowRef} className="desk-polaroid-shadow" aria-hidden="true" />

          {/* Physical Polaroid Card */}
          <div className="desk-polaroid-card">
            {/* Layer 1: Exact Inner Rectangular Photo Window */}
            <div className="polaroid-inner-photo-window">
              {activePhotoUrl ? (
                <img
                  src={activePhotoUrl}
                  alt={user?.nome ? `${user.nome} portrait` : "User portrait"}
                  className={`polaroid-user-photo ${isCropMode ? "is-repositioning" : ""}`}
                  style={{
                    objectPosition: `${50 + crop.offsetX}% ${50 + crop.offsetY}%`,
                    transform: `translate(${crop.offsetX * 0.65}%, ${crop.offsetY * 0.65}%) scale(${crop.scale})`,
                  }}
                  onPointerDown={handlePhotoPointerDown}
                  onPointerMove={handlePhotoPointerMove}
                  onPointerUp={handlePhotoPointerUp}
                  draggable={false}
                />
              ) : (
                <div className="polaroid-empty-emulsion">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="polaroid-empty-label">Add Portrait</span>
                </div>
              )}

              {/* Subtle hover pill to adjust crop or change photo */}
              {activePhotoUrl && !isCropMode && (
                <span
                  className="polaroid-window-hover-pill"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCropMode(true);
                  }}
                  style={{ pointerEvents: "auto" }}
                  title="Reposition or zoom portrait"
                >
                  Adjust Crop
                </span>
              )}

              {/* Drag-and-drop highlight overlay */}
              <div
                className={`polaroid-window-drop-overlay ${
                  isDraggingFile ? "is-active" : ""
                }`}
              >
                <span>Drop Photo</span>
              </div>

              {/* Uploading state overlay */}
              {isUploadingPhoto && (
                <div className="polaroid-window-drop-overlay is-active">
                  <span>Developing…</span>
                </div>
              )}
            </div>

            {/* Layer 2: Aged Polaroid Frame Overlay (Masks all borders cleanly) */}
            <img
              src="/images/nova-ui/desk-polaroid-frame.png"
              alt=""
              className="polaroid-frame-overlay-img"
              aria-hidden="true"
              draggable={false}
            />

            {/* Layer 3: Lower White Caption Area with Strict Length Control */}
            <div
              className="polaroid-caption-zone"
              onClick={handleStartEditName}
              title={`${fullUserName} — Click to edit name`}
            >
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  maxLength={60}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleNameKeyDown}
                  disabled={isSavingName}
                  className="polaroid-caption-input"
                  aria-label="Edit profile name"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="polaroid-caption-name">{polaroidCaptionText}</span>
              )}
            </div>
          </div>
        </div>

        {/* Floating Reposition & Crop Confirmation Toolbar */}
        {isCropMode && activePhotoUrl && (
          <div
            className="polaroid-crop-toolbar"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Adjust Polaroid photo crop"
          >
            <h3 className="polaroid-crop-toolbar-title">Position Portrait</h3>
            <p className="polaroid-crop-toolbar-hint">
              Drag the photograph inside the Polaroid window and adjust zoom.
            </p>
            <div className="polaroid-crop-zoom-row">
              <span>Zoom</span>
              <input
                type="range"
                min={1}
                max={2.2}
                step={0.05}
                value={crop.scale}
                onChange={(e) =>
                  setCrop((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
                }
                className="polaroid-crop-zoom-slider"
                aria-label="Photo zoom level"
              />
            </div>
            <div className="polaroid-crop-actions">
              <button
                type="button"
                className="polaroid-crop-btn secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                New Photo
              </button>
              <button
                type="button"
                className="polaroid-crop-btn"
                onClick={handleConfirmCrop}
              >
                Confirm Crop
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            3. INDEPENDENT CENTRAL LEATHER JOURNAL -> /journal
            Physical elevation, perspective tilt, and shadow expansion via GSAP
            ================================================================ */}
        <Link
          ref={journalObjectRef}
          href="/journal"
          className="desk-journal-object"
          aria-label="Open Journal — Write in your personal journal"
          onMouseEnter={handleJournalMouseEnter}
          onMouseLeave={handleJournalMouseLeave}
          onFocus={handleJournalMouseEnter}
          onBlur={handleJournalMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={journalShadowRef} className="desk-journal-shadow" aria-hidden="true" />
          <div ref={journalVisualRef} className="desk-journal-visual">
            <img
              src="/images/nova-ui/desk-journal-clean.png"
              alt="Closed black leather journal"
              className="desk-journal-img"
              draggable={false}
            />
          </div>
        </Link>

        {/* ================================================================
            4. INDEPENDENT VINTAGE HANDWRITTEN ENVELOPE -> /letters
            Physical elevation, tilt, and shadow increase via GSAP
            ================================================================ */}
        <Link
          ref={envelopeObjectRef}
          href="/letters"
          className="desk-envelope-object"
          aria-label="Open Letters — Write and seal personal correspondence"
          onMouseEnter={handleEnvelopeMouseEnter}
          onMouseLeave={handleEnvelopeMouseLeave}
          onFocus={handleEnvelopeMouseEnter}
          onBlur={handleEnvelopeMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={envelopeShadowRef} className="desk-envelope-shadow" aria-hidden="true" />
          <div ref={envelopeVisualRef} className="desk-envelope-visual">
            <img
              src="/images/nova-ui/desk-envelope-clean.png"
              alt="Vintage handwritten postal envelope"
              className="desk-envelope-img"
              draggable={false}
            />
          </div>
        </Link>

        {/* ================================================================
            5. FIRST-LOGIN GUIDED ONBOARDING
            ================================================================ */}
        {onboardingStep !== null && (
          <div
            className="desk-onboarding-bubble"
            style={
              onboardingStep === 1
                ? { top: "22%", left: "22%" }
                : onboardingStep === 2
                ? { top: "44%", left: "50%", transform: "translate(-50%, -50%)" }
                : onboardingStep === 3
                ? { top: "34%", right: "28%" }
                : { bottom: "14%", left: "21%" }
            }
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="My Desk guided tour"
          >
            {onboardingStep === 1 && (
              <>
                <h2 className="desk-onboarding-title">Your Polaroid Portrait</h2>
                <p className="desk-onboarding-text">
                  Click the Polaroid or drag a photograph onto it to frame your portrait, and click
                  the bottom caption to set your name.
                </p>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <h2 className="desk-onboarding-title">Your Leather Journal</h2>
                <p className="desk-onboarding-text">
                  Hover and click your central leather notebook anytime to open the Journal editor
                  and write your thoughts.
                </p>
              </>
            )}
            {onboardingStep === 3 && (
              <>
                <h2 className="desk-onboarding-title">Personal Correspondence</h2>
                <p className="desk-onboarding-text">
                  Click the aged envelope on the right to compose personal letters, fold stationery,
                  and seal them with wax.
                </p>
              </>
            )}
            {onboardingStep === 4 && (
              <>
                <h2 className="desk-onboarding-title">About Me Note</h2>
                <p className="desk-onboarding-text">
                  Click the &ldquo;About me&rdquo; paper at the bottom edge of the desk to pull up
                  your personal biography sheet.
                </p>
              </>
            )}
            <div className="desk-onboarding-actions">
              <button
                type="button"
                className="desk-onboarding-btn-secondary"
                onClick={handleFinishOnboarding}
              >
                Skip tour
              </button>
              <button
                type="button"
                className="desk-onboarding-btn-primary"
                onClick={handleNextOnboarding}
              >
                {onboardingStep === 4 ? "Finish" : "Next →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          6. ABOUT ME — INITIAL TAB & TALL NARROW PAPER EMERGING FROM BOTTOM
          ==================================================================== */}
      <button
        ref={aboutTriggerRef}
        type="button"
        className="desk-about-trigger-wrapper"
        onClick={(e) => {
          e.stopPropagation();
          openAboutPaper();
        }}
        aria-expanded={isBioOpen}
        aria-label="About me — Pull up your personal biography sheet"
      >
        <div className="desk-about-trigger-paper" />
      </button>

      {/* Tall Narrow Aged Stationery Strip Emerging from Below the Viewport */}
      <div
        ref={aboutStripRef}
        className={`desk-about-emerging-strip ${isBioOpen ? "is-interactive" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-hidden={!isBioOpen}
        aria-label="About me biography note"
      >
        <div className="desk-about-paper-sheet">
          <div
            className="desk-about-sheet-top"
            onClick={closeAboutPaper}
            title="Slide biography note back down"
          >
            <span className="desk-about-sheet-heading">About me</span>
            <button
              type="button"
              className="desk-about-sheet-arrow-btn"
              onClick={(e) => {
                e.stopPropagation();
                closeAboutPaper();
              }}
              aria-label="Close biography note"
            >
              <svg width="18" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 4v15m0 0-5-5m5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="desk-about-sheet-body">
            <textarea
              className="desk-about-textarea"
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write your personal biography, the stories you carry, or the quiet reasons you write…"
              aria-label="Personal biography text"
            />
          </div>

          <div className="desk-about-sheet-footer">
            <div className="desk-about-meta-row">
              <span>Personal Note</span>
              <span>{bio.length} / 500</span>
            </div>
            <div className="desk-about-actions-row">
              <button
                type="button"
                className="desk-about-fold-btn"
                onClick={closeAboutPaper}
              >
                Slide Down
              </button>
              <button
                type="button"
                className="desk-about-save-btn"
                onClick={handleSaveBio}
                disabled={isSavingBio}
              >
                {isSavingBio ? "Saving…" : "Save Bio"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          7. VINTAGE FEEDBACK TOAST
          ==================================================================== */}
      {toast && (
        <div className="desk-toast-banner" role="status" aria-live="polite">
          <span aria-hidden="true">{toast.type === "error" ? "⚠" : "✦"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </main>
  );
}
