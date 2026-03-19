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

  if (categories.length === 0) {
    return null;
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
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Edit, add or remove themes before seeding your Mind Map.
        </p>

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
        className="fixed bottom-0 left-0 right-0 border-t px-6 py-4 flex flex-col gap-3"
        style={{
          backgroundColor: "var(--bg-app)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Mode toggle */}
        <div className="flex items-center gap-4 justify-center">
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>Mode:</span>
          {(["Merge", "Replace"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="text-xs px-3 py-1 rounded-full border transition-colors"
              style={{
                backgroundColor: mode === m ? "#0D6E6E" : "transparent",
                color: mode === m ? "white" : "var(--text-muted)",
                borderColor: mode === m ? "#0D6E6E" : "var(--border-subtle)",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "Replace" && (
          <p className="text-xs text-center" style={{ color: "#E8705A" }}>
            Replace mode will remove all existing mind map nodes before seeding.
          </p>
        )}

        <div className="flex justify-center">
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
