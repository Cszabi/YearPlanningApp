import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import { ikigaiApi } from "@/api/ikigaiApi";
import { useIkigaiStore, type IkigaiThemeCategory } from "@/stores/ikigaiStore";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

const YEAR = new Date().getFullYear();
const MAX_THEMES = 6;
const MAX_THEME_LENGTH = 40;

export default function IkigaiSeedPage() {
  usePageAnalytics("/ikigai/seed");
  const navigate = useNavigate();
  const extractedThemes = useIkigaiStore((s) => s.extractedThemes);
  const setHasSeededMindMap = useIkigaiStore((s) => s.setHasSeededMindMap);
  const [categories, setCategories] = useState<IkigaiThemeCategory[]>([]);
  const [mode, setMode] = useState<"Merge" | "Replace">("Merge");
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!extractedThemes) {
      navigate("/ikigai/complete", { replace: true });
      return;
    }
    setCategories(extractedThemes.categories.map((c) => ({ ...c, themes: [...c.themes] })));
  }, [extractedThemes, navigate]);

  function updateTheme(catIdx: number, themeIdx: number, value: string) {
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci !== catIdx
          ? cat
          : {
              ...cat,
              themes: cat.themes.map((t, ti) =>
                ti !== themeIdx ? t : value.slice(0, MAX_THEME_LENGTH)
              ),
            }
      )
    );
  }

  function deleteTheme(catIdx: number, themeIdx: number) {
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci !== catIdx
          ? cat
          : { ...cat, themes: cat.themes.filter((_, ti) => ti !== themeIdx) }
      )
    );
  }

  function addTheme(catIdx: number) {
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci !== catIdx || cat.themes.length >= MAX_THEMES
          ? cat
          : { ...cat, themes: [...cat.themes, ""] }
      )
    );
  }

  async function handleSeed() {
    // Filter empty themes
    const cleanedCategories = categories.map((cat) => ({
      ...cat,
      themes: cat.themes.filter((t) => t.trim().length > 0),
    }));
    setSeeding(true);
    try {
      await ikigaiApi.seedMindMap(YEAR, { categories: cleanedCategories }, mode);
      setHasSeededMindMap(true);
      navigate("/map");
    } catch {
      setErrorMsg("Could not seed mind map. Please try again.");
    } finally {
      setSeeding(false);
    }
  }

  // extractedThemes exists but AI returned no categories — show error instead of blank screen
  if (extractedThemes && categories.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-8 text-center gap-6"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <p className="text-4xl">⚠️</p>
        <p className="text-lg font-light" style={{ color: "var(--text-primary)" }}>
          The AI couldn't generate any themes from your answers.
        </p>
        <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
          This is usually a temporary issue. You can go back and try again, or
          head to the Mind Map and add themes manually.
        </p>
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => navigate("/ikigai/complete", { replace: true })}
            className="px-8 py-3 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: "#0D6E6E" }}
          >
            ← Try again
          </button>
          <button
            onClick={() => navigate("/map")}
            className="text-sm"
            style={{ color: "var(--text-faint)" }}
          >
            Go to Mind Map directly
          </button>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null; // still loading (extractedThemes not yet in store)
  }

  return (
    <div
      className="min-h-full overflow-auto"
      style={{ backgroundColor: "var(--bg-app)", paddingBottom: "120px" }}
    >
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p
          className="text-xs tracking-widest uppercase mb-2"
          style={{ color: "var(--text-faint)" }}
        >
          Ikigai · {YEAR}
        </p>
        <h1
          className="text-2xl font-light mb-2"
          style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
        >
          Review your themes
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Edit, add or remove themes before seeding your Mind Map.
        </p>

        {/* Mode choice */}
        <div
          className="rounded-xl p-4 mb-8 border"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            How should we update your Mind Map?
          </p>
          <div className="flex flex-col gap-2">
            {(["Merge", "Replace"] as const).map((m) => {
              const isSelected = mode === m;
              return (
                <label
                  key={m}
                  className="flex items-start gap-3 cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                >
                  <input
                    type="radio"
                    name="seedMode"
                    value={m}
                    checked={isSelected}
                    onChange={() => setMode(m)}
                    className="mt-0.5 accent-teal-700"
                  />
                  <span>
                    <span className="text-sm font-medium">
                      {m === "Merge" ? "Extend existing map" : "Override (start fresh)"}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {m === "Merge"
                        ? "Add the new themes alongside any nodes already on your Mind Map."
                        : "Remove all existing nodes and replace them with the themes below."}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {mode === "Replace" && (
            <p className="text-xs mt-3 pl-6" style={{ color: "#E8705A" }}>
              ⚠ All existing Mind Map nodes will be deleted before seeding.
            </p>
          )}
        </div>

        {categories.map((cat, catIdx) => (
          <div key={catIdx} className="mb-8">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {cat.label}
            </h2>

            <div className="flex flex-col gap-2">
              {cat.themes.map((theme, themeIdx) => (
                <div key={themeIdx} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={theme}
                      maxLength={MAX_THEME_LENGTH}
                      onChange={(e) => updateTheme(catIdx, themeIdx, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded border"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-subtle)",
                      }}
                    />
                    <span
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {theme.length}/{MAX_THEME_LENGTH}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTheme(catIdx, themeIdx)}
                    className="text-lg leading-none px-2 py-1 rounded transition-opacity hover:opacity-70"
                    style={{ color: "var(--text-faint)" }}
                    aria-label="Delete theme"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addTheme(catIdx)}
              disabled={cat.themes.length >= MAX_THEMES}
              className="mt-2 text-xs px-3 py-1 rounded border transition-opacity disabled:opacity-40"
              style={{
                color: "#0D6E6E",
                borderColor: "#0D6E6E",
              }}
            >
              + Add theme
            </button>
          </div>
        ))}
      </div>

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t px-6 py-4 flex justify-center"
        style={{
          backgroundColor: "var(--bg-app)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-8 py-3 rounded-full text-white text-sm font-medium transition-opacity disabled:opacity-60 flex items-center gap-2"
          style={{ backgroundColor: "#0D6E6E" }}
        >
          {seeding && <CircularProgress size={16} style={{ color: "white" }} />}
          {seeding ? "Seeding…" : "Seed my Mind Map"}
        </button>
      </div>

      <Snackbar
        open={errorMsg !== null}
        autoHideDuration={5000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </div>
  );
}
