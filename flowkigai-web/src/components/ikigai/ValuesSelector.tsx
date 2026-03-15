import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ALL_VALUES = [
  "Authenticity", "Adventure", "Balance", "Belonging", "Compassion",
  "Courage", "Creativity", "Curiosity", "Discipline", "Empathy",
  "Excellence", "Fairness", "Faith", "Family", "Freedom",
  "Friendship", "Generosity", "Growth", "Harmony", "Health",
  "Honesty", "Humility", "Impact", "Independence", "Integrity",
  "Justice", "Kindness", "Leadership", "Learning", "Love",
  "Loyalty", "Meaning", "Mindfulness", "Openness", "Purpose",
  "Resilience", "Responsibility", "Security", "Service", "Simplicity",
  "Spirituality", "Stewardship", "Trust", "Wisdom",
];

type ValuesPhase = "select-10" | "narrow-5" | "rank";

interface Props {
  saving: boolean;
  onSave: (rankedValues: { valueName: string; rank: number }[]) => void;
}

function SortableValue({ value, rank }: { value: string; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: value });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4"
    >
      <span className="text-lg font-light text-gray-300 w-6 text-center select-none">
        {rank}
      </span>
      <span className="flex-1 text-gray-700" style={{ fontFamily: "Georgia, serif" }}>
        {value}
      </span>
      <div
        {...attributes}
        {...listeners}
        className="text-gray-300 cursor-grab active:cursor-grabbing select-none px-1"
        title="Drag to reorder"
      >
        ⠿
      </div>
    </div>
  );
}

export default function ValuesSelector({ saving, onSave }: Props) {
  const [phase, setPhase] = useState<ValuesPhase>("select-10");
  const [broadSelected, setBroadSelected] = useState<string[]>([]);
  const [narrowSelected, setNarrowSelected] = useState<string[]>([]);
  const [ranked, setRanked] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function toggleBroad(value: string) {
    setBroadSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= 10) return prev;
      return [...prev, value];
    });
  }

  function toggleNarrow(value: string) {
    setNarrowSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function goToNarrow() {
    setNarrowSelected([...broadSelected]);
    setPhase("narrow-5");
  }

  function goToRank() {
    setRanked([...narrowSelected]);
    setPhase("rank");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRanked((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // ── Phase 1: Select up to 10 ───────────────────────────────────────────────
  if (phase === "select-10") {
    return (
      <div className="h-full flex flex-col overflow-hidden px-6 pt-10 pb-5" style={{ backgroundColor: "#FAFAF8" }}>
        <p className="text-xs tracking-widest uppercase text-gray-400 mb-5 text-center shrink-0">
          Values · Step 1 of 3
        </p>
        <h2
          className="text-2xl font-light text-gray-700 mb-2 text-center leading-relaxed shrink-0"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Which of these resonate with you?
        </h2>
        <p className="text-center text-gray-400 text-sm mb-5 shrink-0">
          Select up to 10 — {broadSelected.length} of 10 selected
        </p>

        {/* Scrollable values grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar max-w-2xl w-full mx-auto">
          <div className="flex flex-wrap gap-3 justify-center pb-4">
            {ALL_VALUES.map((value) => {
              const isSelected = broadSelected.includes(value);
              const isDisabled = !isSelected && broadSelected.length >= 10;
              return (
                <button
                  key={value}
                  onClick={() => toggleBroad(value)}
                  disabled={isDisabled}
                  className="px-4 py-2 rounded-full text-sm border transition-all"
                  style={{
                    backgroundColor: isSelected ? "#0D6E6E" : "white",
                    color: isSelected ? "white" : "#4B5563",
                    borderColor: isSelected ? "#0D6E6E" : "#D1D5DB",
                    opacity: isDisabled ? 0.35 : 1,
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-4 shrink-0">
          <button
            onClick={goToNarrow}
            disabled={broadSelected.length === 0}
            className="px-8 py-3 rounded-full text-white text-sm font-medium disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "#0D6E6E" }}
          >
            These feel right →
          </button>
        </div>
      </div>
    );
  }

  // ── Phase 2: Narrow to exactly 5 ──────────────────────────────────────────
  if (phase === "narrow-5") {
    const canProceed = narrowSelected.length === 5;
    const statusText =
      narrowSelected.length === 5
        ? "Perfect — 5 selected"
        : narrowSelected.length < 5
        ? `Select ${5 - narrowSelected.length} more`
        : `Deselect ${narrowSelected.length - 5} more`;

    return (
      <div className="h-full flex flex-col overflow-hidden px-6 pt-10 pb-5" style={{ backgroundColor: "#FAFAF8" }}>
        <p className="text-xs tracking-widest uppercase text-gray-400 mb-5 text-center shrink-0">
          Values · Step 2 of 3
        </p>
        <h2
          className="text-2xl font-light text-gray-700 mb-2 text-center leading-relaxed shrink-0"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Now, which five matter most?
        </h2>
        <p className="text-center text-gray-400 text-sm mb-5 shrink-0">{statusText}</p>

        <div className="flex-1 overflow-y-auto no-scrollbar max-w-2xl w-full mx-auto">
          <div className="flex flex-wrap gap-3 justify-center pb-4">
            {broadSelected.map((value) => {
              const isKept = narrowSelected.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleNarrow(value)}
                  className="px-4 py-2 rounded-full text-sm border"
                  style={{
                    backgroundColor: isKept ? "#0D6E6E" : "white",
                    color: isKept ? "white" : "#9CA3AF",
                    borderColor: isKept ? "#0D6E6E" : "#E5E7EB",
                    opacity: isKept ? 1 : 0.4,
                    transition: "opacity 0.3s ease-in-out",
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between max-w-sm mx-auto mt-4 w-full shrink-0">
          <button
            onClick={() => setPhase("select-10")}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back
          </button>
          <div
            style={{
              transition: "opacity 0.4s ease-in-out",
              opacity: canProceed ? 1 : 0,
              pointerEvents: canProceed ? "auto" : "none",
            }}
          >
            <button
              onClick={goToRank}
              className="px-7 py-2.5 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "#0D6E6E" }}
            >
              Rank these →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase 3: Drag to rank ──────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden px-6 pt-10 pb-5" style={{ backgroundColor: "#FAFAF8" }}>
      <p className="text-xs tracking-widest uppercase text-gray-400 mb-5 text-center shrink-0">
        Values · Step 3 of 3
      </p>
      <h2
        className="text-2xl font-light text-gray-700 mb-2 text-center leading-relaxed shrink-0"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Place them in order.
      </h2>
      <p className="text-center text-gray-400 text-sm mb-6 shrink-0">
        Drag to rank — 1 is what matters most
      </p>

      <div className="flex-1 overflow-y-auto no-scrollbar max-w-2xl w-full mx-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ranked} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3 pb-4">
              {ranked.map((value, index) => (
                <SortableValue key={value} value={value} rank={index + 1} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex items-center justify-between max-w-2xl w-full mx-auto mt-4 shrink-0">
        <button
          onClick={() => setPhase("narrow-5")}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onSave(ranked.map((v, i) => ({ valueName: v, rank: i + 1 })))}
          disabled={saving}
          className="px-8 py-3 rounded-full text-white text-sm font-medium disabled:opacity-60"
          style={{ backgroundColor: "#0D6E6E" }}
        >
          {saving ? "Saving…" : "These are my values →"}
        </button>
      </div>
    </div>
  );
}
