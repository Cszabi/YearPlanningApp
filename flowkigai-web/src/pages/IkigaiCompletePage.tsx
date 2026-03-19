import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import { ikigaiApi } from "@/api/ikigaiApi";
import { useIkigaiStore } from "@/stores/ikigaiStore";
import NorthStarIllustration from "@/components/ikigai/NorthStarIllustration";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

const YEAR = new Date().getFullYear();

export default function IkigaiCompletePage() {
  usePageAnalytics("/ikigai/complete");
  const navigate = useNavigate();
  const setExtractedThemes = useIkigaiStore((s) => s.setExtractedThemes);
  const [extracting, setExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: journey, isLoading } = useQuery({
    queryKey: ["ikigaiJourney", YEAR],
    queryFn: async () => {
      try {
        return await ikigaiApi.getJourney(YEAR);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return null;
        throw err;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!journey || !journey.northStar) {
      navigate("/ikigai", { replace: true });
    }
  }, [isLoading, journey, navigate]);

  async function handleBuildMindMap() {
    setExtracting(true);
    try {
      const result = await ikigaiApi.extractThemes(YEAR);
      setExtractedThemes(result);
      navigate("/ikigai/seed");
    } catch {
      setErrorMsg("Could not extract themes. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  if (isLoading || !journey) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <CircularProgress size={32} style={{ color: "#0D6E6E" }} />
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col md:flex-row items-center overflow-auto"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* Left column — illustration */}
      <div className="w-full md:w-1/2 flex-shrink-0 flex items-center justify-center py-12 px-8">
        <NorthStarIllustration className="w-48 h-48 md:w-64 md:h-64" />
      </div>

      {/* Right column — copy + CTAs */}
      <div className="flex flex-col items-center justify-center px-8 py-12 text-center md:w-1/2">
        <p
          className="text-xs tracking-widest uppercase mb-4"
          style={{ color: "var(--text-faint)" }}
        >
          Your North Star
        </p>

        {journey.northStar && (
          <p
            className="text-2xl md:text-3xl font-light max-w-lg leading-relaxed mb-10"
            style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
          >
            {journey.northStar.statement}
          </p>
        )}

        <button
          onClick={handleBuildMindMap}
          disabled={extracting}
          className="px-8 py-3 rounded-full text-white text-sm font-medium transition-opacity disabled:opacity-60 flex items-center gap-2 mb-4"
          style={{ backgroundColor: "#0D6E6E" }}
        >
          {extracting && <CircularProgress size={16} style={{ color: "white" }} />}
          {extracting ? "Extracting themes…" : "Build my mind map"}
        </button>

        <button
          onClick={() => navigate("/map")}
          className="text-sm transition-colors"
          style={{ color: "var(--text-faint)" }}
        >
          Start from scratch →
        </button>
      </div>

      <Snackbar
        open={errorMsg !== null}
        autoHideDuration={5000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </div>
  );
}
