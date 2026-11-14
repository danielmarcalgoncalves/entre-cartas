export const ADMIN_ROUTE_ID = "X2fQYLS5UbTYaIchwvwqLqzWqU32ZNoa";
export const ADMIN_ROUTE_PATH = `/${ADMIN_ROUTE_ID}`;
export const AUTHORIZED_ADMIN_EMAIL = "danielpgmarcal@gmail.com";

export function isAuthorizedAdminUser(
  user?: {
    email?: string | null;
    papel?: string | null;
    role?: string | null;
  } | null
): boolean {
  if (!user) return false;
  const email = String(user.email || "").trim().toLowerCase();
  const role = String(user.papel || user.role || "").trim().toLowerCase();
  return email === AUTHORIZED_ADMIN_EMAIL && role === "admin";
}
