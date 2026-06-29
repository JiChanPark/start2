import type { AuthSession, Role, User } from "../entities";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SESSION_KEY = "research-intern-mvp:supabase-session";

interface PasswordAuthResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email?: string;
  };
}

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const authClient = {
  enabled: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),

  getSession(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase Auth is not configured.");
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("이메일 또는 비밀번호를 확인해 주세요.");
    }

    const payload = (await response.json()) as PasswordAuthResponse;
    const session: AuthSession = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      userId: payload.user.id,
      email: payload.user.email ?? email,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async loadProfile(session: AuthSession): Promise<User | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(session.email)}&select=id,email,name,role`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (!response.ok) return null;

    const rows = (await response.json()) as ProfileRow[];
    const profile = rows[0];
    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    };
  },
};
