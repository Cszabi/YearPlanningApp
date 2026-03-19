import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { useAuthStore } from "@/stores/authStore";
import TabNav from "@/components/layout/TabNav";

const muiTheme = createTheme();

function mockUser(role: "User" | "Admin") {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: { user: unknown; logout: ReturnType<typeof vi.fn> }) => unknown) =>
      selector({
        user: {
          id: "1",
          email: "a@a.com",
          displayName: "Alice",
          role,
          plan: "Free",
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

describe("TabNav", () => {
  it("shows Admin nav item for admin user", () => {
    mockUser("Admin");
    renderTabNav();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("does not show Admin nav item for regular user", () => {
    mockUser("User");
    renderTabNav();
    expect(screen.queryByText("Admin")).toBeNull();
  });
});
