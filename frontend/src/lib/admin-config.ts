export const ADMIN_ROUTE_ID = "X2fQYLS5UbTYaIchwvwqLqzWqU32ZNoa";
export const ADMIN_ROUTE_PATH = `/${ADMIN_ROUTE_ID}`;

/**
 * UI-only visibility helper derived solely from server-verified role (SEC-14).
 * Never hardcodes administrator emails in the public client bundle.
 * Authoritative access control is enforced server-side by `requireAdmin`.
 */
export function isAuthorizedAdminUser(
  user?: {
    email?: string | null;
    papel?: string | null;
    role?: string | null;
  } | null
): boolean {
  if (!user) return false;
  const role = String(user.papel || user.role || "").trim().toLowerCase();
  return role === "admin";
}
