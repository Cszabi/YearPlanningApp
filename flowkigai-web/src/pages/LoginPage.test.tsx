import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockAxiosPost = vi.hoisted(() => vi.fn());
const mockIsAxiosError = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  default: {
    post: mockAxiosPost,
    isAxiosError: mockIsAxiosError,
  },
}));

// Mock useAuthStore to avoid persist middleware issues in tests
const mockSetAuth = vi.hoisted(() => vi.fn());
vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

import LoginPage from "@/pages/LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    mockAxiosPost.mockReset();
    mockIsAxiosError.mockReset();
    mockSetAuth.mockReset();
  });

  it("renders email and password inputs", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows error message on failed login", async () => {
    const axiosError = {
      response: { data: { error: { message: "Invalid credentials" } } },
    };
    mockAxiosPost.mockRejectedValue(axiosError);
    mockIsAxiosError.mockReturnValue(true);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("you@example.com"), "bad@test.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("calls axios.post with email and password on submit", async () => {
    mockAxiosPost.mockResolvedValue({
      data: {
        data: {
          userId: "u1",
          email: "test@test.com",
          displayName: "Test User",
          role: "User",
          plan: "Free",
          accessToken: "access-token",
          refreshToken: "refresh-token",
        },
      },
    });
    mockIsAxiosError.mockReturnValue(false);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@test.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "mypassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@test.com",
        password: "mypassword",
      });
    });
  });
});
