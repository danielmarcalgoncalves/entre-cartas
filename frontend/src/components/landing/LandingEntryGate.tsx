"use client";

import React, { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AuthSessionLoadingScreen from "@/components/auth/AuthSessionLoadingScreen";

export default function LandingEntryGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, restoringSession } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const resetToken = params.get("token");
      if (resetToken) {
        router.replace(`/login?mode=reset&token=${encodeURIComponent(resetToken)}`);
        return;
      }
    }
    if (!loading && user) {
      router.replace("/my-desk");
    }
  }, [loading, user, router]);

  if (restoringSession || (!loading && user)) {
    return <AuthSessionLoadingScreen />;
  }

  return <>{children}</>;
}
