import { useState, useEffect, useRef } from "react";
import { ROOMS, ROOM_TYPE_TO_INDEX } from "./roomData";
import type { IkigaiJourneyDto } from "@/api/ikigaiApi";

const SYNTHESIS_QUESTIONS = [
  "Looking at what you love and what you're good at — where is the clearest overlap?",
  "Where does what the world needs touch something personal for you?",
  "Is there a thread running through all four areas that surprises you?",
];

type SynthesisPhase = "reflection" | "questions" | "north-star";

interface Props {
  journey: IkigaiJourneyDto;
  saving: boolean;
  onNorthStarSave: (statement: string, synthesisAnswers: string[]) => void;
}

export default function IkigaiSynthesis({ journey, saving, onNorthStarSave }: Props) {
  const [phase, setPhase] = useState<SynthesisPhase>("reflection");
  const [visible, setVisible] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [synthAnswers, setSynthAnswers] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [northStar, setNorthStar] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase === "reflection" || !visible) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, [visible, phase, questionIndex]);

  function fade(callback: () => void) {
    setVisible(false);
    setTimeout(() => { callback(); setVisible(true); }, 500);
  }

  function handleQuestionContinue() {
    const updated = [...synthAnswers];
    updated[questionIndex] = currentText.trim();
    setSynthAnswers(updated);

    if (questionIndex < SYNTHESIS_QUESTIONS.length - 1) {
      fade(() => {
        setQuestionIndex((q) => q + 1);
        setCurrentText(updated[questionIndex + 1] ?? "");
      });
    } else {
      fade(() => { setPhase("north-star"); setCurrentText(""); });
    }
  }

  function handleQuestionBack() {
    if (questionIndex === 0) {
      fade(() => setPhase("reflection"));
    } else {
      const updated = [...synthAnswers];
      updated[questionIndex] = currentText.trim();
      setSynthAnswers(updated);
      fade(() => {
        setQuestionIndex((q) => q - 1);
        setCurrentText(updated[questionIndex - 1] ?? "");
      });
    }
  }

  // ── Phase: Reflection ──────────────────────────────────────────────────────
  if (phase === "reflection") {
    const roomsWithAnswers = ROOMS.map((roomDef) => {
      const apiRoom = journey.rooms.find(
        (r) => ROOM_TYPE_TO_INDEX[r.roomType] === roomDef.type - 1
      );
      return { roomDef, answers: apiRoom?.answers ?? [] };
    }).filter(({ answers }) => answers.length > 0);

    return (
      <div className="h-full flex flex-col overflow-hidden px-6 pt-10 pb-5" style={{ backgroundColor: "var(--bg-app)" }}>
        <p className="text-xs tracking-widest uppercase mb-6 text-center shrink-0"
          style={{ color: "var(--text-faint)" }}>
          Room 5 — Synthesis
        </p>
        <h2
          className="text-2xl font-light mb-8 text-center leading-relaxed shrink-0"
          style={{ fontFamily: "Georgia, serif", color: "var(--text-secondary)" }}
        >
          Here is what you said.
        </h2>

        {/* Scrollable answers — no visible scrollbar */}
        <div className="flex-1 overflow-y-auto no-scrollbar max-w-2xl w-full mx-auto">
          {roomsWithAnswers.map(({ roomDef, answers }) => (
            <div key={roomDef.type} className="mb-8">
              <p className="text-xs tracking-widest uppercase mb-3"
                style={{ color: "var(--text-faint)" }}>
                {roomDef.emoji} {roomDef.name}
              </p>
              {answers.map((answer, i) => (
                <p
                  key={i}
                  className="leading-relaxed mb-2 text-base"
                  style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
                >
                  {answer}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div className="text-center mt-5 shrink-0">
          <button
            onClick={() => fade(() => setPhase("questions"))}
            className="px-8 py-3 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: "#0D6E6E" }}
          >
            Continue to synthesis →
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: Synthesis questions ─────────────────────────────────────────────
  if (phase === "questions") {
    const canContinue = currentText.trim().length >= 3;
    const isLast = questionIndex === SYNTHESIS_QUESTIONS.length - 1;

    return (
      <div
        className="h-full flex flex-col items-center justify-center px-6 py-16 relative"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5"
          style={{ opacity: 0.5 }}>
          <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            🌸 Synthesis
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {questionIndex + 1} of {SYNTHESIS_QUESTIONS.length}
          </span>
        </div>

        <div
          className="w-full max-w-2xl"
          style={{
            transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <p
            className="text-2xl md:text-3xl leading-relaxed text-center mb-12"
            style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
          >
            {SYNTHESIS_QUESTIONS[questionIndex]}
          </p>

          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canContinue) {
                e.preventDefault();
                handleQuestionContinue();
              }
            }}
            placeholder="Take your time…"
            rows={3}
            className="w-full border-0 border-b-2 focus:outline-none resize-none text-lg leading-relaxed pb-3 transition-colors"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              borderColor: "var(--border)",
              caretColor: "var(--text-primary)",
            }}
          />

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleQuestionBack}
              className="text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              ← Back
            </button>
            <div style={{ transition: "opacity 0.4s", opacity: canContinue ? 1 : 0, pointerEvents: canContinue ? "auto" : "none" }}>
              <button
                onClick={handleQuestionContinue}
                className="px-7 py-2.5 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: "#0D6E6E" }}
              >
                {isLast ? "Set my North Star →" : "Continue →"}
              </button>
            </div>
          </div>
          <p className="text-center text-xs mt-6" style={{ color: "var(--text-faint)" }}>⌘ ↵ to continue</p>
        </div>
      </div>
    );
  }

  // ── Phase: North Star ──────────────────────────────────────────────────────
  const canSave = northStar.trim().length >= 10;

  return (
    <div
      className="h-full flex flex-col items-center justify-center px-6 py-16 relative"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center px-8 py-5"
        style={{ opacity: 0.5 }}>
        <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          🌟 North Star
        </span>
      </div>

      <div
        className="w-full max-w-2xl"
        style={{ transition: "opacity 0.5s ease-in-out", opacity: visible ? 1 : 0 }}
      >
        <p
          className="text-2xl md:text-3xl leading-relaxed text-center mb-4"
          style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
        >
          In one or two sentences —
        </p>
        <p
          className="text-lg text-center mb-12"
          style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--text-muted)" }}
        >
          what feels like your direction?
        </p>

        <textarea
          value={northStar}
          onChange={(e) => setNorthStar(e.target.value)}
          placeholder="This is my direction…"
          rows={3}
          className="w-full border-0 border-b-2 focus:outline-none resize-none text-xl leading-relaxed pb-3 transition-colors text-center"
          style={{
            fontFamily: "Georgia, serif",
            backgroundColor: "transparent",
            color: "var(--text-primary)",
            borderColor: "var(--border)",
            caretColor: "var(--text-primary)",
          }}
        />

        <div
          className="flex justify-center mt-12"
          style={{ transition: "opacity 0.4s", opacity: canSave ? 1 : 0, pointerEvents: canSave ? "auto" : "none" }}
        >
          <button
            onClick={() => onNorthStarSave(northStar.trim(), synthAnswers)}
            disabled={saving}
            className="px-8 py-3 rounded-full text-white text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "#0D6E6E" }}
          >
            {saving ? "Saving…" : "This is my direction →"}
          </button>
        </div>
      </div>
    </div>
  );
}
