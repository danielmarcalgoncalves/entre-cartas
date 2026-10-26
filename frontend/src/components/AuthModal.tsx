"use client";

import AuthCard from "@/components/AuthCard";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "choice" | "login" | "register";
}

export default function AuthModal({ isOpen, onClose, initialMode = "choice" }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        backgroundColor: "rgba(43, 35, 25, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "460px" }}>
        <AuthCard
          onClose={onClose}
          onSuccess={onClose}
          initialMode={initialMode}
        />
      </div>
    </div>
  );
}
