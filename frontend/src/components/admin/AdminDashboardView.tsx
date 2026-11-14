"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { AUTHORIZED_ADMIN_EMAIL, isAuthorizedAdminUser } from "@/lib/admin-config";

type AdminTab = "overview" | "users" | "logs";

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function getPlanBadgeStyle(plan?: string) {
  const normalized = String(plan || "").toLowerCase();
  if (normalized === "admin") {
    return {
      background: "rgba(207, 169, 111, 0.22)",
      border: "1px solid rgba(207, 169, 111, 0.65)",
      color: "#f3d79b",
      label: "Admin",
    };
  }
  if (normalized === "pro" || normalized === "premium") {
    return {
      background: "rgba(173, 91, 48, 0.28)",
      border: "1px solid rgba(226, 132, 92, 0.65)",
      color: "#ffd6c2",
      label: "Pro",
    };
  }
  return {
    background: "rgba(120, 112, 98, 0.2)",
    border: "1px solid rgba(150, 140, 122, 0.4)",
    color: "var(--text-secondary, #cbbfa8)",
    label: "Free",
  };
}

function getSubscriptionBadgeStyle(status?: string | null) {
  const s = String(status || "none").toLowerCase();
  if (s === "active" || s === "trialing") {
    return {
      background: "rgba(76, 122, 84, 0.25)",
      border: "1px solid rgba(114, 178, 125, 0.55)",
      color: "#b8ecc0",
      label: s.toUpperCase(),
    };
  }
  if (s === "past_due") {
    return {
      background: "rgba(184, 86, 45, 0.32)",
      border: "1px solid rgba(235, 135, 92, 0.75)",
      color: "#ffd1b8",
      label: "PAST DUE",
    };
  }
  if (s === "canceled" || s === "unpaid" || s === "incomplete_expired") {
    return {
      background: "rgba(128, 62, 58, 0.28)",
      border: "1px solid rgba(190, 102, 96, 0.5)",
      color: "#f0b6b2",
      label: s.toUpperCase(),
    };
  }
  return {
    background: "rgba(110, 104, 94, 0.16)",
    border: "1px solid rgba(140, 132, 118, 0.32)",
    color: "var(--text-muted, #a89f8d)",
    label: "NONE",
  };
}

