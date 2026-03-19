import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from "@/stores/authStore";
import AdminGuard from "@/components/layout/AdminGuard";

type MockUser = { id: string; email: string; displayName: string; role: string; plan: string } | null;

function mockStoreUser(user: MockUser) {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: { user: MockUser }) => unknown) => selector({ user })
  );
}

function renderWithRouter(user: MockUser) {
  mockStoreUser(user);
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <div>admin content</div>
            </AdminGuard>
          }
        />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminGuard", () => {
  it("renders children when user is Admin", () => {
    renderWithRouter({
      id: "1",
      email: "admin@test.com",
      displayName: "Admin",
      role: "Admin",
      plan: "Free",
    });
    expect(screen.getByText("admin content")).toBeInTheDocument();
  });

  it("redirects to / when user is null", () => {
    renderWithRouter(null);
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it("redirects to / when user role is User", () => {
    renderWithRouter({
      id: "2",
      email: "user@test.com",
      displayName: "Regular User",
      role: "User",
      plan: "Free",
    });
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });
});
