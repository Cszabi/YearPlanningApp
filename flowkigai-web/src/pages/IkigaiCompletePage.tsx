import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
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
  const [extractError, setExtractError] = useState(false);

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
    refetchOnMount: "always", // always get fresh data — cache may be stale after journey completion
  });

  async function handleBuildMindMap() {
    setExtracting(true);
    setExtractError(false);
    try {
      const result = await ikigaiApi.extractThemes(YEAR);
      setExtractedThemes(result);
      navigate("/ikigai/seed");
    } catch {
      setExtractError(true);
    } finally {
      setExtracting(false);
    }
  }

  if (isLoading) {
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

        {journey?.northStar ? (
          <p
            className="text-2xl md:text-3xl font-light max-w-lg leading-relaxed mb-4"
            style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
          >
            {journey.northStar.statement}
          </p>
        ) : (
          <p
            className="text-lg font-light max-w-lg leading-relaxed mb-4 italic"
            style={{ color: "var(--text-muted)" }}
          >
            Your Ikigai journey is complete.
          </p>
        )}

        <p className="text-sm max-w-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Click <strong>Build my Mind Map</strong> and AI will read your Ikigai answers,
          extract key themes, and place them on your Mind Map as a starting point.
          You can review and edit the themes before they are applied.
        </p>

        {extractError && (
          <Alert
            severity="error"
            sx={{ mb: 3, textAlign: "left", maxWidth: 400 }}
          >
            <strong>AI couldn't extract your themes.</strong>
            <br />
            This can happen if the AI service is temporarily unavailable. You
            can try again, or skip and build your Mind Map manually.
          </Alert>
        )}

        <button
          onClick={handleBuildMindMap}
          disabled={extracting}
          className="px-8 py-3 rounded-full text-white text-sm font-medium transition-opacity disabled:opacity-60 flex items-center gap-2 mb-4"
          style={{ backgroundColor: "#0D6E6E" }}
        >
          {extracting && <CircularProgress size={16} style={{ color: "white" }} />}
          {extracting ? "Extracting themes…" : extractError ? "Try again →" : "Build my Mind Map →"}
        </button>

        <button
          onClick={() => navigate("/map")}
          className="text-sm transition-colors"
          style={{ color: "var(--text-faint)" }}
        >
          Skip — go to Mind Map directly
        </button>
      </div>
    </div>
  );
}
