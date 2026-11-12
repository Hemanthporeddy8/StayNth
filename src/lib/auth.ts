export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const TOKEN_KEY = "staynth.auth.token.v1";
const USER_KEY = "staynth.auth.user.v1";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string | null, user: User | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  try {
    const res = await fetch("/api/auth/me", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.authenticated && data.user) {
      setStoredAuth(token, data.user);
      return data.user;
    }
    setStoredAuth(null, null);
    return null;
  } catch {
    return getStoredUser();
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Registration failed" };
    }
    setStoredAuth(data.token, data.user);
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Login failed" };
    }
    setStoredAuth(data.token, data.user);
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
  } catch {
    // ignore
  } finally {
    setStoredAuth(null, null);
  }
}
