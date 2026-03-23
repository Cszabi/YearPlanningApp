import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/components/layout/DeleteAccountDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/layout/FlowkigaiLogo", () => ({
  default: () => <span>FlowkigaiLogo</span>,
}));

const mockResendVerification = vi.hoisted(() => vi.fn());
vi.mock("@/api/authApi", () => ({
  authApi: { resendVerification: mockResendVerification },
}));

import { useAuthStore } from "@/stores/authStore";
import TabNav from "@/components/layout/TabNav";

const muiTheme = createTheme();

function mockUser(overrides: { role?: "User" | "Admin"; isEmailVerified?: boolean } = {}) {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: { user: unknown; logout: ReturnType<typeof vi.fn> }) => unknown) =>
      selector({
        user: {
          id: "1",
          email: "a@a.com",
          displayName: "Alice",
          role: overrides.role ?? "User",
          plan: "Free",
          isEmailVerified: overrides.isEmailVerified ?? true,
        },
        logout: vi.fn(),
      })
  );
}

function renderTabNav() {
  return render(
    <ThemeProvider theme={muiTheme}>
      <MemoryRouter initialEntries={["/goals"]}>
        <TabNav />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("TabNav — navigation", () => {
  it("shows Admin nav item for admin user", () => {
    mockUser({ role: "Admin" });
    renderTabNav();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("does not show Admin nav item for regular user", () => {
    mockUser({ role: "User" });
    renderTabNav();
    expect(screen.queryByText("Admin")).toBeNull();
  });
});

describe("TabNav — unverified email banner", () => {
  beforeEach(() => {
    mockResendVerification.mockReset();
  });

  it("does not show banner for verified user", () => {
    mockUser({ isEmailVerified: true });
    renderTabNav();
    expect(screen.queryByText(/verify your email/i)).toBeNull();
  });

  it("shows banner for unverified user", () => {
    mockUser({ isEmailVerified: false });
    renderTabNav();
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
  });

  it("shows Resend button when banner is visible", () => {
    mockUser({ isEmailVerified: false });
    renderTabNav();
    expect(screen.getByRole("button", { name: /resend/i })).toBeInTheDocument();
  });

  it("hides banner after clicking dismiss", async () => {
    mockUser({ isEmailVerified: false });
    renderTabNav();

    const user = userEvent.setup();
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    await user.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/verify your email/i)).toBeNull();
    });
  });

  it("calls resendVerification when Resend is clicked", async () => {
    mockUser({ isEmailVerified: false });
    mockResendVerification.mockResolvedValue(undefined);
    renderTabNav();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledOnce();
    });
  });
});
