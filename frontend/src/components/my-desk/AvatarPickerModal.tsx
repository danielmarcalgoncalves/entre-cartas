"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api } from "@/services/api";
import "./avatar-picker.css";

export interface DefaultAvatarItem {
  id: string;
  label: string;
  url: string;
}

interface AvatarPickerModalProps {
  isOpen: boolean;
  currentPhotoUrl: string | null;
  onClose: () => void;
  onChooseUploadFromDevice: () => void;
  onConfirmDefaultAvatar: (avatar: DefaultAvatarItem) => Promise<void>;
}

export default function AvatarPickerModal({
  isOpen,
  currentPhotoUrl,
  onClose,
  onChooseUploadFromDevice,
  onConfirmDefaultAvatar,
}: AvatarPickerModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState<"choice" | "gallery">("choice");
  const [avatars, setAvatars] = useState<DefaultAvatarItem[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<DefaultAvatarItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset step when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep("choice");
    setLoadError(null);
    setSaving(false);
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, saving, onClose]);

  const openGallery = async () => {
    setStep("gallery");
    setLoadError(null);
    if (avatars.length > 0) {
      const existing = avatars.find((a) => a.url === currentPhotoUrl) || avatars[0] || null;
      setSelectedAvatar(existing);
      return;
    }

    setLoadingAvatars(true);
    try {
      const res = await api.profile.listDefaultAvatars();
      const list = Array.isArray(res?.avatars) ? res.avatars : [];
      setAvatars(list);
      const existing = list.find((a) => a.url === currentPhotoUrl) || list[0] || null;
      setSelectedAvatar(existing);
    } catch {
      setLoadError("Unable to load the portrait collection right now. Please try again.");
    } finally {
      setLoadingAvatars(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAvatar || saving) return;
    setSaving(true);
    try {
      await onConfirmDefaultAvatar(selectedAvatar);
      onClose();
    } catch {
      // Parent displays toast feedback
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="avatar-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          onClick={() => !saving && onClose()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-picker-title"
        >
          <motion.div
            className="avatar-picker-sheet"
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="avatar-picker-header">
              <div>
                <h2 id="avatar-picker-title" className="avatar-picker-title">
                  {step === "choice" ? "Add a Portrait" : "Choose your avatar"}
                </h2>
                <p className="avatar-picker-subtitle">
                  {step === "choice"
                    ? "Upload a personal photograph or select a keepsake portrait."
                    : "A little portrait for your letters."}
                </p>
              </div>
              <button
                type="button"
                className="avatar-picker-close"
                onClick={() => !saving && onClose()}
                aria-label="Close portrait selector"
                title="Close (Esc)"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            <div className="avatar-picker-body">
              {step === "choice" ? (
                <div className="avatar-choice-grid">
                  <button
                    type="button"
                    className="avatar-choice-card"
                    onClick={() => {
                      onClose();
                      onChooseUploadFromDevice();
                    }}
                  >
                    <span className="avatar-choice-icon" aria-hidden="true">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </span>
                    <span className="avatar-choice-title">Upload from device</span>
                    <span className="avatar-choice-desc">
                      Select a personal JPEG, PNG, or WebP photograph from your device and adjust its Polaroid framing.
                    </span>
                  </button>

                  <button
                    type="button"
                    className="avatar-choice-card"
                    onClick={openGallery}
                  >
                    <span className="avatar-choice-icon" aria-hidden="true">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" />
                      </svg>
                    </span>
                    <span className="avatar-choice-title">Choose a default avatar</span>
                    <span className="avatar-choice-desc">
                      Browse our curated Between Letters portrait collection and pick a keepsake avatar.
                    </span>
                  </button>
                </div>
              ) : (
                <div className="avatar-gallery-stage">
                  {loadingAvatars ? (
                    <div className="avatar-gallery-status">Opening portrait collection…</div>
                  ) : loadError ? (
                    <div className="avatar-gallery-status">{loadError}</div>
                  ) : avatars.length === 0 ? (
                    <div className="avatar-gallery-status">
                      No predefined portraits are currently available. You can upload a personal photo from your device instead.
                    </div>
                  ) : (
                    <>
                      {selectedAvatar && (
                        <div className="avatar-preview-banner">
                          <div className="avatar-preview-circle">
                            <img src={selectedAvatar.url} alt={selectedAvatar.label} />
                          </div>
                          <div className="avatar-preview-meta">
                            <span className="avatar-preview-label">{selectedAvatar.label}</span>
                            <span className="avatar-preview-hint">
                              Selected portrait preview — confirm below to update your profile across Between Letters.
                            </span>
                          </div>
                        </div>
                      )}

                      <div
                        className="avatar-gallery-grid"
                        role="radiogroup"
                        aria-label="Predefined profile avatars"
                      >
                        {avatars.map((avatar) => {
                          const isSelected = selectedAvatar?.id === avatar.id;
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={avatar.label}
                              className={`avatar-option-btn ${isSelected ? "is-selected" : ""}`}
                              onClick={() => setSelectedAvatar(avatar)}
                            >
                              <img
                                src={avatar.url}
                                alt={avatar.label}
                                className="avatar-option-img"
                                loading="lazy"
                              />
                              {isSelected && (
                                <span className="avatar-option-check" aria-hidden="true">
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="avatar-picker-footer">
                    <button
                      type="button"
                      className="avatar-btn-ghost"
                      onClick={() => setStep("choice")}
                      disabled={saving}
                    >
                      ← Back
                    </button>

                    <div className="avatar-picker-footer-right">
                      <button
                        type="button"
                        className="avatar-btn-ghost"
                        onClick={onClose}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="avatar-btn-confirm"
                        onClick={handleConfirm}
                        disabled={!selectedAvatar || saving || avatars.length === 0}
                      >
                        {saving ? "Saving…" : "Use this avatar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
