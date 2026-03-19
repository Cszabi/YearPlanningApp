import MindMapCanvas from "@/components/mindmap/MindMapCanvas";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

export default function MindMapPage() {
  usePageAnalytics("/map");
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <MindMapCanvas />
    </div>
  );
}
