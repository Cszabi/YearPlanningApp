import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/auth/login", {
        email,
        password,
      });
      const auth = data.data;
      setAuth(
        {
          id: auth.userId,
          email: auth.email,
          displayName: auth.displayName,
          role: auth.role ?? "User",
          plan: auth.plan ?? "Free",
        },
        auth.accessToken,
        auth.refreshToken
      );
      navigate("/ikigai");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error?.message ?? "Login failed.");
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
        <Link to="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
          ← Back to home
        </Link>
        <h1
          className="text-3xl font-semibold text-center mb-2"
          style={{ color: "#0D6E6E" }}
        >
          Flowkigai
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md text-white text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#0D6E6E" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#0D6E6E] hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
