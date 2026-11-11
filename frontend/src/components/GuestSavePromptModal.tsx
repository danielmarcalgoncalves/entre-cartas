"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export type GuestPromptVariant = "save" | "shelf" | "notebook-manage" | "notebook-open";

export interface GuestSavePromptModalProps {
  isOpen: boolean;
  onClose?: () => void;
  variant?: GuestPromptVariant;
  inline?: boolean;
}

const PROMPT_COPY: Record<
  GuestPromptVariant,
  {
    kicker: string;
    heading: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
  }
> = {
  save: {
    kicker: "PREVIEW MODE · KEEP YOUR WRITING",
    heading: "Your words deserve a place to stay.",
    description:
      "Create an account or sign in to save your writing and keep your memories with you.",
    primaryLabel: "Create account",
    secondaryLabel: "Continue exploring",
  },
  shelf: {
    kicker: "PERSONAL ARCHIVE · ACCOUNT REQUIRED",
    heading: "Your memories need a home.",
    description:
      "Create an account to keep your journals and letters organized in your personal shelf, and access them whenever you return.",
    primaryLabel: "Create account",
    secondaryLabel: "Go back",
  },
  "notebook-manage": {
    kicker: "JOURNAL COLLECTION · ACCOUNT REQUIRED",
    heading: "Your own journal collection is waiting for you.",
    description:
      "Create an account or sign in to create and manage your personal notebooks. Having an account unlocks the complete Journal experience and lets you keep your memories safe.",
    primaryLabel: "Create account",
    secondaryLabel: "Continue exploring",
  },
  "notebook-open": {
    kicker: "PERSONAL NOTEBOOK · SIGN IN REQUIRED",
    heading: "This notebook is waiting for you.",
    description:
      "Sign in or create your account to open this notebook and access its pages. Your personal journals are available once you enter your account.",
    primaryLabel: "Create account",
    secondaryLabel: "Continue exploring",
  },
};

export function GuestAccountPromptCard({
  onClose,
  variant = "save",
}: {
  onClose?: () => void;
  variant?: GuestPromptVariant;
}) {
  const router = useRouter();
  const copy = PROMPT_COPY[variant] || PROMPT_COPY.save;

  const handleSecondary = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/explore");
    }
  };

  return (
    <div
      className="guest-account-card"
      role="dialog"
      aria-modal={!onClose ? undefined : true}
      aria-labelledby="guest-prompt-title"
    >
      <div className="guest-account-card__seal" aria-hidden="true">
        <span>✦</span>
      </div>

      <span className="guest-account-card__kicker">{copy.kicker}</span>

      <h2 id="guest-prompt-title" className="guest-account-card__title">
        {copy.heading}
      </h2>

      <p className="guest-account-card__desc">{copy.description}</p>

      <div className="guest-account-card__actions">
        <Link href="/login?mode=register" className="guest-account-card__primary">
          {copy.primaryLabel}
        </Link>

        <Link href="/login" className="guest-account-card__secondary">
          Sign in
        </Link>

        <button
          type="button"
          onClick={handleSecondary}
          className="guest-account-card__ghost"
        >
          {copy.secondaryLabel}
        </button>
      </div>
    </div>
  );
}

export default function GuestSavePromptModal({
  isOpen,
  onClose,
  variant = "save",
}: GuestSavePromptModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="guest-account-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "460px" }}
          >
            <GuestAccountPromptCard onClose={onClose} variant={variant} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
