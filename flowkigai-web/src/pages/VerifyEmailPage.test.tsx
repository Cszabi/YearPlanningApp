import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockVerifyEmail = vi.hoisted(() => vi.fn());
vi.mock("@/api/authApi", () => ({
  authApi: { verifyEmail: mockVerifyEmail },
}));

const mockSetEmailVerified = vi.hoisted(() => vi.fn());
vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: { setEmailVerified: typeof mockSetEmailVerified }) => unknown) =>
    selector({ setEmailVerified: mockSetEmailVerified }),
}));

vi.mock("@/components/layout/FlowkigaiLogo", () => ({
  default: () => <span>Logo</span>,
}));

import VerifyEmailPage from "./VerifyEmailPage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWithToken(token?: string) {
  const path = token ? `/verify-email?token=${token}` : "/verify-email";
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/ikigai" element={<div>Ikigai</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    mockVerifyEmail.mockReset();
    mockSetEmailVerified.mockReset();
  });

  it("shows loading state while API call is in flight", () => {
    mockVerifyEmail.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithToken("sometoken");
    expect(screen.getByText(/verifying/i)).toBeInTheDocument();
  });

  it("shows success state after successful verification", async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    renderWithToken("validtoken");

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("calls setEmailVerified(true) on successful verification", async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    renderWithToken("validtoken");

    await waitFor(() => {
      expect(mockSetEmailVerified).toHaveBeenCalledWith(true);
    });
  });

  it("shows error state when API call fails", async () => {
    mockVerifyEmail.mockRejectedValue(new Error("bad token"));
    renderWithToken("badtoken");

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
  });

  it("does not call setEmailVerified when API call fails", async () => {
    mockVerifyEmail.mockRejectedValue(new Error("bad token"));
    renderWithToken("badtoken");

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
    expect(mockSetEmailVerified).not.toHaveBeenCalled();
  });

  it("shows error state immediately when no token in URL", async () => {
    renderWithToken(); // no ?token param

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("calls verifyEmail with the token from URL", async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    renderWithToken("my-special-token");

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith("my-special-token");
    });
  });
});
