const KEY = "adminSession";
const EXPIRY = "adminSessionExpiry";
const USER_KEY = "adminUser";
const SESSION_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface AdminSessionUser {
  id?: string;
  username: string;
  full_name?: string | null;
  role?: string | null;
}

export function saveSession(user: AdminSessionUser) {
  const session = { username: user.username, loginTime: Date.now(), role: user.role ?? "admin" };
  localStorage.setItem(KEY, JSON.stringify(session));
  localStorage.setItem(EXPIRY, String(Date.now() + SESSION_MS));
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSessionUser(): AdminSessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const expiry = localStorage.getItem(EXPIRY);
    if (!raw || !expiry) return null;
    if (Date.now() > parseInt(expiry, 10)) {
      clearSession();
      return null;
    }
    return JSON.parse(raw) as AdminSessionUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(EXPIRY);
  localStorage.removeItem(USER_KEY);
}
