import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const CALENDAR_OPTIONS = [
  { value: "google",  label: "Google Calendar",  icon: "📅" },
  { value: "outlook", label: "Outlook Calendar",  icon: "📆" },
  { value: null,      label: "No thanks",         icon: "✕"  },
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<"account" | "calendar">("account");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [calendarProvider, setCalendarProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleAccountSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (displayName.trim().length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setStep("calendar");
  }

  async function handleCalendarSubmit(provider: string | null) {
    setCalendarProvider(provider);
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/auth/register", {
        email,
        displayName,
        password,
        calendarProvider: provider,
      });
      const auth = data.data;
      setAuth(
        {
          id: auth.userId,
          email: auth.email,
          displayName: auth.displayName,
          calendarProvider: auth.calendarProvider ?? undefined,
          role: auth.role ?? "User",
          plan: auth.plan ?? "Free",
        },
        auth.accessToken,
        auth.refreshToken
      );
      navigate("/ikigai");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const apiError = err.response?.data?.error;
        if (apiError?.errors) {
          const messages = (apiError.errors as { message: string }[])
            .map((e) => e.message)
            .join(" ");
          setError(messages);
        } else {
          setError(apiError?.message ?? "Registration failed.");
        }
      } else {
        setError("An unexpected error occurred.");
      }
      setStep("account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white px-4">
      <div className="w-full max-w-sm">
        {step === "account" && (
          <Link to="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6">
            ← Back to home
          </Link>
        )}
        <h1
          className="text-3xl font-semibold text-center mb-2"
          style={{ color: "#0D6E6E" }}
        >
          Flowkigai
        </h1>

        {step === "account" ? (
          <>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Create your account
            </p>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

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
                className="w-full py-2 px-4 rounded-md text-white text-sm font-medium"
                style={{ backgroundColor: "#0D6E6E" }}
              >
                Continue
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-[#0D6E6E] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-center text-gray-500 mb-2 text-sm">
              Sync your goals &amp; milestones with your calendar?
            </p>
            <p className="text-center text-gray-400 mb-8 text-xs">
              You can always export an .ics file from the Calendar page later.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {CALENDAR_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  disabled={loading}
                  onClick={() => handleCalendarSubmit(opt.value)}
                  className="w-full flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-[#0D6E6E] hover:bg-[#0D6E6E0d] transition-colors disabled:opacity-50"
                >
                  <span className="text-lg">{opt.icon}</span>
                  {loading && calendarProvider === opt.value
                    ? "Creating account…"
                    : opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("account")}
              className="mt-6 w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
