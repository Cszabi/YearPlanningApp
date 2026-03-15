import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ikigaiApi } from "@/api/ikigaiApi";
import { goalApi } from "@/api/goalApi";

const YEAR = new Date().getFullYear();
const DRAFT_KEY = `flowkigai-goal-draft-${YEAR}`;

const LIFE_AREAS = [
  { key: "CareerWork",          label: "Career & Work",          icon: "💼" },
  { key: "HealthBody",          label: "Health & Body",          icon: "💪" },
  { key: "RelationshipsFamily", label: "Relationships",          icon: "❤️" },
  { key: "LearningGrowth",      label: "Learning & Growth",      icon: "📚" },
  { key: "Finance",             label: "Finance",                icon: "💰" },
  { key: "CreativityHobbies",   label: "Creativity & Hobbies",   icon: "🎨" },
  { key: "EnvironmentLifestyle",label: "Environment",            icon: "🌿" },
  { key: "ContributionPurpose", label: "Contribution",           icon: "🌍" },
];

const ENERGY_LEVELS = [
  { key: "Deep",    label: "Deep Work",  icon: "🔵", desc: "Requires full focus, blocks of 2–4 h, no interruptions" },
  { key: "Medium",  label: "Medium",     icon: "🟡", desc: "Can be done in 30–90 min sessions with mild distraction" },
  { key: "Shallow", label: "Shallow",    icon: "⚪", desc: "Quick tasks, admin, can handle interruptions" },
];

const SMART_STEPS = [
  { key: "specific",    label: "Specific",    question: "What exactly do you want to achieve?" },
  { key: "measurable",  label: "Measurable",  question: "How will you measure success?" },
  { key: "achievable",  label: "Achievable",  question: "Is this realistic given what you have now?" },
  { key: "relevant",    label: "Relevant",    question: "Why does this matter to you?" },
  { key: "timeBound",   label: "Time-bound",  question: "By when do you want to achieve this?" },
];

const WOOP_STEPS = [
  { key: "wish",     label: "Wish",     question: "State your goal in one energising sentence." },
  { key: "outcome",  label: "Outcome",  question: "What is the best possible result?" },
  { key: "obstacle", label: "Obstacle", question: "What inner obstacle is most likely to get in your way?" },
  { key: "plan",     label: "Plan",     question: "Complete the plan: \"If [obstacle], then I will…\"" },
];

interface Draft {
  title: string;
  lifeArea: string;
  energyLevel: string;
  smart: Record<string, string>;
  woop: Record<string, string>;
  whyItMatters: string;
  alignedValues: string[];
  targetDate: string;
}

const EMPTY_DRAFT: Draft = {
  title: "", lifeArea: "", energyLevel: "",
  smart: {}, woop: {}, whyItMatters: "",
  alignedValues: [], targetDate: "",
};

