import { useState, useEffect, useRef } from "react";
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
  initialPromptIndex,
  initialAnswers,
  saving,
  onAnswer,
}: Props) {
  const [promptIndex, setPromptIndex] = useState(initialPromptIndex);
  const [answers, setAnswers] = useState<string[]>(() =>
    room.prompts.map((_, i) => initialAnswers[i] ?? "")
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isFirst = promptIndex === 0;
  const isLast  = promptIndex === room.prompts.length - 1;
  const current  = answers[promptIndex] ?? "";
  const canProceed = current.trim().length >= 3 && !saving;

  // Focus textarea whenever question changes
  useEffect(() => {
    textareaRef.current?.focus();
  }, [promptIndex]);

  function handleChange(value: string) {
    setAnswers(prev => {
      const next = [...prev];
      next[promptIndex] = value;
      return next;
    });
  }

  function handleNext() {
    if (!canProceed) return;
    const trimmed = answers.map(a => a.trim());
    if (isLast) {
      onAnswer(promptIndex, trimmed, true);
    } else {
      onAnswer(promptIndex, trimmed, false); // auto-save progress
      setPromptIndex(p => p + 1);
    }
  }

  function handleBack() {
    if (!isFirst) setPromptIndex(p => p - 1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  }

  const image = room.promptImages[promptIndex];

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* ── Image (top ~45% of height) ─────────────────────────────────────── */}
      <div className="relative w-full shrink-0" style={{ height: "42%" }}>
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.85 }}
        />
        {/* Gradient: room header fades in from top */}
        <div
          className="absolute inset-x-0 top-0 h-20 flex items-start justify-between px-6 pt-5"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)" }}
        >
          <span className="text-xs tracking-widest uppercase text-white/70">
            {room.emoji} {room.name} · Room {roomIndex + 1} of 4
          </span>
          <span className="text-xs text-white/60">
            {promptIndex + 1} / {room.prompts.length}
          </span>
        </div>
        {/* Fade bottom into background */}
        <div
          className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bg-app))" }}
        />
      </div>

      {/* ── Question + answer (bottom ~58%) ────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-6 pb-4 min-h-0">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-5 shrink-0">
          {room.prompts.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i === promptIndex ? "#0D6E6E"
                  : i < promptIndex  ? "#0D6E6E"
                  : "var(--border)",
                opacity: i === promptIndex ? 1 : i < promptIndex ? 0.5 : 0.3,
                transform: i === promptIndex ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Question text */}
        <p
          className="text-xl leading-relaxed mb-5 shrink-0"
          style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
        >
          {room.prompts[promptIndex]}
        </p>

        {/* Answer textarea */}
        <textarea
          ref={textareaRef}
          value={current}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Take your time…"
          rows={3}
          className="w-full flex-1 border-0 border-b focus:outline-none resize-none text-base leading-relaxed pb-2 transition-colors"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            borderColor: "var(--border)",
            caretColor: "var(--text-primary)",
          }}
        />

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4 shrink-0">
          <button
            onClick={handleBack}
            disabled={isFirst}
            className="text-sm px-4 py-2 transition-opacity"
            style={{ color: "var(--text-faint)", opacity: isFirst ? 0.25 : 1 }}
          >
            ← Back
          </button>

          <p className="text-xs" style={{ color: "var(--text-faint)" }}>⌘ ↵</p>

          <div style={{ transition: "opacity 0.3s", opacity: canProceed ? 1 : 0.35 }}>
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="px-7 py-2.5 rounded-full text-white text-sm font-medium disabled:cursor-not-allowed"
              style={{ backgroundColor: "#0D6E6E" }}
            >
              {saving ? "Saving…" : isLast ? "Complete room →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