export default function AdminDashboardView() {
  const { user, loading: authLoading } = useAuth();
  const isAuthorized = isAuthorizedAdminUser(user);

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Users state (max 20 per page enforced on both frontend and backend)
  const [usersData, setUsersData] = useState<{
    users: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    users: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearchInput, setUsersSearchInput] = useState("");
  const [usersSearchQuery, setUsersSearchQuery] = useState("");
  const [usersPlanFilter, setUsersPlanFilter] = useState("all");
  const [usersSubFilter, setUsersSubFilter] = useState("all");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Selected User Detail Mode state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [userDetailError, setUserDetailError] = useState<string | null>(null);

  // Logs state
  const [logsData, setLogsData] = useState<{
    logs: any[];
    availableEventTypes: string[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    logs: [],
    availableEventTypes: ["AUTH", "JOURNAL", "LETTER", "FAVORITES", "ADMIN", "PAYMENT"],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });
  const [logsPage, setLogsPage] = useState(1);
  const [logsSearchInput, setLogsSearchInput] = useState("");
  const [logsSearchQuery, setLogsSearchQuery] = useState("");
  const [logsEventType, setLogsEventType] = useState("all");
  const [logsActionFilter, setLogsActionFilter] = useState("");
  const [logsUserIdFilter, setLogsUserIdFilter] = useState("");
  const [logsDateFrom, setLogsDateFrom] = useState("");
  const [logsDateTo, setLogsDateTo] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingMetrics(true);
    setMetricsError(null);
    try {
      const data = await api.admin.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      setMetricsError(err.message || "Failed to load administrative metrics.");
    } finally {
      setLoadingMetrics(false);
    }
  }, [isAuthorized]);

  const fetchUsers = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const data = await api.admin.getUsers({
        page: usersPage,
        limit: 20,
        q: usersSearchQuery || undefined,
        plan: usersPlanFilter !== "all" ? usersPlanFilter : undefined,
        subscriptionStatus: usersSubFilter !== "all" ? usersSubFilter : undefined,
      });
      setUsersData({
        users: Array.isArray(data.users) ? data.users : [],
        pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
      });
    } catch (err: any) {
      setUsersError(err.message || "Failed to load paginated users.");
    } finally {
      setLoadingUsers(false);
    }
  }, [isAuthorized, usersPage, usersSearchQuery, usersPlanFilter, usersSubFilter]);

  const fetchUserDetail = useCallback(
    async (id: number) => {
      if (!isAuthorized) return;
      setSelectedUserId(id);
      setLoadingUserDetail(true);
      setUserDetailError(null);
      try {
        const data = await api.admin.getUserDetail(id);
        setUserDetail(data);
      } catch (err: any) {
        setUserDetailError(err.message || "Failed to load user account details.");
      } finally {
        setLoadingUserDetail(false);
      }
    },
    [isAuthorized]
  );

  const fetchLogs = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingLogs(true);
    setLogsError(null);
    try {
      const data = await api.admin.getLogs({
        page: logsPage,
        limit: 20,
        q: logsSearchQuery || undefined,
        eventType: logsEventType !== "all" ? logsEventType : undefined,
        action: logsActionFilter || undefined,
        userId: logsUserIdFilter || undefined,
        from: logsDateFrom || undefined,
        to: logsDateTo || undefined,
      });
      setLogsData({
        logs: Array.isArray(data.logs) ? data.logs : [],
        availableEventTypes: Array.isArray(data.availableEventTypes)
          ? data.availableEventTypes
          : ["AUTH", "JOURNAL", "LETTER", "FAVORITES", "ADMIN", "PAYMENT"],
        pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
      });
    } catch (err: any) {
      setLogsError(err.message || "Failed to load system logs.");
    } finally {
      setLoadingLogs(false);
    }
  }, [
    isAuthorized,
    logsPage,
    logsSearchQuery,
    logsEventType,
    logsActionFilter,
    logsUserIdFilter,
    logsDateFrom,
    logsDateTo,
  ]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchMetrics();
  }, [isAuthorized, fetchMetrics]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchUsers();
  }, [isAuthorized, fetchUsers]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchLogs();
  }, [isAuthorized, fetchLogs]);

  if (authLoading) {
    return (
      <div className="page-shell" style={{ padding: "64px 24px", textAlign: "center" }}>
        <span className="eyebrow">Verifying Administrative Credentials</span>
        <h1 className="display-title" style={{ fontSize: "28px", marginTop: "10px" }}>
          Loading Sanctuary Administration...
        </h1>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="page-shell" style={{ padding: "64px 24px", maxWidth: "620px", margin: "0 auto" }}>
        <div
          className="paper-panel"
          role="alert"
          style={{
            padding: "36px 28px",
            textAlign: "center",
            border: "1px solid rgba(190, 102, 96, 0.55)",
          }}
        >
          <span className="stamp-mark" style={{ color: "#f0b6b2", borderColor: "#ad5b30" }}>
            403 · RESTRICTED AREA
          </span>
          <h1 className="display-title" style={{ fontSize: "30px", margin: "14px 0 10px" }}>
            Administrative Access Restricted
          </h1>
          <p className="page-intro" style={{ margin: "0 auto 24px" }}>
            This administrative console is exclusively reserved for the authorized sanctuary administrator.
          </p>
          <Link href="/my-desk" className="primary-cta" style={{ textDecoration: "none" }}>
            Return to My Desk
          </Link>
        </div>
      </div>
    );
  }

  const handleUsersSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsersPage(1);
    setUsersSearchQuery(usersSearchInput.trim());
  };

  const handleLogsSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogsPage(1);
    setLogsSearchQuery(logsSearchInput.trim());
  };

  const handleInspectUserLogs = (uid: number) => {
    setLogsUserIdFilter(String(uid));
    setLogsPage(1);
    setActiveTab("logs");
  };

  return (
    <div className="page-shell" style={{ maxWidth: "1240px", margin: "0 auto", paddingBottom: "64px" }}>
      {/* Header */}
      <header
        className="page-heading"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "16px",
          marginBottom: "28px",
          borderBottom: "1px solid var(--border-subtle, rgba(207, 169, 111, 0.2))",
          paddingBottom: "20px",
        }}
      >
        <div>
          <span className="eyebrow">Sanctuary Operations · Real-Time Database & Event Telemetry</span>
          <h1 className="display-title" style={{ margin: "6px 0 8px" }}>
            Admin Dashboard
          </h1>
          <p className="page-intro" style={{ margin: 0 }}>
            Authenticated as <strong>{AUTHORIZED_ADMIN_EMAIL}</strong> · Exclusive Administrative Session
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="stamp-button compact"
            onClick={() => {
              fetchMetrics();
              fetchUsers();
              fetchLogs();
              if (selectedUserId) fetchUserDetail(selectedUserId);
            }}
          >
            ↻ Refresh All Data
          </button>
        </div>
      </header>

      {/* Primary Section Tabs */}
      <nav
        aria-label="Admin sections"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "28px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={activeTab === "overview" ? "primary-cta" : "stamp-button"}
          style={{ minHeight: "40px", padding: "8px 18px" }}
        >
          Overview & Metrics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={activeTab === "users" ? "primary-cta" : "stamp-button"}
          style={{ minHeight: "40px", padding: "8px 18px" }}
        >
          Users & Account Details ({usersData.pagination.total || metrics?.users?.total || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={activeTab === "logs" ? "primary-cta" : "stamp-button"}
          style={{ minHeight: "40px", padding: "8px 18px" }}
        >
          User & System Logs ({logsData.pagination.total || 0})
        </button>
      </nav>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === "overview" && (
        <section aria-label="Application overview and real metrics">
          {metricsError && (
            <div
              className="paper-panel"
              role="alert"
              style={{
                marginBottom: "20px",
                padding: "16px",
                border: "1px solid rgba(226, 132, 92, 0.65)",
                color: "#ffd2be",
              }}
            >
              {metricsError}
            </div>
          )}

          {/* Row 1: User Plan Breakdown (Mutually Exclusive) */}
          <h2 className="section-title" style={{ fontSize: "20px", marginBottom: "12px" }}>
            Accounts & Plan Distribution
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Total Registered Users</span>
              <div className="display-title" style={{ fontSize: "34px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.users?.total ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Sum of Free + Pro + Admin accounts in MariaDB
              </p>
            </div>

            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Free Plan Users (usuario)</span>
              <div className="display-title" style={{ fontSize: "34px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.users?.free ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Standard quota (up to 3 journals, 10 letters)
              </p>
            </div>

            <div
              className="paper-panel"
              style={{
                padding: "20px",
                border: "1px solid rgba(207, 169, 111, 0.45)",
              }}
            >
              <span className="object-kind" style={{ color: "var(--color-pollen, #cfa96f)" }}>
                PRO Plan Users (premium)
              </span>
              <div
                className="display-title"
                style={{ fontSize: "34px", marginTop: "6px", color: "var(--color-pollen, #cfa96f)" }}
              >
                {loadingMetrics && !metrics ? "…" : metrics?.users?.pro ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Active or grace-period Pro Sender members
              </p>
            </div>

            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Admin Accounts (admin)</span>
              <div className="display-title" style={{ fontSize: "34px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.users?.admin ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Exclusively {AUTHORIZED_ADMIN_EMAIL}
              </p>
            </div>
          </div>

          {/* Row 2: Stripe Subscriptions & Estimated MRR */}
          <h2 className="section-title" style={{ fontSize: "20px", marginBottom: "12px" }}>
            Stripe Subscriptions & Revenue Estimate
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div
              className="paper-panel"
              style={{
                padding: "20px",
                border: "1px solid rgba(114, 178, 125, 0.45)",
              }}
            >
              <span className="object-kind" style={{ color: "#b8ecc0" }}>
                Active Subscriptions
              </span>
              <div className="display-title" style={{ fontSize: "34px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.subscriptions?.active ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Trialing: {metrics?.subscriptions?.trialing ?? 0} · Total records:{" "}
                {metrics?.subscriptions?.total ?? 0}
              </p>
            </div>

            <div
              className="paper-panel"
              style={{
                padding: "20px",
                border:
                  (metrics?.subscriptions?.pastDue ?? 0) > 0
                    ? "1px solid rgba(235, 135, 92, 0.75)"
                    : undefined,
              }}
            >
              <span className="object-kind" style={{ color: "#ffd1b8" }}>
                Past-Due Subscriptions
              </span>
              <div className="display-title" style={{ fontSize: "34px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.subscriptions?.pastDue ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Renewal failed (`invoice.payment_failed`)
              </p>
            </div>

            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Canceled Subscriptions</span>
              <div className="display-title" style={{ fontSize: "34px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.subscriptions?.canceled ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Unpaid / Expired: {(metrics?.subscriptions?.unpaid ?? 0) + (metrics?.subscriptions?.incomplete ?? 0)}
              </p>
            </div>

            <div
              className="paper-panel"
              style={{
                padding: "20px",
                border: "1px solid rgba(207, 169, 111, 0.55)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="object-kind" style={{ color: "var(--color-pollen, #cfa96f)" }}>
                  Estimated MRR
                </span>
                <span
                  className="stamp-mark"
                  style={{ fontSize: "10px", padding: "1px 6px", minWidth: "auto" }}
                >
                  ESTIMATE
                </span>
              </div>
              <div
                className="display-title"
                style={{ fontSize: "34px", marginTop: "6px", color: "var(--color-pollen, #cfa96f)" }}
              >
                {loadingMetrics && !metrics
                  ? "…"
                  : `$${Number(metrics?.revenue?.estimatedMrr ?? 0).toFixed(2)}`}
              </div>
              <p style={{ fontSize: "11px", opacity: 0.8, margin: "6px 0 0" }}>
                Calculated as Active ({metrics?.subscriptions?.active ?? 0}) × $
                {Number(metrics?.revenue?.unitPrice ?? 14.9).toFixed(2)}/mo (not billed Stripe ledger)
              </p>
            </div>
          </div>

          {/* Row 3: Sanctuary Content Totals */}
          <h2 className="section-title" style={{ fontSize: "20px", marginBottom: "12px" }}>
            Application Content Volume
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Total Letters</span>
              <div className="display-title" style={{ fontSize: "32px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.content?.totalLetters ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Active: {metrics?.content?.activeLetters ?? 0} · Drafts:{" "}
                {metrics?.content?.draftLetters ?? 0} · Trash: {metrics?.content?.trashedLetters ?? 0}
              </p>
            </div>

            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Total Writing Journals</span>
              <div className="display-title" style={{ fontSize: "32px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.content?.totalJournals ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Stored in `cadernos_usuario`
              </p>
            </div>

            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Correspondence Folders</span>
              <div className="display-title" style={{ fontSize: "32px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.content?.totalFolders ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Stored in `pastas_usuario`
              </p>
            </div>

            <div className="paper-panel" style={{ padding: "20px" }}>
              <span className="object-kind">Saved Archive Letters</span>
              <div className="display-title" style={{ fontSize: "32px", marginTop: "6px" }}>
                {loadingMetrics && !metrics ? "…" : metrics?.content?.totalSavedLetters ?? 0}
              </div>
              <p style={{ fontSize: "12px", opacity: 0.75, margin: "6px 0 0" }}>
                Stored in `cartas_salvas`
              </p>
            </div>
          </div>

          {/* Row 4: Recent Application Events */}
          <div className="paper-panel" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <h2 className="section-title" style={{ fontSize: "20px", margin: 0 }}>
                Recent Application Events
              </h2>
              <button
                type="button"
                className="stamp-button compact"
                onClick={() => setActiveTab("logs")}
              >
                Open Full Log Explorer →
              </button>
            </div>

            {!metrics?.recentEvents || metrics.recentEvents.length === 0 ? (
              <p style={{ opacity: 0.75, margin: 0 }}>No recent events recorded in the log stream.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(207, 169, 111, 0.25)",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "8px 10px" }}>Timestamp</th>
                      <th style={{ padding: "8px 10px" }}>Type</th>
                      <th style={{ padding: "8px 10px" }}>Action</th>
                      <th style={{ padding: "8px 10px" }}>User ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentEvents.map((ev: any) => (
                      <tr
                        key={ev.id}
                        style={{ borderBottom: "1px solid rgba(207, 169, 111, 0.1)" }}
                      >
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          {formatDateTime(ev.timestamp)}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span className="stamp-mark" style={{ fontSize: "10px", padding: "1px 6px" }}>
                            {ev.eventType}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>
                          {ev.action}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {ev.userId ? (
                            <button
                              type="button"
                              className="stamp-button compact"
                              style={{ padding: "2px 8px", fontSize: "11px" }}
                              onClick={() => {
                                setActiveTab("users");
                                fetchUserDetail(Number(ev.userId));
                              }}
                            >
                              User #{ev.userId}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: USERS & ACCOUNT DETAILS */}
      {activeTab === "users" && (
        <section aria-label="User directory and account detail inspector">
          {/* Search & Filter Bar */}
          <div className="paper-panel" style={{ padding: "20px", marginBottom: "24px" }}>
            <form
              onSubmit={handleUsersSearchSubmit}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "12px",
                alignItems: "end",
              }}
            >
              <div>
                <label
                  htmlFor="admin-user-search"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  SEARCH NAME, EMAIL, OR ID
                </label>
                <input
                  id="admin-user-search"
                  type="text"
                  value={usersSearchInput}
                  onChange={(e) => setUsersSearchInput(e.target.value)}
                  placeholder="e.g. danielpgmarcal@gmail.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.55)",
                    color: "inherit",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="admin-user-plan-filter"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  FILTER BY PLAN
                </label>
                <select
                  id="admin-user-plan-filter"
                  value={usersPlanFilter}
                  onChange={(e) => {
                    setUsersPlanFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.85)",
                    color: "inherit",
                  }}
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free (usuario)</option>
                  <option value="pro">Pro (premium)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="admin-user-sub-filter"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  SUBSCRIPTION STATUS
                </label>
                <select
                  id="admin-user-sub-filter"
                  value={usersSubFilter}
                  onChange={(e) => {
                    setUsersSubFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.85)",
                    color: "inherit",
                  }}
                >
                  <option value="all">All Subscription States</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                  <option value="none">No Subscription</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" className="primary-cta" style={{ padding: "8px 16px" }}>
                  Search
                </button>
                <button
                  type="button"
                  className="stamp-button"
                  onClick={() => {
                    setUsersSearchInput("");
                    setUsersSearchQuery("");
                    setUsersPlanFilter("all");
                    setUsersSubFilter("all");
                    setUsersPage(1);
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {usersError && (
            <div
              className="paper-panel"
              role="alert"
              style={{
                marginBottom: "20px",
                padding: "16px",
                border: "1px solid rgba(226, 132, 92, 0.65)",
                color: "#ffd2be",
              }}
            >
              {usersError}
            </div>
          )}

          {/* Selected Account Detail Mode Drawer / Panel */}
          {selectedUserId !== null && (
            <div
              className="paper-panel"
              style={{
                padding: "24px",
                marginBottom: "28px",
                border: "2px solid var(--color-pollen, #cfa96f)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "18px",
                  borderBottom: "1px solid rgba(207, 169, 111, 0.25)",
                  paddingBottom: "14px",
                }}
              >
                <div>
                  <span className="eyebrow">Account Detail Mode · Complete Database Profile</span>
                  <h2 className="section-title" style={{ fontSize: "24px", margin: "4px 0 0" }}>
                    {loadingUserDetail
                      ? `Loading Account #${selectedUserId}...`
                      : userDetail?.accountInfo
                      ? `${userDetail.accountInfo.name} (#${userDetail.accountInfo.id})`
                      : `Account #${selectedUserId}`}
                  </h2>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="stamp-button compact"
                    onClick={() => handleInspectUserLogs(selectedUserId)}
                  >
                    View Full Logs for User #{selectedUserId} →
                  </button>
                  <button
                    type="button"
                    className="stamp-button compact"
                    onClick={() => {
                      setSelectedUserId(null);
                      setUserDetail(null);
                    }}
                  >
                    ✕ Close Inspector
                  </button>
                </div>
              </div>

              {userDetailError && (
                <p style={{ color: "#ffd2be" }}>{userDetailError}</p>
              )}

              {userDetail && !loadingUserDetail && (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                      gap: "18px",
                      marginBottom: "22px",
                    }}
                  >
                    {/* 1. Account Info */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        background: "rgba(20, 18, 15, 0.45)",
                        border: "1px solid rgba(207, 169, 111, 0.2)",
                      }}
                    >
                      <h3 style={{ fontSize: "15px", marginTop: 0, marginBottom: "12px", color: "var(--color-pollen, #cfa96f)" }}>
                        1. Account Information
                      </h3>
                      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "130px 1fr", rowGap: "8px", fontSize: "13px" }}>
                        <dt style={{ opacity: 0.7 }}>User ID:</dt>
                        <dd style={{ margin: 0, fontWeight: 700 }}>#{userDetail.accountInfo.id}</dd>
                        <dt style={{ opacity: 0.7 }}>Full Name:</dt>
                        <dd style={{ margin: 0 }}>{userDetail.accountInfo.name}</dd>
                        <dt style={{ opacity: 0.7 }}>Email:</dt>
                        <dd style={{ margin: 0, wordBreak: "break-all" }}>{userDetail.accountInfo.email}</dd>
                        <dt style={{ opacity: 0.7 }}>Plan / Role:</dt>
                        <dd style={{ margin: 0 }}>
                          <strong>{userDetail.accountInfo.plan}</strong> ({userDetail.accountInfo.role})
                        </dd>
                        <dt style={{ opacity: 0.7 }}>Auth Provider:</dt>
                        <dd style={{ margin: 0 }}>{userDetail.accountInfo.authProvider}</dd>
                        <dt style={{ opacity: 0.7 }}>Email Verified:</dt>
                        <dd style={{ margin: 0 }}>{userDetail.accountInfo.emailVerified ? "Yes" : "No"}</dd>
                        <dt style={{ opacity: 0.7 }}>Registered:</dt>
                        <dd style={{ margin: 0 }}>{formatDateTime(userDetail.accountInfo.createdAt)}</dd>
                        <dt style={{ opacity: 0.7 }}>Last Updated:</dt>
                        <dd style={{ margin: 0 }}>{formatDateTime(userDetail.accountInfo.updatedAt)}</dd>
                      </dl>
                    </div>

                    {/* 2. Subscription Info */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        background: "rgba(20, 18, 15, 0.45)",
                        border: "1px solid rgba(207, 169, 111, 0.2)",
                      }}
                    >
                      <h3 style={{ fontSize: "15px", marginTop: 0, marginBottom: "12px", color: "var(--color-pollen, #cfa96f)" }}>
                        2. Subscription & Billing Info
                      </h3>
                      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "145px 1fr", rowGap: "8px", fontSize: "13px" }}>
                        <dt style={{ opacity: 0.7 }}>Status:</dt>
                        <dd style={{ margin: 0, fontWeight: 700 }}>
                          {userDetail.subscriptionInfo.status.toUpperCase()}
                          {userDetail.subscriptionInfo.isPastDue ? " (PAST DUE)" : ""}
                        </dd>
                        <dt style={{ opacity: 0.7 }}>Stripe Customer:</dt>
                        <dd style={{ margin: 0, fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>
                          {userDetail.subscriptionInfo.stripeCustomerId || "—"}
                        </dd>
                        <dt style={{ opacity: 0.7 }}>Stripe Sub ID:</dt>
                        <dd style={{ margin: 0, fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>
                          {userDetail.subscriptionInfo.stripeSubscriptionId || "—"}
                        </dd>
                        <dt style={{ opacity: 0.7 }}>Sub Created:</dt>
                        <dd style={{ margin: 0 }}>{formatDateTime(userDetail.subscriptionInfo.createdAt)}</dd>
                        <dt style={{ opacity: 0.7 }}>Period Start:</dt>
                        <dd style={{ margin: 0 }}>{formatDateTime(userDetail.subscriptionInfo.currentPeriodStart)}</dd>
                        <dt style={{ opacity: 0.7 }}>Renewal / End:</dt>
                        <dd style={{ margin: 0 }}>{formatDateTime(userDetail.subscriptionInfo.currentPeriodEnd)}</dd>
                        <dt style={{ opacity: 0.7 }}>Last Synced:</dt>
                        <dd style={{ margin: 0 }}>{formatDateTime(userDetail.subscriptionInfo.updatedAt)}</dd>
                      </dl>
                    </div>

                    {/* 3. Usage Info */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        background: "rgba(20, 18, 15, 0.45)",
                        border: "1px solid rgba(207, 169, 111, 0.2)",
                      }}
                    >
                      <h3 style={{ fontSize: "15px", marginTop: 0, marginBottom: "12px", color: "var(--color-pollen, #cfa96f)" }}>
                        3. Content & Quota Usage
                      </h3>
                      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "165px 1fr", rowGap: "8px", fontSize: "13px" }}>
                        <dt style={{ opacity: 0.7 }}>Journals Created:</dt>
                        <dd style={{ margin: 0, fontWeight: 700 }}>
                          {userDetail.usageInfo.totalJournals} ({userDetail.usageInfo.totalJournalPages} pages)
                        </dd>
                        <dt style={{ opacity: 0.7 }}>Journal Media Files:</dt>
                        <dd style={{ margin: 0 }}>
                          {userDetail.usageInfo.totalJournalMediaAttachments} attachments (
                          {formatBytes(userDetail.usageInfo.trackedMediaBytes)})
                        </dd>
                        <dt style={{ opacity: 0.7 }}>Total Letters:</dt>
                        <dd style={{ margin: 0, fontWeight: 700 }}>
                          {userDetail.usageInfo.totalLetters} (Active: {userDetail.usageInfo.activeLetters}, Drafts:{" "}
                          {userDetail.usageInfo.draftLetters}, Trash: {userDetail.usageInfo.trashedLetters})
                        </dd>
                        <dt style={{ opacity: 0.7 }}>Letter Folders:</dt>
                        <dd style={{ margin: 0 }}>{userDetail.usageInfo.totalFolders}</dd>
                        <dt style={{ opacity: 0.7 }}>Saved Archive Letters:</dt>
                        <dd style={{ margin: 0 }}>{userDetail.usageInfo.savedArchiveLetters}</dd>
                        <dt style={{ opacity: 0.7 }}>Personal Notes:</dt>
                        <dd style={{ margin: 0 }}>{userDetail.usageInfo.personalNotes}</dd>
                      </dl>
                      <p style={{ fontSize: "11px", opacity: 0.75, marginTop: "10px", marginBottom: 0 }}>
                        {userDetail.usageInfo.storageTracking?.message}
                      </p>
                    </div>
                  </div>

                  {/* 4. Account Activity */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      background: "rgba(20, 18, 15, 0.45)",
                      border: "1px solid rgba(207, 169, 111, 0.2)",
                    }}
                  >
                    <h3 style={{ fontSize: "15px", marginTop: 0, marginBottom: "10px", color: "var(--color-pollen, #cfa96f)" }}>
                      4. Recent Account Activity Logs
                    </h3>
                    {!userDetail.activityLogs || userDetail.activityLogs.length === 0 ? (
                      <p style={{ fontSize: "13px", opacity: 0.75, margin: 0 }}>
                        No recent log entries recorded for this account.
                      </p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(207, 169, 111, 0.2)", textAlign: "left" }}>
                              <th style={{ padding: "6px 8px" }}>Timestamp</th>
                              <th style={{ padding: "6px 8px" }}>Type</th>
                              <th style={{ padding: "6px 8px" }}>Action</th>
                              <th style={{ padding: "6px 8px" }}>IP Address</th>
                              <th style={{ padding: "6px 8px" }}>Metadata</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.activityLogs.map((log: any) => (
                              <tr key={log.id} style={{ borderBottom: "1px solid rgba(207, 169, 111, 0.08)" }}>
                                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                                  {formatDateTime(log.timestamp)}
                                </td>
                                <td style={{ padding: "6px 8px" }}>{log.eventType}</td>
                                <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{log.action}</td>
                                <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{log.ip || "—"}</td>
                                <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "11px" }}>
                                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paginated Users Table (Max 20 per page) */}
          <div className="paper-panel" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 className="section-title" style={{ fontSize: "20px", margin: 0 }}>
                  Registered Users Directory
                </h2>
                <p style={{ fontSize: "12px", opacity: 0.75, margin: "4px 0 0" }}>
                  Showing up to 20 users per page · Total matching accounts:{" "}
                  <strong>{usersData.pagination.total}</strong>
                </p>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="stamp-button compact"
                  disabled={usersPage <= 1 || loadingUsers}
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: "13px" }}>
                  Page <strong>{usersData.pagination.page}</strong> of{" "}
                  <strong>{usersData.pagination.totalPages}</strong>
                </span>
                <button
                  type="button"
                  className="stamp-button compact"
                  disabled={usersPage >= usersData.pagination.totalPages || loadingUsers}
                  onClick={() => setUsersPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <p style={{ padding: "24px 0", textAlign: "center" }}>Loading user directory...</p>
            ) : usersData.users.length === 0 ? (
              <p style={{ padding: "24px 0", textAlign: "center", opacity: 0.75 }}>
                No user accounts match the selected filters.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(207, 169, 111, 0.3)",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "10px" }}>ID</th>
                      <th style={{ padding: "10px" }}>Full Name</th>
                      <th style={{ padding: "10px" }}>Email</th>
                      <th style={{ padding: "10px" }}>Plan</th>
                      <th style={{ padding: "10px" }}>Subscription Status</th>
                      <th style={{ padding: "10px" }}>Created Date</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.users.map((u: any) => {
                      const planBadge = getPlanBadgeStyle(u.plan);
                      const subBadge = getSubscriptionBadgeStyle(u.subscriptionStatus);
                      const isSelected = selectedUserId === u.id;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => fetchUserDetail(u.id)}
                          style={{
                            borderBottom: "1px solid rgba(207, 169, 111, 0.12)",
                            cursor: "pointer",
                            background: isSelected ? "rgba(207, 169, 111, 0.12)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "10px", fontWeight: 700 }}>#{u.id}</td>
                          <td style={{ padding: "10px" }}>{u.name}</td>
                          <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "12px" }}>
                            {u.email}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: planBadge.background,
                                border: planBadge.border,
                                color: planBadge.color,
                              }}
                            >
                              {planBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: subBadge.background,
                                border: subBadge.border,
                                color: subBadge.color,
                              }}
                            >
                              {subBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                            {formatDateShort(u.createdAt)}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" }}>
                            <button
                              type="button"
                              className="stamp-button compact"
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchUserDetail(u.id);
                              }}
                            >
                              {isSelected ? "Inspecting" : "Inspect Account"}
                            </button>
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
      )}

      {/* TAB 3: USER & SYSTEM LOGS */}
      {activeTab === "logs" && (
        <section aria-label="User activity and system event logs">
          <div className="paper-panel" style={{ padding: "20px", marginBottom: "24px" }}>
            <form
              onSubmit={handleLogsSearchSubmit}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                alignItems: "end",
              }}
            >
              <div>
                <label
                  htmlFor="admin-logs-search"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  SEARCH LOGS (TEXT / EMAIL / ACTION)
                </label>
                <input
                  id="admin-logs-search"
                  type="text"
                  value={logsSearchInput}
                  onChange={(e) => setLogsSearchInput(e.target.value)}
                  placeholder="Search action, user, metadata..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.55)",
                    color: "inherit",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="admin-logs-event-type"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  EVENT CATEGORY
                </label>
                <select
                  id="admin-logs-event-type"
                  value={logsEventType}
                  onChange={(e) => {
                    setLogsEventType(e.target.value);
                    setLogsPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.85)",
                    color: "inherit",
                  }}
                >
                  <option value="all">All Event Categories</option>
                  {logsData.availableEventTypes.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="admin-logs-user-id"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  USER ID FILTER
                </label>
                <input
                  id="admin-logs-user-id"
                  type="text"
                  value={logsUserIdFilter}
                  onChange={(e) => {
                    setLogsUserIdFilter(e.target.value.trim());
                    setLogsPage(1);
                  }}
                  placeholder="e.g. 1"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.55)",
                    color: "inherit",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="admin-logs-date-from"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  FROM DATE
                </label>
                <input
                  id="admin-logs-date-from"
                  type="date"
                  value={logsDateFrom}
                  onChange={(e) => {
                    setLogsDateFrom(e.target.value);
                    setLogsPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.55)",
                    color: "inherit",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="admin-logs-date-to"
                  style={{ display: "block", fontSize: "11px", marginBottom: "4px", opacity: 0.8 }}
                >
                  TO DATE
                </label>
                <input
                  id="admin-logs-date-to"
                  type="date"
                  value={logsDateTo}
                  onChange={(e) => {
                    setLogsDateTo(e.target.value);
                    setLogsPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(207, 169, 111, 0.35)",
                    background: "rgba(20, 18, 15, 0.55)",
                    color: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" className="primary-cta" style={{ padding: "8px 16px" }}>
                  Apply
                </button>
                <button
                  type="button"
                  className="stamp-button"
                  onClick={() => {
                    setLogsSearchInput("");
                    setLogsSearchQuery("");
                    setLogsEventType("all");
                    setLogsActionFilter("");
                    setLogsUserIdFilter("");
                    setLogsDateFrom("");
                    setLogsDateTo("");
                    setLogsPage(1);
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {logsError && (
            <div
              className="paper-panel"
              role="alert"
              style={{
                marginBottom: "20px",
                padding: "16px",
                border: "1px solid rgba(226, 132, 92, 0.65)",
                color: "#ffd2be",
              }}
            >
              {logsError}
            </div>
          )}

          <div className="paper-panel" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 className="section-title" style={{ fontSize: "20px", margin: 0 }}>
                  Application Audit & Activity Stream
                </h2>
                <p style={{ fontSize: "12px", opacity: 0.75, margin: "4px 0 0" }}>
                  Real-time events from Redis Streams (`log-service`) · Sensitive tokens and passwords automatically redacted · Matching events:{" "}
                  <strong>{logsData.pagination.total}</strong>
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="stamp-button compact"
                  disabled={logsPage <= 1 || loadingLogs}
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: "13px" }}>
                  Page <strong>{logsData.pagination.page}</strong> of{" "}
                  <strong>{logsData.pagination.totalPages}</strong>
                </span>
                <button
                  type="button"
                  className="stamp-button compact"
                  disabled={logsPage >= logsData.pagination.totalPages || loadingLogs}
                  onClick={() => setLogsPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <p style={{ padding: "24px 0", textAlign: "center" }}>Loading event logs...</p>
            ) : logsData.logs.length === 0 ? (
              <p style={{ padding: "24px 0", textAlign: "center", opacity: 0.75 }}>
                No log entries match the current filters.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(207, 169, 111, 0.3)",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "10px 8px" }}>Timestamp</th>
                      <th style={{ padding: "10px 8px" }}>Category</th>
                      <th style={{ padding: "10px 8px" }}>Action</th>
                      <th style={{ padding: "10px 8px" }}>User</th>
                      <th style={{ padding: "10px 8px" }}>IP Address</th>
                      <th style={{ padding: "10px 8px" }}>Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsData.logs.map((log: any) => (
                      <tr
                        key={log.id}
                        style={{ borderBottom: "1px solid rgba(207, 169, 111, 0.1)" }}
                      >
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <span className="stamp-mark" style={{ fontSize: "10px", padding: "1px 6px" }}>
                            {log.eventType}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", fontWeight: 600 }}>
                          {log.action}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {log.user ? (
                            <div>
                              <button
                                type="button"
                                className="stamp-button compact"
                                style={{ padding: "2px 6px", fontSize: "11px" }}
                                onClick={() => {
                                  setActiveTab("users");
                                  fetchUserDetail(Number(log.user.id));
                                }}
                              >
                                #{log.user.id} · {log.user.name}
                              </button>
                              <div style={{ fontSize: "11px", opacity: 0.75, marginTop: "2px" }}>
                                {log.user.email}
                              </div>
                            </div>
                          ) : log.userId ? (
                            <span>User #{log.userId}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>
                          {log.ip || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 8px",
                            fontFamily: "monospace",
                            fontSize: "11px",
                            maxWidth: "360px",
                            wordBreak: "break-word",
                          }}
                        >
                          {log.metadata && Object.keys(log.metadata).length > 0
                            ? JSON.stringify(log.metadata)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
