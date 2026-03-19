import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/authStore";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  role: "User" as const,
  plan: "Free" as const,
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it("initial state is null for all fields", () => {
    const { user, accessToken, refreshToken } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  it("setAuth stores user and tokens", () => {
    useAuthStore.getState().setAuth(mockUser, "access-token-123", "refresh-token-456");
    const { user, accessToken, refreshToken } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(accessToken).toBe("access-token-123");
    expect(refreshToken).toBe("refresh-token-456");
  });

  it("setTokens updates tokens without changing user", () => {
    useAuthStore.setState({ user: mockUser, accessToken: "old-access", refreshToken: "old-refresh" });
    useAuthStore.getState().setTokens("new-access", "new-refresh");
    const { user, accessToken, refreshToken } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(accessToken).toBe("new-access");
    expect(refreshToken).toBe("new-refresh");
  });

  it("logout clears all fields", () => {
    useAuthStore.setState({ user: mockUser, accessToken: "access-token", refreshToken: "refresh-token" });
    useAuthStore.getState().logout();
    const { user, accessToken, refreshToken } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });
});
