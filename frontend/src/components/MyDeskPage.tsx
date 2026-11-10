"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import {
  ACTIVE_NOTEBOOK_ID_KEY,
  JOURNAL_UPDATED_EVENT,
  filterWrittenPages,
  getNotebookById,
  getNotebookTheme,
  loadUserNotebooks,
} from "@/lib/journal-storage";
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
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  // DOM Refs for GSAP physical hover & entrance animations
  const stageRef = useRef<HTMLDivElement>(null);
  const polaroidWrapperRef = useRef<HTMLDivElement>(null);
  const polaroidShadowRef = useRef<HTMLDivElement>(null);
  const journalObjectRef = useRef<HTMLAnchorElement>(null);
  const journalVisualRef = useRef<HTMLDivElement>(null);
  const journalShadowRef = useRef<HTMLDivElement>(null);
  const envelopeObjectRef = useRef<HTMLAnchorElement>(null);
  const envelopeVisualRef = useRef<HTMLDivElement>(null);
  const envelopeShadowRef = useRef<HTMLDivElement>(null);
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Active Notebook metadata for personalized cover display
  const [notebookTitle, setNotebookTitle] = useState<string>("Between Letters");
  const [notebookPageCount, setNotebookPageCount] = useState<number>(0);
  const [notebookColorId, setNotebookColorId] = useState<string>("marrom");

  // Biography ("About Me") state — connected to backend profile
  const [bio, setBio] = useState<string>("");
  const [editBioValue, setEditBioValue] = useState<string>("");
  const [isEditingBio, setIsEditingBio] = useState(false);
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

  // Load active notebook details for cover personalization
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncNotebookMeta = () => {
      try {
        const activeId = window.localStorage.getItem(ACTIVE_NOTEBOOK_ID_KEY);
        const found = activeId ? getNotebookById(activeId) : null;
        const userNbs = loadUserNotebooks(user?.id);
        const target = found || (userNbs.length > 0 ? userNbs[0] : null);
        if (target) {
          setNotebookTitle(target.nome?.trim() || "Between Letters");
          setNotebookPageCount(filterWrittenPages(target.paginas).length);
          setNotebookColorId(getNotebookTheme(target.corCapa).id);
        }
      } catch {
        // Keep defaults
      }
    };
    syncNotebookMeta();
    window.addEventListener(JOURNAL_UPDATED_EVENT, syncNotebookMeta);
    window.addEventListener("storage", syncNotebookMeta);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, syncNotebookMeta);
      window.removeEventListener("storage", syncNotebookMeta);
    };
  }, [user?.id]);

  // Redirect unauthenticated visitors once initial session verification finishes
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Sync user profile data from auth context
  useEffect(() => {
    if (user) {
      setNameValue(user.nome || "");
      if (user.bio !== undefined && user.bio !== null) {
        setBio(user.bio);
        if (!isEditingBio) {
          setEditBioValue(user.bio);
        }
      }
      setLocalPhotoUrl(user.foto_url || null);
      const isDone = user.onboarding_concluido === 1 || user.onboarding_concluido === true;
      if (!isDone && onboardingStep === null) {
        setOnboardingStep(1);
      }
    } else {
      setLocalPhotoUrl(null);
      setNameValue("");
      setBio("");
      setEditBioValue("");
    }
  }, [user, onboardingStep, isEditingBio]);

  // Fetch authoritative profile from backend on mount & when user session resolves
  useEffect(() => {
    if (loading || !user) return;
    let mounted = true;
    api.profile
      .get()
      .then((data: any) => {
        if (!mounted || !data?.usuario) return;
        const u = data.usuario;
        if (typeof u.bio === "string") {
          setBio(u.bio);
          setEditBioValue(u.bio);
        } else if (u.bio === null) {
          setBio("");
          setEditBioValue("");
        }
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
        // Fallback to auth context user data
      });
    return () => {
      mounted = false;
    };
  }, [loading, user?.id]);

  // Initial GSAP Desk Placement & Settle Animation (runs after loading completes)
  useEffect(() => {
    if (loading || typeof window === "undefined" || !stageRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (journalVisualRef.current) {
        gsap.set(journalVisualRef.current, { rotation: -1.8, transformOrigin: "50% 50%" });
      }
      if (journalShadowRef.current) {
        gsap.set(journalShadowRef.current, {
          rotation: -1.8,
          x: 8,
          y: 14,
          transformOrigin: "50% 50%",
        });
      }
      if (polaroidWrapperRef.current) {
        gsap.set(polaroidWrapperRef.current, {
          rotation: -2.4,
          transformOrigin: "50% 50%",
        });
      }
      if (envelopeVisualRef.current) {
        gsap.set(envelopeVisualRef.current, {
          rotation: 2.6,
          transformOrigin: "50% 50%",
        });
      }
      if (envelopeShadowRef.current) {
        gsap.set(envelopeShadowRef.current, {
          rotation: 2.6,
          x: 6,
          y: 12,
          transformOrigin: "50% 50%",
        });
      }

      if (prefersReducedMotion) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (polaroidWrapperRef.current) {
        tl.fromTo(
          polaroidWrapperRef.current,
          { opacity: 0, y: -18, rotation: -5 },
          { opacity: 1, y: 0, rotation: -2.4, duration: 0.65 },
          0.08
        );
      }
      if (journalObjectRef.current) {
        tl.fromTo(
          journalObjectRef.current,
          { opacity: 0, y: 22, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.72 },
          0.16
        );
      }
      if (envelopeObjectRef.current) {
        tl.fromTo(
          envelopeObjectRef.current,
          { opacity: 0, y: 20, x: 12, scale: 0.96 },
          { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.68 },
          0.24
        );
      }
    }, stageRef);

    return () => ctx.revert();
  }, [loading]);

  // ==========================================================================
  // GSAP Physical Hover Handlers: Central Heirloom Leather Notebook
  // ==========================================================================
  const handleJournalMouseEnter = () => {
    if (!journalVisualRef.current || !journalShadowRef.current) return;
    gsap.killTweensOf([journalVisualRef.current, journalShadowRef.current]);

    gsap.to(journalVisualRef.current, {
      y: -14,
      scale: 1.032,
      rotation: -0.4,
      rotationY: -6,
      rotationX: 3.5,
      duration: 0.38,
      ease: "power2.out",
    });

    gsap.to(journalShadowRef.current, {
      x: 16,
      y: 26,
      scale: 1.06,
      rotation: -0.4,
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
      rotation: -1.8,
      rotationY: 0,
      rotationX: 0,
      duration: 0.44,
      ease: "power2.out",
    });

    gsap.to(journalShadowRef.current, {
      x: 8,
      y: 14,
      scale: 1,
      rotation: -1.8,
      opacity: 0.82,
      filter: "blur(16px)",
      duration: 0.44,
      ease: "power2.out",
    });
  };

  // ==========================================================================
  // GSAP Physical Hover Handlers: Vintage Sealed Correspondence Envelope
  // ==========================================================================
  const handleEnvelopeMouseEnter = () => {
    if (!envelopeVisualRef.current || !envelopeShadowRef.current) return;
    gsap.killTweensOf([envelopeVisualRef.current, envelopeShadowRef.current]);

    gsap.to(envelopeVisualRef.current, {
      y: -12,
      scale: 1.036,
      rotation: 1.2,
      rotationX: 4,
      rotationY: 3.5,
      duration: 0.36,
      ease: "power2.out",
    });

    gsap.to(envelopeShadowRef.current, {
      x: 12,
      y: 22,
      scale: 1.05,
      rotation: 1.2,
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
      rotation: 2.6,
      rotationX: 0,
      rotationY: 0,
      duration: 0.42,
      ease: "power2.out",
    });

    gsap.to(envelopeShadowRef.current, {
      x: 6,
      y: 12,
      scale: 1,
      rotation: 2.6,
      opacity: 0.74,
      filter: "blur(14px)",
      duration: 0.42,
      ease: "power2.out",
    });
  };

  // ==========================================================================
  // GSAP Physical Hover Handlers: Polaroid Portrait
  // ==========================================================================
  const handlePolaroidMouseEnter = () => {
    if (isCropMode || !polaroidWrapperRef.current || !polaroidShadowRef.current) return;
    gsap.killTweensOf([polaroidWrapperRef.current, polaroidShadowRef.current]);

    gsap.to(polaroidWrapperRef.current, {
      y: -5,
      scale: 1.02,
      rotation: -1.2,
      duration: 0.32,
      ease: "power2.out",
    });

    gsap.to(polaroidShadowRef.current, {
      x: 4,
      y: 10,
      scale: 1.03,
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
      rotation: -2.4,
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
  // About Me Biography Sheet Controls (Positioned Directly Below the Polaroid)
  // ==========================================================================
  const toggleAboutPaper = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsBioOpen((prev) => {
      const next = !prev;
      if (!next) {
        setIsEditingBio(false);
      } else {
        setEditBioValue(bio || "");
      }
      return next;
    });
  };

  const openAboutPaper = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditBioValue(bio || "");
    setIsBioOpen(true);
  };

  const closeAboutPaper = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsBioOpen(false);
    setIsEditingBio(false);
  };

  const handleStartEditBio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditBioValue(bio || "");
    setIsEditingBio(true);
    setTimeout(() => {
      bioTextareaRef.current?.focus();
    }, 50);
  };

  const handleCancelEditBio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditBioValue(bio || "");
    setIsEditingBio(false);
  };

  const handleSaveBio = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSavingBio) return;
    try {
      setIsSavingBio(true);
      const trimmed = editBioValue.trim().slice(0, 500);
      const res: any = await api.profile.update({ bio: trimmed });
      const savedBio =
        res?.usuario && typeof res.usuario.bio === "string"
          ? res.usuario.bio
          : trimmed;
      setBio(savedBio);
      setEditBioValue(savedBio);
      await refreshUser();
      setIsEditingBio(false);
      showToast("Biography saved", "success");
    } catch (err: any) {
      showToast(err.message || "Could not save biography.", "error");
    } finally {
      setIsSavingBio(false);
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
      setLocalPhotoUrl(user?.foto_url || null);
      showToast(err.message || "Could not upload photograph to server.", "error");
    } finally {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {}
      setIsUploadingPhoto(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    e.target.value = "";
  };

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

    const angle = 2.4 * (Math.PI / 180);
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

  if (loading) {
    return (
      <main className="desk-page-container" aria-label="Loading desk...">
        <div className="desk-ambient-lighting" aria-hidden="true" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            color: "var(--color-ink-muted, #d8c6aa)",
            fontFamily: "var(--font-serif, serif)",
          }}
        >
          <span style={{ fontSize: "1.1rem", letterSpacing: "0.05em", fontStyle: "italic" }}>
            Opening your desk…
          </span>
        </div>
      </main>
    );
  }

  return (
    <main
      className="desk-page-container"
      aria-label="My Desk — Personal Writing Desk"
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
            ZONE 1 (LEFT COLUMN): POLAROID PORTRAIT + ABOUT ME NOTE & PAGE
            - Polaroid photo and editable name caption at top
            - Dedicated "About Me" button directly below the Polaroid
            - Biography manuscript page sliding upward directly underneath
              the Polaroid when clicked
            ================================================================ */}
        <section
          className="desk-personal-column"
          aria-label="Personal portrait and biography"
        >
          <div className="desk-polaroid-anchor">
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
          </div>

          {/* ==============================================================
              DEDICATED "ABOUT ME" BUTTON — IMMEDIATELY BELOW THE POLAROID
              ============================================================== */}
          <div className="desk-about-under-polaroid">
            <button
              type="button"
              className={`desk-about-note-btn ${isBioOpen ? "is-active" : ""}`}
              onClick={toggleAboutPaper}
              aria-expanded={isBioOpen}
              aria-controls="desk-polaroid-bio-page"
            >
              <span className="desk-about-note-btn__pin" aria-hidden="true" />
              <span className="desk-about-note-btn__ornament" aria-hidden="true">✦</span>
              <span className="desk-about-note-btn__label">About Me</span>
              <span
                className={`desk-about-note-btn__chevron ${isBioOpen ? "is-open" : ""}`}
                aria-hidden="true"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            {/* ============================================================
                BIOGRAPHY PAGE — SLIDES UPWARD DIRECTLY UNDERNEATH POLAROID
                ============================================================ */}
            <div
              id="desk-polaroid-bio-page"
              className={`desk-bio-under-sheet ${isBioOpen ? "is-open" : ""}`}
              role="region"
              aria-label="About Me Biography Page"
              aria-hidden={!isBioOpen}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="desk-bio-paper-surface">
                {/* Top Brass Clip & Stitched Header */}
                <div className="desk-bio-paper-header">
                  <div className="desk-bio-paper-titles">
                    <span className="desk-bio-paper-kicker">PERSONAL NOTE</span>
                    <h2 className="desk-bio-paper-heading">About Me</h2>
                  </div>
                  <button
                    type="button"
                    className="desk-bio-close-btn"
                    onClick={closeAboutPaper}
                    aria-label="Close About Me page"
                    title="Close"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Biography Content: Reading Mode vs. Edit Mode */}
                <div className="desk-bio-paper-body">
                  {!isEditingBio ? (
                    <div className="desk-bio-reading-mode">
                      {bio && bio.trim().length > 0 ? (
                        <p className="desk-bio-content-text">{bio}</p>
                      ) : (
                        <p className="desk-bio-empty-message">
                          Your story begins here. Add a few words about yourself.
                        </p>
                      )}

                      <div className="desk-bio-reading-footer">
                        <span className="desk-bio-author-sign">
                          — {user?.nome || fullUserName}
                        </span>
                        <button
                          type="button"
                          className="desk-bio-edit-trigger"
                          onClick={handleStartEditBio}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="desk-bio-edit-mode">
                      <textarea
                        ref={bioTextareaRef}
                        className="desk-bio-textarea"
                        maxLength={500}
                        value={editBioValue}
                        onChange={(e) => setEditBioValue(e.target.value)}
                        placeholder="Your story begins here. Add a few words about yourself…"
                        aria-label="Edit your biography"
                      />
                      <div className="desk-bio-edit-footer">
                        <span className="desk-bio-char-counter">
                          {editBioValue.length} / 500
                        </span>
                        <div className="desk-bio-edit-actions">
                          <button
                            type="button"
                            className="desk-bio-btn-cancel"
                            onClick={handleCancelEditBio}
                            disabled={isSavingBio}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="desk-bio-btn-save"
                            onClick={handleSaveBio}
                            disabled={isSavingBio}
                          >
                            {isSavingBio ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ZONE 2 (CENTER): REDESIGNED HEIRLOOM ARTISAN NOTEBOOK -> /journal
            Handcrafted editorial leather volume with gold-foil embossing,
            spine ribs, cream paper fore-edges, brass clasp & silk ribbon
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
        >
          <div ref={journalShadowRef} className="desk-journal-shadow" aria-hidden="true" />
          <div
            ref={journalVisualRef}
            className={`desk-journal-visual desk-heirloom-book desk-heirloom-book--${notebookColorId}`}
          >
            {/* 1. Back Hardcover Board & Cream Deckled Paper Edges */}
            <span className="desk-book__backboard" aria-hidden="true" />
            <span className="desk-book__pages-right" aria-hidden="true" />
            <span className="desk-book__pages-bottom" aria-hidden="true" />

            {/* 2. Silk Bookmark Ribbon */}
            <span className="desk-book__silk-ribbon" aria-hidden="true" />

            {/* 3. Main Hand-Tooled Leather Cover */}
            <div className="desk-book__leather-cover">
              <span className="desk-book__grain" aria-hidden="true" />
              <span className="desk-book__sheen" aria-hidden="true" />
              <span className="desk-book__stitch-perimeter" aria-hidden="true" />

              {/* Left Bound Spine with 5 Raised Hub Ribs */}
              <span className="desk-book__spine" aria-hidden="true">
                <span className="desk-book__spine-rib desk-book__spine-rib--1" />
                <span className="desk-book__spine-rib desk-book__spine-rib--2" />
                <span className="desk-book__spine-rib desk-book__spine-rib--3" />
                <span className="desk-book__spine-rib desk-book__spine-rib--4" />
                <span className="desk-book__spine-rib desk-book__spine-rib--5" />
                <span className="desk-book__spine-groove" />
              </span>

              {/* Double Embossed Gold-Foil Frame & Botanical Corner Ornaments */}
              <div className="desk-book__gold-frame">
                {/* Top-Left Botanical Corner SVG */}
                <svg className="desk-book__corner desk-book__corner--tl" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M2 30V6C2 3.79 3.79 2 6 2H30" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M6 22V8C6 6.9 6.9 6 8 6H22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
                  <circle cx="9.5" cy="9.5" r="1.8" fill="currentColor" />
                  <path d="M9.5 9.5C13 9.5 15 11.5 15 15C11.5 15 9.5 13 9.5 9.5Z" fill="currentColor" opacity="0.65" />
                </svg>
                {/* Top-Right Botanical Corner SVG */}
                <svg className="desk-book__corner desk-book__corner--tr" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M30 30V6C30 3.79 28.21 2 26 2H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M26 22V8C26 6.9 25.1 6 24 6H10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
                  <circle cx="22.5" cy="9.5" r="1.8" fill="currentColor" />
                  <path d="M22.5 9.5C19 9.5 17 11.5 17 15C20.5 15 22.5 13 22.5 9.5Z" fill="currentColor" opacity="0.65" />
                </svg>
                {/* Bottom-Left Botanical Corner SVG */}
                <svg className="desk-book__corner desk-book__corner--bl" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M2 2V26C2 28.21 3.79 30 6 30H30" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M6 10V24C6 25.1 6.9 26 8 26H22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
                  <circle cx="9.5" cy="22.5" r="1.8" fill="currentColor" />
                  <path d="M9.5 22.5C13 22.5 15 20.5 15 17C11.5 17 9.5 19 9.5 22.5Z" fill="currentColor" opacity="0.65" />
                </svg>
                {/* Bottom-Right Botanical Corner SVG */}
                <svg className="desk-book__corner desk-book__corner--br" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M30 2V26C30 28.21 28.21 30 26 30H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M26 10V24C26 25.1 25.1 26 24 26H10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
                  <circle cx="22.5" cy="22.5" r="1.8" fill="currentColor" />
                  <path d="M22.5 22.5C19 22.5 17 20.5 17 17C20.5 17 22.5 19 22.5 22.5Z" fill="currentColor" opacity="0.65" />
                </svg>

                {/* Central Gold-Stamped Medallion & Cartouche */}
                <div className="desk-book__cartouche">
                  <span className="desk-book__kicker">PERSONAL ARCHIVE · JOURNAL</span>

                  <svg
                    className="desk-book__medallion"
                    viewBox="0 0 96 96"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.72"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="35"
                      stroke="currentColor"
                      strokeWidth="1.35"
                      opacity="0.9"
                    />
                    {/* Botanical Olive Wreath Left & Right */}
                    <path
                      d="M32 64C23 55 23 39 32 29"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.78"
                    />
                    <path
                      d="M64 64C73 55 73 39 64 29"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.78"
                    />
                    {/* Vintage Quill Feather & Ink Nib */}
                    <path
                      d="M34 62C42 49 52 37 64 28C61 42 52 52 39 58"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M31 65L42 55"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle cx="48" cy="21" r="2" fill="currentColor" />
                    <circle cx="48" cy="75" r="2" fill="currentColor" />
                  </svg>

                  <span className="desk-book__title">{notebookTitle}</span>
                  <span className="desk-book__divider" aria-hidden="true">
                    <span className="desk-book__divider-line" />
                    <span className="desk-book__divider-gem">❖</span>
                    <span className="desk-book__divider-line" />
                  </span>
                  <span className="desk-book__subtitle">
                    Personal Reflections &amp; Kept Memories
                  </span>

                  <span className="desk-book__edition-badge">
                    {notebookPageCount > 0
                      ? `${notebookPageCount} ${notebookPageCount === 1 ? "PAGE" : "PAGES"} WRITTEN`
                      : "OPEN TO WRITE →"}
                  </span>
                </div>
              </div>

              {/* Right Fore-Edge Antique Brass Clasp */}
              <span className="desk-book__brass-clasp" aria-hidden="true">
                <span className="desk-book__clasp-rivet" />
                <span className="desk-book__clasp-lock" />
                <span className="desk-book__clasp-rivet" />
              </span>
            </div>
          </div>
        </Link>

        {/* ================================================================
            ZONE 3 (RIGHT): VINTAGE WAX-SEALED CORRESPONDENCE -> /letters
            Cohesive handcrafted postal parcel with parchment stationery,
            illustrated postage stamp, postmark, calligraphy & wax seal
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
        >
          <div ref={envelopeShadowRef} className="desk-envelope-shadow" aria-hidden="true" />
          <div ref={envelopeVisualRef} className="desk-envelope-visual">
            {/* Underlying Second Stationery Sheet for Layered Tactile Depth */}
            <div className="desk-parcel-under-sheet" aria-hidden="true">
              <span className="desk-parcel-under-lines" />
            </div>

            {/* Main Vintage Parchment Correspondence Envelope */}
            <div className="desk-parcel-envelope">
              <span className="desk-parcel-envelope__border" aria-hidden="true" />
              <span className="desk-parcel-envelope__flap-lines" aria-hidden="true" />

              {/* Top Row: Postal Markings & Perforated Vintage Stamp */}
              <div className="desk-parcel-top-row">
                <div className="desk-parcel-postmark" aria-hidden="true">
                  <svg className="desk-parcel-postmark__svg" viewBox="0 0 130 56" fill="none">
                    <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="1.4" opacity="0.72" />
                    <circle cx="28" cy="28" r="17" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 2" opacity="0.6" />
                    <text x="28" y="25" textAnchor="middle" fill="currentColor" fontSize="6.5" fontWeight="700" letterSpacing="1.2">
                      BETWEEN LETTERS
                    </text>
                    <text x="28" y="34" textAnchor="middle" fill="currentColor" fontSize="5.8" letterSpacing="1">
                      ARCHIVE POST
                    </text>
                    <path d="M54 19C66 15 78 23 90 19C102 15 114 23 126 19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
                    <path d="M54 28C66 24 78 32 90 28C102 24 114 32 126 28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
                    <path d="M54 37C66 33 78 41 90 37C102 33 114 41 126 37" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </div>

                {/* Perforated Vintage Postage Stamp */}
                <div className="desk-parcel-stamp" aria-hidden="true">
                  <div className="desk-parcel-stamp__inner">
                    <span className="desk-parcel-stamp__price">1924</span>
                    <svg className="desk-parcel-stamp__art" viewBox="0 0 36 36" fill="none">
                      <path d="M8 26C13 19 20 13 28 9C26 17 21 23 13 26" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                    </svg>
                    <span className="desk-parcel-stamp__label">POSTAGE</span>
                  </div>
                </div>
              </div>

              {/* Center Calligraphic Recipient Inscription */}
              <div className="desk-parcel-address">
                <span className="desk-parcel-address__kicker">PERSONAL CORRESPONDENCE</span>
                <span className="desk-parcel-address__recipient">
                  For the Words Worth Keeping
                </span>
                <span className="desk-parcel-address__line" />
                <span className="desk-parcel-address__sub">
                  Folded Stationery &amp; Wax-Sealed Letters
                </span>
              </div>

              {/* Embossed Crimson Wax Seal + Action Cue */}
              <div className="desk-parcel-bottom-row">
                <span className="desk-parcel-cta">WRITE A LETTER →</span>

                <div className="desk-parcel-wax-seal" aria-hidden="true">
                  <div className="desk-parcel-wax-seal__inner">
                    <svg viewBox="0 0 40 40" width="22" height="22" fill="none">
                      <circle cx="20" cy="20" r="16" stroke="rgba(244, 212, 156, 0.75)" strokeWidth="1" strokeDasharray="2 2" />
                      <path d="M13 26C17 20 22 15 28 11C26 18 22 23 16 26" stroke="rgba(248, 222, 172, 0.92)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* ================================================================
            FIRST-LOGIN GUIDED ONBOARDING
            ================================================================ */}
        {onboardingStep !== null && (
          <div
            className="desk-onboarding-bubble"
            style={
              onboardingStep === 1
                ? { top: "18%", left: "26%" }
                : onboardingStep === 2
                ? { top: "48%", left: "26%" }
                : onboardingStep === 3
                ? { top: "44%", left: "50%", transform: "translate(-50%, -50%)" }
                : { top: "38%", right: "26%" }
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
                <h2 className="desk-onboarding-title">About Me Biography</h2>
                <p className="desk-onboarding-text">
                  Click the &ldquo;About Me&rdquo; note directly below your Polaroid to slide out
                  and edit your personal biography page.
                </p>
              </>
            )}
            {onboardingStep === 3 && (
              <>
                <h2 className="desk-onboarding-title">Your Leather Journal</h2>
                <p className="desk-onboarding-text">
                  Click your central leather-bound volume anytime to open the Journal editor and
                  record your daily reflections.
                </p>
              </>
            )}
            {onboardingStep === 4 && (
              <>
                <h2 className="desk-onboarding-title">Personal Correspondence</h2>
                <p className="desk-onboarding-text">
                  Click the sealed envelope on the right to compose personal letters, fold
                  stationery, and seal them with wax.
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
          VINTAGE FEEDBACK TOAST
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
