import api from "./client";

export const authApi = {
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/reset-password", { token, newPassword }),
  verifyEmail: (token: string) =>
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: () =>
    api.post("/auth/resend-verification"),
};
