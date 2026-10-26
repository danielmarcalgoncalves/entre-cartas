"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/");
  };

  return (
    <div
      className="page-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 220px)",
        padding: "30px 16px 50px",
      }}
    >
      <div style={{ marginBottom: "22px", textAlign: "center" }}>
        <Link
          href="/"
          className="text-link"
          style={{ fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>←</span> Return to sanctuary
        </Link>
      </div>

      <AuthCard onSuccess={handleSuccess} initialMode="choice" />
    </div>
  );
}
