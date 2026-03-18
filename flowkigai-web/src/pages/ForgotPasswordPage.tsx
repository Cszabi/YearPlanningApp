import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import FlowkigaiLogo from "@/components/layout/FlowkigaiLogo";
import { authApi } from "@/api/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error?.message ?? "Something went wrong. Please try again.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
          ← Back to login
        </Link>
        <div className="flex justify-center mb-2" style={{ color: "#0D6E6E" }}>
          <FlowkigaiLogo size="md" />
        </div>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Reset your password
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-4 text-sm text-center">
            Check your email for a reset link. If the address is registered, you'll receive instructions within a few minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-md text-white text-sm font-medium transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#0D6E6E" }}
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
