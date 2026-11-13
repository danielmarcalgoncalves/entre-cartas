"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import AuthModal from "@/components/AuthModal";

interface AdminMetricsResponse {
  users: {
    free: number;
    pro: number;
    admin: number;
    verified?: number;
    activeLast30Days?: number;
    total: number;
  };
  subscriptions: {
    active: number;
    trialing: number;
    pastDue?: number;
    canceled?: number;
    totalRecords?: number;
    totalActive: number;
  };
  mrr: {
    estimatedTestMrr: number;
    monthlyPrice: number;
    currency: string;
    isEstimate: boolean;
    revenueTrackedInDb?: boolean;
  };
  application?: {
    letters: {
      total: number;
      userAuthored: number;
      curatedPublic: number;
      inTrash: number;
    };
    journals: {
      notebooks: number;
    };
    folders: {
      total: number;
    };
    storageTracked: boolean;
  };
  generatedAt?: string;
}

interface AdminUserSummary {
  id: number;
  nome: string;
  email: string;
  papel: string;
  plan: string;
  subscriptionStatus: string | null;
  emailVerificado: boolean;
  statusConta: string;
  criadoEm: string | null;
  ultimoLogin: string | null;
}

interface AdminUserDetail extends AdminUserSummary {
  authProvider: string;
  activity?: {
    letters: number;
    notebooks: number;
    folders: number;
  };
  subscription: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    status: string;
    periodoInicio: string | null;
    periodoFim: string | null;
    atualizadoEm: string | null;
  } | null;
}

