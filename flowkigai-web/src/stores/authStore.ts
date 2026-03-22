import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  displayName: string;
  calendarProvider?: string;
  role: "User" | "Admin";
  plan: "Free" | "Pro";
  isEmailVerified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setEmailVerified: (verified: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setEmailVerified: (verified) =>
        set((s) => ({ user: s.user ? { ...s.user, isEmailVerified: verified } : null })),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "flowkigai-auth" }
  )
);
