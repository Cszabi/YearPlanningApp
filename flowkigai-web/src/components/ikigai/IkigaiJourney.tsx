import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ikigaiApi, type IkigaiJourneyDto } from "@/api/ikigaiApi";
import { ROOMS, ROOM_TYPE_TO_INDEX } from "./roomData";
import IkigaiRoom from "./IkigaiRoom";
import IkigaiSynthesis from "./IkigaiSynthesis";
import ValuesSelector from "./ValuesSelector";

const YEAR = new Date().getFullYear();
const DRAFT_KEY = `flowkigai-ikigai-draft-${YEAR}`;

type Phase =
  | "loading"
  | "start"
  | "rooms"
  | "synthesis"
  | "north-star-reveal"
  | "values"
  | "journey-complete";

interface DraftState {
  currentRoomIndex: number;
  answers: Record<number, string[]>; // roomType (1-4) → answers array
}

function loadDraft(): DraftState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw
      ? (JSON.parse(raw) as DraftState)
      : { currentRoomIndex: 0, answers: {} };
  } catch {
    return { currentRoomIndex: 0, answers: {} };
  }
}

function persistDraft(state: DraftState) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
}

export default function IkigaiJourney() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [draft, setDraft] = useState<DraftState>(loadDraft);
  const [savingLast, setSavingLast] = useState(false);
  const [starting, setStarting] = useState(false);
  const [northStar, setNorthStar] = useState("");
  const [savingNorthStar, setSavingNorthStar] = useState(false);
  const [savingValues, setSavingValues] = useState(false);

  const { data: journey, isLoading } = useQuery<IkigaiJourneyDto | null>({
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

    if (journey === null) {
      setPhase("start");
      return;
    }

    if (!journey) return;

    // Fully complete — go to map
    if (journey.northStar !== null && journey.values.length >= 5) {
      navigate("/map");
      return;
    }

    // North star saved, values still needed
    if (journey.northStar !== null) {
      setNorthStar(journey.northStar.statement);
      setPhase("values");
      return;
    }

    // Check rooms completion
    const completedRoomTypes = new Set(
      journey.rooms.filter((r) => r.isComplete).map((r) => ROOM_TYPE_TO_INDEX[r.roomType] ?? -1)
    );

    let resumeRoomIndex = 0;
    for (let i = 0; i < 4; i++) {
      if (completedRoomTypes.has(i)) resumeRoomIndex = i + 1;
      else break;
    }

    if (resumeRoomIndex >= 4) {
      setPhase("synthesis");
      return;
    }

    // Still in rooms — merge API answers into local draft
    const apiAnswers: Record<number, string[]> = {};
    for (const room of journey.rooms) {
      const idx = ROOM_TYPE_TO_INDEX[room.roomType];
      if (idx !== undefined) apiAnswers[idx + 1] = room.answers;
    }

    const localDraft = loadDraft();
    setDraft({
      currentRoomIndex: resumeRoomIndex,
      answers: { ...apiAnswers, ...localDraft.answers },
    });
    setPhase("rooms");
  }, [isLoading, journey, navigate]);

  async function handleStart() {
    setStarting(true);
    try {
      const data = await ikigaiApi.startJourney(YEAR);
      queryClient.setQueryData(["ikigaiJourney", YEAR], data);
      const fresh: DraftState = { currentRoomIndex: 0, answers: {} };
      setDraft(fresh);
      persistDraft(fresh);
      setPhase("rooms");
    } finally {
      setStarting(false);
    }
  }

  function handleAnswer(
    _promptIndex: number,
    answers: string[],
    isRoomComplete: boolean
  ) {
    const room = ROOMS[draft.currentRoomIndex];
    const updatedAnswers = { ...draft.answers, [room.type]: answers };

    const updatedDraft = { ...draft, answers: updatedAnswers };
    persistDraft(updatedDraft);
    setDraft(updatedDraft);

    if (!isRoomComplete) {
      ikigaiApi.saveRoom(YEAR, room.type, answers, false).catch(() => {});
      return;
    }

    setSavingLast(true);
    ikigaiApi
      .saveRoom(YEAR, room.type, answers, true)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["ikigaiJourney", YEAR] });
        const nextRoomIndex = draft.currentRoomIndex + 1;
        if (nextRoomIndex >= 4) {
          setPhase("synthesis");
          localStorage.removeItem(DRAFT_KEY);
        } else {
          const newDraft: DraftState = {
            currentRoomIndex: nextRoomIndex,
            answers: updatedAnswers,
          };
          setDraft(newDraft);
          persistDraft(newDraft);
        }
      })
      .catch(() => {
        const nextRoomIndex = draft.currentRoomIndex + 1;
        if (nextRoomIndex >= 4) {
          setPhase("synthesis");
        } else {
          setDraft({ currentRoomIndex: nextRoomIndex, answers: updatedAnswers });
        }
      })
      .finally(() => setSavingLast(false));
  }

  async function handleNorthStarSave(statement: string, _synthesisAnswers: string[]) {
    setSavingNorthStar(true);
    try {
      await ikigaiApi.saveNorthStar(YEAR, statement);
    } catch {
      // advance anyway
    } finally {
      setSavingNorthStar(false);
    }
    setNorthStar(statement);
    setPhase("north-star-reveal");
  }

  async function handleValuesSave(values: { valueName: string; rank: number }[]) {
    setSavingValues(true);
    try {
      await ikigaiApi.saveValues(YEAR, values);
    } catch {
      // advance anyway
    } finally {
      setSavingValues(false);
    }
    setPhase("journey-complete");
    setTimeout(() => navigate("/map"), 2500);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <span className="text-sm" style={{ color: "var(--text-faint)" }}>Loading your journey…</span>
      </div>
    );
  }

  if (phase === "start") {
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <p className="text-xs tracking-widest uppercase mb-10" style={{ color: "var(--text-faint)" }}>
          Ikigai Journey · {YEAR}
        </p>
        <h2
          className="text-4xl font-light mb-5 leading-snug"
          style={{ fontFamily: "Georgia, serif", color: "var(--text-secondary)" }}
        >
          Who are you, really?
        </h2>
        <p className="max-w-md leading-relaxed mb-12 text-base" style={{ color: "var(--text-muted)" }}>
          Before you can plan a meaningful year, you need to know what you're
          planning toward. This journey takes you through four rooms. There are
          no right answers — only honest ones.
        </p>
        <button
          onClick={handleStart}
          disabled={starting}
          className="px-8 py-3 rounded-full text-white text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#0D6E6E" }}
        >
          {starting ? "Starting…" : "Begin the journey"}
        </button>
      </div>
    );
  }

  if (phase === "synthesis") {
    return (
      <IkigaiSynthesis
        journey={journey!}
        saving={savingNorthStar}
        onNorthStarSave={handleNorthStarSave}
      />
    );
  }

  if (phase === "north-star-reveal") {
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-8 py-16 text-center"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <p className="text-xs tracking-widest uppercase mb-16" style={{ color: "var(--text-faint)" }}>
          Your North Star
        </p>
        <p
          className="text-3xl md:text-4xl font-light max-w-2xl leading-relaxed mb-20"
          style={{ fontFamily: "Georgia, serif", color: "var(--text-primary)" }}
        >
          {northStar}
        </p>
        <button
          onClick={() => setPhase("values")}
          className="text-sm transition-colors"
          style={{ color: "var(--text-faint)" }}
        >
          Continue →
        </button>
      </div>
    );
  }

  if (phase === "values") {
    return <ValuesSelector saving={savingValues} onSave={handleValuesSave} />;
  }

  if (phase === "journey-complete") {
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <p
          className="text-2xl font-light mb-4"
          style={{ fontFamily: "Georgia, serif", color: "var(--text-secondary)" }}
        >
          Your map is ready.
        </p>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Let's see what emerged.</p>
      </div>
    );
  }

  // phase === "rooms"
  const currentRoom = ROOMS[draft.currentRoomIndex];
  return (
    <IkigaiRoom
      key={draft.currentRoomIndex} // remount on room change for clean state
      room={currentRoom}
      roomIndex={draft.currentRoomIndex}
      initialPromptIndex={0}
      initialAnswers={draft.answers[currentRoom.type] ?? []}
      saving={savingLast}
      onAnswer={handleAnswer}
    />
  );
}
