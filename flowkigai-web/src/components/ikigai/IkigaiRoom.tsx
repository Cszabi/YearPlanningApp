import { useState } from "react";
import type { RoomDefinition } from "./roomData";

interface Props {
  room: RoomDefinition;
  roomIndex: number;
  initialPromptIndex: number;
  initialAnswers: string[];
  saving: boolean;
  onAnswer: (promptIndex: number, answers: string[], isRoomComplete: boolean) => void;
}

export default function IkigaiRoom({
  room,
  roomIndex,
  initialAnswers,
  saving,
  onAnswer,
}: Props) {
  const [answers, setAnswers] = useState<string[]>(() =>
    room.prompts.map((_, i) => initialAnswers[i] ?? "")
  );

  const allFilled = answers.every((a) => a.trim().length >= 3);
  const canComplete = allFilled && !saving;

  function handleChange(i: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  function handleComplete() {
    if (!canComplete) return;
    onAnswer(room.prompts.length - 1, answers.map((a) => a.trim()), true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleComplete();
    }
  }

  return (
    <div
      className="h-full flex flex-col items-center px-6 pt-8 pb-4 overflow-hidden"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* Top bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-5 shrink-0" style={{ opacity: 0.5 }}>
        <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          {room.emoji} {room.name}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Room {roomIndex + 1} of 4</span>
      </div>

      {/* Tagline */}
      <p
        className="text-center text-sm mb-6 tracking-wide max-w-md shrink-0"
        style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--text-muted)" }}
      >
        "{room.tagline}"
      </p>

      {/* Questions — scrollable, no visible scrollbar */}
      <div className="w-full max-w-2xl flex-1 overflow-y-auto no-scrollbar space-y-7">
        {room.prompts.map((prompt, i) => (
          <div key={i}>
            <div className="flex gap-3 mb-3">
              <span
                className="text-xs font-medium mt-1 shrink-0"
                style={{ width: 20, textAlign: "right", color: "var(--text-faint)" }}
              >
                {i + 1}.
              </span>
              <p
                className="text-lg leading-relaxed"
                style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
              >
                {prompt}
              </p>
            </div>

            <div className="pl-8">
              <textarea
                value={answers[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Take your time…"
                rows={2}
                className="w-full border-0 border-b focus:outline-none resize-none text-base leading-relaxed pb-2 transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  borderColor: "var(--border)",
                  caretColor: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Complete button */}
      <div className="w-full max-w-2xl flex justify-end mt-4 shrink-0">
        <div style={{ transition: "opacity 0.3s", opacity: allFilled ? 1 : 0.3 }}>
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="px-7 py-2.5 rounded-full text-white text-sm font-medium disabled:cursor-not-allowed"
            style={{ backgroundColor: "#0D6E6E" }}
          >
            {saving ? "Saving…" : "Complete room →"}
          </button>
        </div>
      </div>

      <p className="text-center text-xs mt-2 shrink-0" style={{ color: "var(--text-faint)" }}>⌘ ↵ to complete</p>
    </div>
  );
}