interface AdminUsersPagination {
  strategy?: "cursor" | "offset";
  page: number;
  limit: number;
  maxPageSize: number;
  total: number;
  totalPages: number;
  nextCursor?: number | null;
  prevCursor?: number | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface AdminLogEntry {
  id: string;
  usuario_id?: string | number | null;
  acao?: string;
  timestamp?: string;
  detalhes?: unknown;
}

const SENSITIVE_KEY_RE = /pass|token|secret|key|auth|cookie|hash|signature|card/i;
const MAX_USERS_PER_PAGE = 20;

function formatBrl(amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

function formatTimestamp(ts?: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deriveSeverity(action?: string): { label: string; color: string; bg: string; border: string } {
  const upper = (action || "").toUpperCase();
  if (upper.includes("ERRO") || upper.includes("FALH") || upper.includes("FAIL") || upper.includes("BLOQUEIO")) {
    return {
      label: "Warning",
      color: "#ffd0c7",
      bg: "rgba(176, 54, 40, 0.28)",
      border: "rgba(224, 108, 88, 0.5)",
    };
  }
  if (upper.includes("REVOG") || upper.includes("EXCLU") || upper.includes("DELETE")) {
    return {
      label: "Notice",
      color: "#f5d7a3",
      bg: "rgba(173, 120, 48, 0.25)",
      border: "rgba(207, 169, 111, 0.45)",
    };
  }
  return {
    label: "Info",
    color: "#d4ebd4",
    bg: "rgba(62, 115, 74, 0.25)",
    border: "rgba(116, 178, 130, 0.42)",
  };
}

function roleBadgeStyle(papel: string): { label: string; color: string; bg: string; border: string } {
  if (papel === "admin") {
    return {
      label: "Admin",
      color: "#f7dfb3",
      bg: "rgba(207, 169, 111, 0.2)",
      border: "rgba(207, 169, 111, 0.55)",
    };
  }
  if (papel === "premium") {
    return {
      label: "Pro",
      color: "#d4ebd4",
      bg: "rgba(62, 115, 74, 0.25)",
      border: "rgba(116, 178, 130, 0.45)",
    };
  }
  return {
    label: "Free",
    color: "#d6cdbf",
    bg: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.16)",
  };
}

function subscriptionBadgeStyle(status: string | null): { label: string; color: string; bg: string; border: string } {
  if (!status) {
    return {
      label: "None",
      color: "#9a9081",
      bg: "rgba(255, 255, 255, 0.03)",
      border: "rgba(255, 255, 255, 0.1)",
    };
  }
  const s = status.toLowerCase();
  if (s === "active" || s === "trialing") {
    return {
      label: s === "trialing" ? "Trialing" : "Active",
      color: "#d4ebd4",
      bg: "rgba(62, 115, 74, 0.25)",
      border: "rgba(116, 178, 130, 0.45)",
    };
  }
  if (s === "past_due" || s === "unpaid") {
    return {
      label: s === "past_due" ? "Past Due" : "Unpaid",
      color: "#ffd0c7",
      bg: "rgba(176, 54, 40, 0.28)",
      border: "rgba(224, 108, 88, 0.5)",
    };
  }
  return {
    label: status,
    color: "#e6c999",
    bg: "rgba(173, 120, 48, 0.2)",
    border: "rgba(207, 169, 111, 0.35)",
  };
}

function formatLogDescription(detalhes: unknown): string {
  if (!detalhes) return "No additional details recorded.";
  if (typeof detalhes === "string") return detalhes;
  if (typeof detalhes === "object" && !Array.isArray(detalhes)) {
    const safePairs = Object.entries(detalhes as Record<string, unknown>)
      .filter(([k, v]) => !SENSITIVE_KEY_RE.test(k) && v !== undefined && v !== null && v !== "")
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    return safePairs.length > 0 ? safePairs.join(" · ") : "Event recorded.";
  }
  return "Event recorded.";
}

export default function AdminControlWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [pagination, setPagination] = useState<AdminUsersPagination>({
    page: 1,
    limit: MAX_USERS_PER_PAGE,
    maxPageSize: MAX_USERS_PER_PAGE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [usersPage, setUsersPage] = useState(1);
  const [cursorRequest, setCursorRequest] = useState<{ cursor: number | null; direction: "next" | "prev" }>({
    cursor: null,
    direction: "next",
  });
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  const isAdmin = user?.papel === "admin";

  // Debounce user search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setUsersPage(1);
      setCursorRequest({ cursor: null, direction: "next" });
      setDebouncedSearch(searchInput.trim());
    }, 320);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Clear all sensitive admin state if session ends or privileges are revoked
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      setMetrics(null);
      setLogs([]);
      setUsers([]);
      setSelectedUser(null);
      setLastUpdated(null);
    }
  }, [authLoading, isAdmin]);

  const loadUsersPage = useCallback(
    async (cursor: number | null, direction: "next" | "prev", query: string) => {
      if (!isAdmin) return;
      setUsersLoading(true);
      setUsersError(null);
      try {
        const res = await api.admin.getUsers({
          cursor,
          direction,
          limit: MAX_USERS_PER_PAGE,
          q: query || undefined,
        });
        setUsers(Array.isArray(res?.users) ? res.users : []);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        setUsersError(err?.message || "Unable to load users.");
      } finally {
        setUsersLoading(false);
      }
    },
    [isAdmin]
  );

  const loadAdminOverview = useCallback(async () => {
    if (!isAdmin || refreshingRef.current) return;
    refreshingRef.current = true;
    setLoadingData(true);
    setErrorMsg(null);
    setLogsError(null);
    try {
      const [metricsResult, logsResult] = await Promise.allSettled([
        api.admin.getMetrics(),
        api.admin.getLogs(),
      ]);

      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value);
        setLastUpdated(metricsResult.value?.generatedAt || new Date().toISOString());
      } else {
        setMetrics(null);
        setErrorMsg(metricsResult.reason?.message || "Unable to load database metrics.");
      }

      if (logsResult.status === "fulfilled") {
        setLogs(Array.isArray(logsResult.value?.logs) ? logsResult.value.logs.slice(0, 20) : []);
      } else {
        setLogs([]);
        setLogsError(logsResult.reason?.message || "Unable to load audit logs from log-service.");
      }
    } finally {
      setLoadingData(false);
      refreshingRef.current = false;
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadAdminOverview();
    }
  }, [authLoading, isAdmin, loadAdminOverview]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadUsersPage(cursorRequest.cursor, cursorRequest.direction, debouncedSearch);
    }
  }, [authLoading, isAdmin, cursorRequest, debouncedSearch, loadUsersPage]);

  const handleRefreshAll = async () => {
    await Promise.all([
      loadAdminOverview(),
      loadUsersPage(cursorRequest.cursor, cursorRequest.direction, debouncedSearch),
    ]);
  };

  const handleOpenUserDetail = async (userId: number) => {
    if (!isAdmin) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await api.admin.getUserDetail(userId);
      setSelectedUser(res?.user || null);
    } catch (err: any) {
      setDetailError(err?.message || "Unable to load user details.");
    } finally {
      setDetailLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page-shell">
        <div className="letter-object" style={{ padding: "48px 32px", textAlign: "center" }}>
          <p className="page-intro" style={{ margin: "0 auto" }}>
            Verifying administrator credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell">
        <header className="page-heading">
          <span className="eyebrow">Restricted Sanctuary</span>
          <h1 className="display-title">Administration</h1>
          <p className="page-intro">
            Administrator authentication is required to access this workspace.
          </p>
        </header>

        <div className="letter-object" style={{ padding: "36px 28px", maxWidth: "560px" }}>
          <h3 className="object-title" style={{ marginBottom: "10px" }}>
            Sign in required
          </h3>
          <p className="page-intro" style={{ marginBottom: "22px" }}>
            Please sign in with an authorized administrator account to continue.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="stamp-button"
              onClick={() => setShowAuthModal(true)}
            >
              Sign in as Administrator
            </button>
            <Link href="/my-desk" className="stamp-button secondary">
              Return to My Desk
            </Link>
          </div>
        </div>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-shell">
        <header className="page-heading">
          <span className="eyebrow">Access Restricted</span>
          <h1 className="display-title">Administration</h1>
          <p className="page-intro">
            Your current account does not have administrator permissions.
          </p>
        </header>

        <div className="letter-object" style={{ padding: "36px 28px", maxWidth: "560px" }}>
          <h3 className="object-title" style={{ marginBottom: "10px" }}>
            403 — Restricted Workspace
          </h3>
          <p className="page-intro" style={{ marginBottom: "22px" }}>
            Only authorized administrators may inspect operational metrics, user records, and audit logs.
          </p>
          <Link href="/my-desk" className="stamp-button">
            Return to My Desk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ maxWidth: "1180px" }}>
      {/* Header */}
      <header
        className="page-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "20px",
          paddingBottom: "24px",
          borderBottom: "1px solid rgba(207, 169, 111, 0.22)",
        }}
      >
        <div>
          <span className="eyebrow" style={{ color: "#cfa96f" }}>
            Internal Operations &amp; Security Governance
          </span>
          <h1 className="display-title">Administration</h1>
          <p className="page-intro" style={{ marginBottom: "8px" }}>
            Authenticated oversight of Between Letters accounts, subscription health, and security audit telemetry.
          </p>
          <p style={{ fontSize: "13px", color: "#b7ab98", margin: 0 }}>
            Signed in as <strong style={{ color: "#f3e9d6" }}>{user.nome}</strong> ({user.email})
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <button
            type="button"
            className="stamp-button"
            disabled={loadingData || usersLoading}
            onClick={handleRefreshAll}
          >
            {loadingData || usersLoading ? "Refreshing..." : "Refresh Workspace"}
          </button>
          <span style={{ fontSize: "12px", color: "#9c907f" }}>
            Last updated: {formatTimestamp(lastUpdated)}
          </span>
        </div>
      </header>

      {errorMsg && (
        <div
          className="letter-object"
          style={{
            padding: "16px 20px",
            marginBottom: "24px",
            border: "1px solid rgba(224, 108, 88, 0.5)",
            backgroundColor: "rgba(130, 32, 24, 0.2)",
            color: "#ffd0c7",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Metrics Grid */}
      <section aria-label="Administrative Metrics" style={{ marginBottom: "40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
          }}
        >
          <div className="letter-object" style={{ padding: "22px 20px", borderColor: "rgba(207, 169, 111, 0.22)" }}>
            <span className="object-kind">Total Users</span>
            <h3 className="object-title" style={{ fontSize: "34px", marginTop: "8px", color: "#f6efe2" }}>
              {loadingData && !metrics ? "—" : errorMsg && !metrics ? "Unavailable" : metrics?.users.total ?? 0}
            </h3>
            <p style={{ fontSize: "13px", color: "#9c907f", margin: "6px 0 0" }}>
              {metrics
                ? `Free: ${metrics.users.free} · Pro: ${metrics.users.pro} · Admin: ${metrics.users.admin}`
                : errorMsg
                ? "Database metrics unavailable"
                : "Loading breakdown..."}
            </p>
            {metrics && (
              <p style={{ fontSize: "12px", color: "#8c8273", margin: "4px 0 0" }}>
                Verified: {metrics.users.verified ?? 0} · Active (30d): {metrics.users.activeLast30Days ?? 0}
              </p>
            )}
          </div>

          <div className="letter-object" style={{ padding: "22px 20px", borderColor: "rgba(207, 169, 111, 0.22)" }}>
            <span className="object-kind">Free vs. Pro</span>
            <h3 className="object-title" style={{ fontSize: "34px", marginTop: "8px", color: "#f6efe2" }}>
              {loadingData && !metrics
                ? "—"
                : errorMsg && !metrics
                ? "Unavailable"
                : `${metrics?.users.free ?? 0} / ${metrics?.users.pro ?? 0}`}
            </h3>
            <p style={{ fontSize: "13px", color: "#9c907f", margin: "6px 0 0" }}>
              Standard accounts vs. Pro Sender Club
            </p>
          </div>

          <div className="letter-object" style={{ padding: "22px 20px", borderColor: "rgba(207, 169, 111, 0.22)" }}>
            <span className="object-kind">Stripe Subscriptions</span>
            <h3 className="object-title" style={{ fontSize: "34px", marginTop: "8px", color: "#f6efe2" }}>
              {loadingData && !metrics
                ? "—"
                : errorMsg && !metrics
                ? "Unavailable"
                : metrics?.subscriptions.totalActive ?? 0}
            </h3>
            <p style={{ fontSize: "13px", color: "#9c907f", margin: "6px 0 0" }}>
              {metrics
                ? `Active: ${metrics.subscriptions.active} · Trialing: ${metrics.subscriptions.trialing}`
                : errorMsg
                ? "Subscription records unavailable"
                : "Loading subscription counts..."}
            </p>
            {metrics && (
              <p style={{ fontSize: "12px", color: "#8c8273", margin: "4px 0 0" }}>
                Past due: {metrics.subscriptions.pastDue ?? 0} · Canceled: {metrics.subscriptions.canceled ?? 0} · Total rows: {metrics.subscriptions.totalRecords ?? 0}
              </p>
            )}
          </div>

          <div
            className="letter-object"
            style={{
              padding: "22px 20px",
              border: "1px solid rgba(207, 169, 111, 0.45)",
              backgroundColor: "rgba(207, 169, 111, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <span className="object-kind" style={{ color: "#cfa96f" }}>
                Estimated Test MRR
              </span>
              <span
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  border: "1px solid rgba(207, 169, 111, 0.45)",
                  color: "#f5d7a3",
                }}
              >
                Estimate
              </span>
            </div>
            <h3 className="object-title" style={{ fontSize: "32px", marginTop: "8px", color: "#f7dfb3" }}>
              {loadingData && !metrics
                ? "—"
                : errorMsg && !metrics
                ? "Unavailable"
                : formatBrl(metrics?.mrr.estimatedTestMrr ?? 0)}
            </h3>
            <p style={{ fontSize: "12px", color: "#b7ab98", margin: "6px 0 0" }}>
              {metrics
                ? `Test-mode estimate (${formatBrl(metrics.mrr.monthlyPrice)} × ${metrics.subscriptions.totalActive} active/trialing). Stripe invoice amounts are not stored in MariaDB.`
                : "Subscription revenue data unavailable."}
            </p>
          </div>
        </div>

        {/* Application Metrics from MariaDB */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginTop: "18px",
          }}
        >
          <div className="letter-object" style={{ padding: "20px", borderColor: "rgba(207, 169, 111, 0.22)" }}>
            <span className="object-kind">Letters (MariaDB)</span>
            <h3 className="object-title" style={{ fontSize: "30px", marginTop: "8px", color: "#f6efe2" }}>
              {loadingData && !metrics
                ? "—"
                : errorMsg && !metrics
                ? "Unavailable"
                : metrics?.application?.letters.total ?? 0}
            </h3>
            <p style={{ fontSize: "12px", color: "#9c907f", margin: "6px 0 0" }}>
              {metrics?.application
                ? `User-authored: ${metrics.application.letters.userAuthored} · Curated public: ${metrics.application.letters.curatedPublic} · Trash: ${metrics.application.letters.inTrash}`
                : "Letter records unavailable"}
            </p>
          </div>

          <div className="letter-object" style={{ padding: "20px", borderColor: "rgba(207, 169, 111, 0.22)" }}>
            <span className="object-kind">Journal Notebooks</span>
            <h3 className="object-title" style={{ fontSize: "30px", marginTop: "8px", color: "#f6efe2" }}>
              {loadingData && !metrics
                ? "—"
                : errorMsg && !metrics
                ? "Unavailable"
                : metrics?.application?.journals.notebooks ?? 0}
            </h3>
            <p style={{ fontSize: "12px", color: "#9c907f", margin: "6px 0 0" }}>
              Persisted journal volumes in `cadernos`
            </p>
          </div>

          <div className="letter-object" style={{ padding: "20px", borderColor: "rgba(207, 169, 111, 0.22)" }}>
            <span className="object-kind">Correspondence Folders</span>
            <h3 className="object-title" style={{ fontSize: "30px", marginTop: "8px", color: "#f6efe2" }}>
              {loadingData && !metrics
                ? "—"
                : errorMsg && !metrics
                ? "Unavailable"
                : metrics?.application?.folders.total ?? 0}
            </h3>
            <p style={{ fontSize: "12px", color: "#9c907f", margin: "6px 0 0" }}>
              Persisted folders in `pastas_cartas`
            </p>
          </div>

          <div className="letter-object" style={{ padding: "20px", borderColor: "rgba(255, 255, 255, 0.14)" }}>
            <span className="object-kind">Storage Usage</span>
            <h3 className="object-title" style={{ fontSize: "24px", marginTop: "10px", color: "#c9beab" }}>
              Not tracked
            </h3>
            <p style={{ fontSize: "12px", color: "#8c8273", margin: "8px 0 0" }}>
              Byte-level MinIO object storage metrics are not recorded in MariaDB.
            </p>
          </div>
        </div>
      </section>

      {/* Users Section */}
      <section aria-label="Users" style={{ marginBottom: "40px" }}>
        <div className="letter-object" style={{ padding: "26px 24px", borderColor: "rgba(207, 169, 111, 0.25)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <div>
              <span className="object-kind" style={{ color: "#cfa96f" }}>
                Account Directory · Max {MAX_USERS_PER_PAGE} per request
              </span>
              <h2 className="object-title" style={{ fontSize: "24px", marginTop: "4px" }}>
                Users
              </h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or email..."
                aria-label="Search users by name or email"
                style={{
                  padding: "9px 14px",
                  borderRadius: "6px",
                  border: "1px solid rgba(207, 169, 111, 0.3)",
                  backgroundColor: "rgba(18, 15, 12, 0.75)",
                  color: "#f3e9d6",
                  fontSize: "13px",
                  minWidth: "230px",
                }}
              />
              <span style={{ fontSize: "12px", color: "#9c907f" }}>
                Total: <strong style={{ color: "#f3e9d6" }}>{pagination.total}</strong>
              </span>
            </div>
          </div>

          {usersError && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                borderRadius: "6px",
                border: "1px solid rgba(224, 108, 88, 0.45)",
                backgroundColor: "rgba(130, 32, 24, 0.2)",
                color: "#ffd0c7",
                fontSize: "13px",
              }}
            >
              {usersError}
            </div>
          )}

          {usersLoading && users.length === 0 ? (
            <p className="page-intro" style={{ margin: "16px 0" }}>
              Loading registered users...
            </p>
          ) : users.length === 0 ? (
            <p className="page-intro" style={{ margin: "16px 0" }}>
              {debouncedSearch
                ? "No users matched your search query."
                : "No registered users found."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(207, 169, 111, 0.25)", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>User</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Email</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Role</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Plan</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Subscription</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Created</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Last Login</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600, textAlign: "right" }}>
                      Inspect
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const rBadge = roleBadgeStyle(u.papel);
                    const sBadge = subscriptionBadgeStyle(u.subscriptionStatus);
                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
                      >
                        <td style={{ padding: "11px 8px", color: "#f3e9d6", fontWeight: 500 }}>
                          {u.nome}
                          <span style={{ display: "block", fontSize: "11px", color: "#8c8273" }}>
                            ID #{u.id}
                          </span>
                        </td>
                        <td style={{ padding: "11px 8px", color: "#d6cdbf" }}>{u.email}</td>
                        <td style={{ padding: "11px 8px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: rBadge.color,
                              backgroundColor: rBadge.bg,
                              border: `1px solid ${rBadge.border}`,
                            }}
                          >
                            {rBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: "11px 8px", color: "#e8dfd1" }}>{u.plan}</td>
                        <td style={{ padding: "11px 8px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              color: sBadge.color,
                              backgroundColor: sBadge.bg,
                              border: `1px solid ${sBadge.border}`,
                            }}
                          >
                            {sBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: "11px 8px", color: "#b7ab98", whiteSpace: "nowrap" }}>
                          {formatTimestamp(u.criadoEm)}
                        </td>
                        <td style={{ padding: "11px 8px", color: "#b7ab98", whiteSpace: "nowrap" }}>
                          {formatTimestamp(u.ultimoLogin)}
                        </td>
                        <td style={{ padding: "11px 8px", textAlign: "right" }}>
                          <button
                            type="button"
                            className="stamp-button secondary"
                            style={{ padding: "5px 11px", fontSize: "11px" }}
                            onClick={() => handleOpenUserDetail(u.id)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "18px",
              paddingTop: "14px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span style={{ fontSize: "12px", color: "#9c907f" }}>
              Page <strong style={{ color: "#f3e9d6" }}>{usersPage}</strong> of{" "}
              <strong style={{ color: "#f3e9d6" }}>{pagination.totalPages}</strong> · Showing up to{" "}
              {pagination.limit} users per page
            </span>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="stamp-button secondary"
                disabled={usersLoading || !pagination.hasPreviousPage || !pagination.prevCursor}
                onClick={() => {
                  setUsersPage((p) => Math.max(1, p - 1));
                  setCursorRequest({ cursor: pagination.prevCursor || null, direction: "prev" });
                }}
              >
                Previous
              </button>
              <button
                type="button"
                className="stamp-button secondary"
                disabled={usersLoading || !pagination.hasNextPage || !pagination.nextCursor}
                onClick={() => {
                  setUsersPage((p) => p + 1);
                  setCursorRequest({ cursor: pagination.nextCursor || null, direction: "next" });
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Safe Read-Only User Detail Panel */}
      {(detailLoading || detailError || selectedUser) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="User Account Details"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(10, 8, 6, 0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
          onClick={() => {
            setSelectedUser(null);
            setDetailError(null);
          }}
        >
          <div
            className="letter-object"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "28px 26px",
              border: "1px solid rgba(207, 169, 111, 0.45)",
              backgroundColor: "#1b1612",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <span className="object-kind" style={{ color: "#cfa96f" }}>
                  Account Summary
                </span>
                <h3 className="object-title" style={{ fontSize: "22px", marginTop: "4px" }}>
                  {detailLoading ? "Loading account..." : selectedUser?.nome || "User Details"}
                </h3>
              </div>
              <button
                type="button"
                className="stamp-button secondary"
                onClick={() => {
                  setSelectedUser(null);
                  setDetailError(null);
                }}
              >
                Close
              </button>
            </div>

            {detailError && (
              <p style={{ color: "#ffd0c7", fontSize: "13px" }}>{detailError}</p>
            )}

            {selectedUser && !detailLoading && (
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: "10px 14px",
                  fontSize: "13px",
                  margin: 0,
                }}
              >
                <dt style={{ color: "#9c907f" }}>User ID</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>#{selectedUser.id}</dd>

                <dt style={{ color: "#9c907f" }}>Email</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>{selectedUser.email}</dd>

                <dt style={{ color: "#9c907f" }}>Role / Plan</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>
                  {selectedUser.papel} ({selectedUser.plan})
                </dd>

                <dt style={{ color: "#9c907f" }}>Auth Provider</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>{selectedUser.authProvider}</dd>

                <dt style={{ color: "#9c907f" }}>Email Verified</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>
                  {selectedUser.emailVerificado ? "Verified" : "Unverified"}
                </dd>

                <dt style={{ color: "#9c907f" }}>Account Status</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>{selectedUser.statusConta}</dd>

                <dt style={{ color: "#9c907f" }}>Created</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>{formatTimestamp(selectedUser.criadoEm)}</dd>

                <dt style={{ color: "#9c907f" }}>Last Login</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>{formatTimestamp(selectedUser.ultimoLogin)}</dd>

                <dt style={{ color: "#9c907f" }}>Activity</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>
                  {selectedUser.activity
                    ? `${selectedUser.activity.letters} letter(s) · ${selectedUser.activity.notebooks} journal(s) · ${selectedUser.activity.folders} folder(s)`
                    : "Not available"}
                </dd>

                <dt style={{ color: "#9c907f" }}>Subscription</dt>
                <dd style={{ margin: 0, color: "#f3e9d6" }}>
                  {selectedUser.subscription
                    ? `${selectedUser.subscription.status} (${formatTimestamp(
                        selectedUser.subscription.periodoInicio
                      )} → ${formatTimestamp(selectedUser.subscription.periodoFim)})`
                    : "No Stripe subscription"}
                </dd>

                {selectedUser.subscription?.stripeCustomerId && (
                  <>
                    <dt style={{ color: "#9c907f" }}>Stripe Customer</dt>
                    <dd style={{ margin: 0, color: "#d6cdbf", fontFamily: "monospace", fontSize: "12px" }}>
                      {selectedUser.subscription.stripeCustomerId}
                    </dd>
                  </>
                )}

                {selectedUser.subscription?.stripeSubscriptionId && (
                  <>
                    <dt style={{ color: "#9c907f" }}>Stripe Sub ID</dt>
                    <dd style={{ margin: 0, color: "#d6cdbf", fontFamily: "monospace", fontSize: "12px" }}>
                      {selectedUser.subscription.stripeSubscriptionId}
                    </dd>
                  </>
                )}
              </dl>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity / Audit Logs */}
      <section aria-label="Recent Administrative Activity">
        <div className="letter-object" style={{ padding: "26px 24px", borderColor: "rgba(207, 169, 111, 0.22)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <span className="object-kind" style={{ color: "#cfa96f" }}>
                Audit Stream
              </span>
              <h2 className="object-title" style={{ fontSize: "24px", marginTop: "4px" }}>
                Recent Activity
              </h2>
            </div>
            <span style={{ fontSize: "12px", color: "#9c907f" }}>
              Showing latest {logs.length} event{logs.length === 1 ? "" : "s"}
            </span>
          </div>

          {logsError ? (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                border: "1px solid rgba(224, 108, 88, 0.45)",
                backgroundColor: "rgba(130, 32, 24, 0.2)",
                color: "#ffd0c7",
                fontSize: "13px",
              }}
            >
              {logsError}
            </div>
          ) : loadingData && logs.length === 0 ? (
            <p className="page-intro" style={{ margin: 0 }}>
              Loading recent audit events...
            </p>
          ) : logs.length === 0 ? (
            <p className="page-intro" style={{ margin: 0 }}>
              No audit events recorded yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(207, 169, 111, 0.25)", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Event</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Level</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>User ID</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Details</th>
                    <th style={{ padding: "10px 8px", color: "#cfa96f", fontWeight: 600 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry) => {
                    const sev = deriveSeverity(entry.acao);
                    return (
                      <tr
                        key={entry.id}
                        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
                      >
                        <td style={{ padding: "10px 8px", fontWeight: 600, color: "#f3e9d6", whiteSpace: "nowrap" }}>
                          {entry.acao || "SYSTEM_EVENT"}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: sev.color,
                              backgroundColor: sev.bg,
                              border: `1px solid ${sev.border}`,
                            }}
                          >
                            {sev.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", color: "#d6cdbf" }}>
                          {entry.usuario_id ?? "—"}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#d6cdbf" }}>
                          {formatLogDescription(entry.detalhes)}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#b7ab98", whiteSpace: "nowrap" }}>
                          {formatTimestamp(entry.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
