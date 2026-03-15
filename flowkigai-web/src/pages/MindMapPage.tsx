import MindMapCanvas from "@/components/mindmap/MindMapCanvas";

export default function MindMapPage() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <MindMapCanvas />
    </div>
  );
}