// ── Shared primitives ─────────────────────────────────────────────────────────
function WizardShell({ step, totalSteps, onBack, onNext, nextLabel = "Next →", nextDisabled = false, children }: {
  step: number; totalSteps: number; onBack: () => void; onNext: () => void;
  nextLabel?: string; nextDisabled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Dot progress */}
      <div className="flex justify-center gap-2 pt-6 pb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-teal-600" : i < step ? "bg-teal-300" : "bg-gray-200"}`} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">{children}</div>

      {/* Nav */}
      <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="text-sm text-white px-6 py-2 rounded-full disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: "#0D6E6E" }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-serif text-xl text-gray-800 mb-4 leading-snug">{children}</p>;
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
interface Props {
  initialTitle?: string;
  onClose: () => void;
}

export default function GoalCreationWizard({ initialTitle = "", onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);        // 0–7
  const [smartStep, setSmartStep] = useState(0);
  const [woopStep, setWoopStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deepWarning, setDeepWarning] = useState(false);

  // Load saved draft or initialize
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Draft;
        return { ...EMPTY_DRAFT, ...saved, title: saved.title || initialTitle };
      }
    } catch {}
    return { ...EMPTY_DRAFT, title: initialTitle };
  });

  const updateDraft = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  };

  // User values for step 7
  const { data: journey } = useQuery({
    queryKey: ["ikigaiJourney", YEAR],
    queryFn: () => ikigaiApi.getJourney(YEAR),
  });
  const topValues = journey?.values?.slice(0, 5).map((v: { valueName: string }) => v.valueName) ?? [];

  // Deep capacity check
  useEffect(() => {
    if (draft.energyLevel === "Deep") {
      goalApi.countActiveDeepGoals(YEAR).then(count => setDeepWarning(count >= 3));
    } else {
      setDeepWarning(false);
    }
  }, [draft.energyLevel]);

  const TOTAL_STEPS = 8;
  const goBack = () => {
    if (step === 3 && smartStep > 0) { setSmartStep(s => s - 1); return; }
    if (step === 4 && woopStep > 0)  { setWoopStep(w => w - 1);  return; }
    if (step === 0) { onClose(); return; }
    setStep(s => s - 1);
  };
  const goNext = () => {
    if (step === 3 && smartStep < SMART_STEPS.length - 1) { setSmartStep(s => s + 1); return; }
    if (step === 4 && woopStep < WOOP_STEPS.length - 1)   { setWoopStep(w => w + 1);  return; }
    setStep(s => s + 1);
  };

  // ── Step 8 submit ────────────────────────────────────────────────────────
  async function handleCreate() {
    setSaving(true);
    try {
      const goal = await goalApi.createGoal({
        year: YEAR,
        title: draft.title,
        goalType: "Project",
        lifeArea: draft.lifeArea,
        energyLevel: draft.energyLevel,
        whyItMatters: draft.whyItMatters || undefined,
        targetDate: draft.targetDate || undefined,
        alignedValueNames: draft.alignedValues,
      });

      if (draft.smart.specific) {
        await goalApi.saveSmart(goal.id, YEAR, {
          specific: draft.smart.specific,
          measurable: draft.smart.measurable,
          achievable: draft.smart.achievable,
          relevant: draft.smart.relevant,
          timeBound: draft.targetDate || new Date(Date.now() + 365 * 86400_000).toISOString(),
        });
      }

      if (draft.woop.wish) {
        await goalApi.saveWoop(goal.id, YEAR, {
          wish: draft.woop.wish,
          outcome: draft.woop.outcome,
          obstacle: draft.woop.obstacle,
          plan: draft.woop.plan,
        });
      }

      sessionStorage.removeItem(DRAFT_KEY);
      navigate("/goals");
    } catch {
      setSaving(false);
    }
  }

  // ── Step renderers ───────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── Step 1: Title ────────────────────────────────────────────────────
      case 0:
        return (
          <WizardShell step={0} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext} nextDisabled={!draft.title.trim()}>
            <FieldLabel>Name your goal clearly</FieldLabel>
            <input
              autoFocus
              value={draft.title}
              onChange={e => updateDraft({ title: e.target.value })}
              onKeyDown={e => e.key === "Enter" && draft.title.trim() && goNext()}
              placeholder="e.g. Launch my podcast by June"
              className="w-full text-lg border-b-2 border-gray-200 focus:border-teal-500 outline-none py-3 bg-transparent text-gray-800 placeholder-gray-300"
            />
          </WizardShell>
        );

      // ── Step 2: Life Area ────────────────────────────────────────────────
      case 1:
        return (
          <WizardShell step={1} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext} nextDisabled={!draft.lifeArea}>
            <FieldLabel>Which area of life does this serve?</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {LIFE_AREAS.map(la => (
                <button
                  key={la.key}
                  onClick={() => updateDraft({ lifeArea: la.key })}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    draft.lifeArea === la.key
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl">{la.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{la.label}</span>
                </button>
              ))}
            </div>
          </WizardShell>
        );

      // ── Step 3: Energy Level ─────────────────────────────────────────────
      case 2:
        return (
          <WizardShell step={2} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext} nextDisabled={!draft.energyLevel}>
            <FieldLabel>How much energy does this require?</FieldLabel>
            {deepWarning && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                ⚠️ You already have 3 active Deep Work goals. Adding another may stretch you thin.
              </div>
            )}
            <div className="space-y-3">
              {ENERGY_LEVELS.map(el => (
                <button
                  key={el.key}
                  onClick={() => updateDraft({ energyLevel: el.key })}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    draft.energyLevel === el.key
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{el.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{el.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{el.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </WizardShell>
        );

      // ── Step 4: SMART ────────────────────────────────────────────────────
      case 3: {
        const s = SMART_STEPS[smartStep];
        const isDateStep = s.key === "timeBound";
        return (
          <WizardShell
            step={3} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext}
            nextDisabled={isDateStep
              ? !draft.targetDate || new Date(draft.targetDate) < new Date()
              : !(draft.smart[s.key] ?? "").trim()}
          >
            <div className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">
              SMART — {s.label} ({smartStep + 1}/5)
            </div>
            <FieldLabel>{s.question}</FieldLabel>
            {isDateStep ? (
              <>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={draft.targetDate.split("T")[0] ?? ""}
                  onChange={e => updateDraft({ targetDate: new Date(e.target.value).toISOString() })}
                  className="w-full border-b-2 border-gray-200 focus:border-teal-500 outline-none py-3 text-lg bg-transparent text-gray-800"
                />
                {draft.targetDate && new Date(draft.targetDate) < new Date() && (
                  <p className="text-red-500 text-sm mt-2">Target date must be in the future.</p>
                )}
              </>
            ) : (
              <textarea
                autoFocus
                rows={4}
                value={draft.smart[s.key] ?? ""}
                onChange={e => updateDraft({ smart: { ...draft.smart, [s.key]: e.target.value } })}
                placeholder="Write here…"
                className="w-full border-b-2 border-gray-200 focus:border-teal-500 outline-none py-3 text-base bg-transparent text-gray-800 resize-none placeholder-gray-300"
              />
            )}
          </WizardShell>
        );
      }

      // ── Step 5: WOOP ─────────────────────────────────────────────────────
      case 4: {
        const w = WOOP_STEPS[woopStep];
        const isPlanStep = w.key === "plan";
        const obstacle = draft.woop.obstacle ?? "";
        return (
          <WizardShell
            step={4} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext}
            nextDisabled={!(draft.woop[w.key] ?? "").trim()}
          >
            <div className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">
              WOOP — {w.label} ({woopStep + 1}/4)
            </div>
            <FieldLabel>{w.question}</FieldLabel>
            {isPlanStep && obstacle && (
              <div className="mb-3 text-sm text-gray-400 italic">
                "If {obstacle.toLowerCase()}, then I will…"
              </div>
            )}
            <textarea
              autoFocus
              rows={4}
              value={draft.woop[w.key] ?? ""}
              onChange={e => updateDraft({ woop: { ...draft.woop, [w.key]: e.target.value } })}
              placeholder={isPlanStep ? `…then I will…` : "Write here…"}
              className="w-full border-b-2 border-gray-200 focus:border-teal-500 outline-none py-3 text-base bg-transparent text-gray-800 resize-none placeholder-gray-300"
            />
          </WizardShell>
        );
      }

      // ── Step 6: Why It Matters ───────────────────────────────────────────
      case 5:
        return (
          <WizardShell step={5} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext}>
            <FieldLabel>Why does this goal matter to you personally?</FieldLabel>
            <textarea
              autoFocus
              rows={5}
              value={draft.whyItMatters}
              onChange={e => updateDraft({ whyItMatters: e.target.value })}
              placeholder="The deeper reason behind this goal…"
              className="w-full border-b-2 border-gray-200 focus:border-teal-500 outline-none py-3 text-base bg-transparent text-gray-800 resize-none placeholder-gray-300"
            />
          </WizardShell>
        );

      // ── Step 7: Values Alignment ─────────────────────────────────────────
      case 6:
        return (
          <WizardShell step={6} totalSteps={TOTAL_STEPS} onBack={goBack} onNext={goNext}>
            <FieldLabel>Which of your values does this goal serve?</FieldLabel>
            {topValues.length === 0 ? (
              <p className="text-sm text-gray-400">No saved values found. Complete your Ikigai journey to see your top values here.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {topValues.map((v: string) => {
                  const selected = draft.alignedValues.includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => updateDraft({
                        alignedValues: selected
                          ? draft.alignedValues.filter(x => x !== v)
                          : [...draft.alignedValues, v],
                      })}
                      className={`px-4 py-2 rounded-full border text-sm transition-all ${
                        selected
                          ? "border-teal-500 bg-teal-50 text-teal-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            )}
          </WizardShell>
        );

      // ── Step 8: Summary ──────────────────────────────────────────────────
      case 7: {
        const la = LIFE_AREAS.find(l => l.key === draft.lifeArea);
        const el = ENERGY_LEVELS.find(e => e.key === draft.energyLevel);
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-center gap-2 pt-6 pb-4">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < TOTAL_STEPS ? "bg-teal-300" : "bg-gray-200"}`} />
              ))}
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
              <h2 className="font-serif text-2xl text-gray-800">{draft.title}</h2>

              <div className="flex gap-2 flex-wrap">
                {la && <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700">{la.icon} {la.label}</span>}
                {el && <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{el.icon} {el.label}</span>}
                {draft.targetDate && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    📅 {new Date(draft.targetDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {draft.whyItMatters && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Why it matters</div>
                  <p className="text-sm text-gray-700">{draft.whyItMatters}</p>
                </div>
              )}

              {draft.smart.specific && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">SMART</div>
                  {SMART_STEPS.filter(s => s.key !== "timeBound").map(s => (
                    draft.smart[s.key] && (
                      <div key={s.key}>
                        <span className="text-xs font-semibold text-teal-600">{s.label}: </span>
                        <span className="text-xs text-gray-600">{draft.smart[s.key]}</span>
                      </div>
                    )
                  ))}
                </div>
              )}

              {draft.woop.wish && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">WOOP</div>
                  {WOOP_STEPS.map(w => (
                    draft.woop[w.key] && (
                      <div key={w.key}>
                        <span className="text-xs font-semibold text-teal-600">{w.label}: </span>
                        <span className="text-xs text-gray-600">{draft.woop[w.key]}</span>
                      </div>
                    )
                  ))}
                </div>
              )}

              {draft.alignedValues.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draft.alignedValues.map(v => (
                    <span key={v} className="px-3 py-1 rounded-full text-xs bg-teal-50 text-teal-700">{v}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
              <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">← Back</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="text-sm text-white px-8 py-2.5 rounded-full disabled:opacity-40 font-medium"
                style={{ backgroundColor: "#0D6E6E" }}
              >
                {saving ? "Creating…" : "Create Goal ✓"}
              </button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl" style={{ height: "85vh", maxHeight: 700 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            New Goal — Step {step + 1} of {TOTAL_STEPS}
          </span>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
        </div>
        {renderStep()}
      </div>
    </div>
  );
}
