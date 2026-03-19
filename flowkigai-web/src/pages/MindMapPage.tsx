import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import MindMapCanvas from "@/components/mindmap/MindMapCanvas";
import { ikigaiApi } from "@/api/ikigaiApi";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

const YEAR = new Date().getFullYear();

export default function MindMapPage() {
  usePageAnalytics("/map");
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data: journey } = useQuery({
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

  const showBanner =
    !bannerDismissed &&
    journey?.northStar !== null &&
    journey?.northStar !== undefined &&
    !journey?.hasSeededMindMap;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {showBanner && (
        <div
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-sm"
          style={{ backgroundColor: "#0D6E6E", color: "white" }}
        >
          <button
            className="flex-1 text-left hover:underline"
            onClick={() => navigate("/ikigai/complete")}
          >
            You have completed your Ikigai journey. Seed your Mind Map from your Ikigai →
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            className="ml-4 opacity-70 hover:opacity-100 text-lg leading-none"
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      )}
      <MindMapCanvas />
    </div>
  );
}
