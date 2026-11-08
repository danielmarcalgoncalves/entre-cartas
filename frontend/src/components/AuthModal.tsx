"use client";

import React, { Suspense } from "react";
import AuthCard from "@/components/AuthCard";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "choice" | "login" | "register";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        backgroundColor: "rgba(32, 24, 16, 0.68)",
        backdropFilter: "blur(5px)",
        padding: "24px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "576px" }}>
        <Suspense fallback={null}>
          <AuthCard
            onClose={onClose}
            onSuccess={onClose}
            initialMode={initialMode}
          />
        </Suspense>
      </div>
    </div>
  );
}
