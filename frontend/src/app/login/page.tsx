"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import AuthCard from "@/components/AuthCard";
import "./auth-paper.css";

function LoginExperienceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const isResetFlow =
    searchParams?.get("mode") === "reset" ||
    Boolean(searchParams?.get("token") && searchParams?.get("oauth") !== "success");

  // Redirect authenticated users visiting /login directly to My Desk
  useEffect(() => {
    if (!loading && user && !isResetFlow) {
      router.replace("/my-desk");
    }
  }, [loading, user, isResetFlow, router]);

  const handleSuccess = () => {
    router.push("/my-desk");
  };

  return (
    <div className="bl-auth-viewport">
      {/* Full-screen softly blurred vintage photograph of trees and warm sky */}
      <div className="bl-auth-bg-layer" aria-hidden="true">
        <div className="bl-auth-bg-photo" />
        <div className="bl-auth-bg-vignette" />
      </div>

      {/* Subtle return link to public landing page */}
      <Link href="/" className="bl-auth-back-home">
        <span aria-hidden="true">&larr;</span>
        <span>Between Letters</span>
      </Link>

      {/* Central Aged Paper Sheet & Kraft Tape Authentication Card */}
      <AuthCard onSuccess={handleSuccess} initialMode="login" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bl-auth-viewport">
          <div className="bl-auth-bg-layer" aria-hidden="true">
            <div className="bl-auth-bg-photo" />
            <div className="bl-auth-bg-vignette" />
          </div>
        </div>
      }
    >
      <LoginExperienceContent />
    </Suspense>
  );
}
