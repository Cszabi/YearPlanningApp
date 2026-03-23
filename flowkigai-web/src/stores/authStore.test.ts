import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/authStore";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  role: "User" as const,
  plan: "Free" as const,
  isEmailVerified: true,
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

  it("setEmailVerified updates isEmailVerified without changing other user fields", () => {
    useAuthStore.setState({ user: { ...mockUser, isEmailVerified: false }, accessToken: "tok", refreshToken: "ref" });
    useAuthStore.getState().setEmailVerified(true);
    const { user } = useAuthStore.getState();
    expect(user?.isEmailVerified).toBe(true);
    expect(user?.email).toBe(mockUser.email);
    expect(user?.displayName).toBe(mockUser.displayName);
  });

  it("setEmailVerified does nothing when user is null", () => {
    useAuthStore.setState({ user: null });
    useAuthStore.getState().setEmailVerified(true);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
