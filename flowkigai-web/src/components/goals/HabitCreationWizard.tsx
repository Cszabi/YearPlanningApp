import { useState } from "react";
import { goalApi } from "@/api/goalApi";
import { habitApi } from "@/api/habitApi";

const YEAR = new Date().getFullYear();

const LIFE_AREAS = [
  { key: "CareerWork",           label: "Career & Work",        icon: "💼" },
  { key: "HealthBody",           label: "Health & Body",        icon: "💪" },
  { key: "RelationshipsFamily",  label: "Relationships",        icon: "❤️" },
  { key: "LearningGrowth",       label: "Learning & Growth",    icon: "📚" },
  { key: "Finance",              label: "Finance",              icon: "💰" },
  { key: "CreativityHobbies",    label: "Creativity & Hobbies", icon: "🎨" },
  { key: "EnvironmentLifestyle", label: "Environment",          icon: "🌿" },
  { key: "ContributionPurpose",  label: "Contribution",         icon: "🌍" },
];

const FREQUENCIES = [
  { key: "Daily",   label: "Daily",   icon: "☀️", desc: "Every single day" },
  { key: "Weekly",  label: "Weekly",  icon: "📅", desc: "A few times per week" },
  { key: "Monthly", label: "Monthly", icon: "🗓️", desc: "Once or a few times per month" },
  { key: "Custom",  label: "Custom",  icon: "⚙️", desc: "Your own schedule" },
];

const TOTAL_STEPS = 5;

interface HabitDraft {
  title: string;
  frequency: string;
  lifeArea: string;
  minimumViableDose: string;
}

const EMPTY: HabitDraft = { title: "", frequency: "", lifeArea: "", minimumViableDose: "" };

// ── Shared shell ──────────────────────────────────────────────────────────────
function WizardShell({ step, onBack, onNext, nextLabel = "Next →", nextDisabled = false, children }: {
  step: number; onBack: () => void; onNext: () => void;
  nextLabel?: string; nextDisabled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center gap-2 pt-6 pb-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-teal-600" : i < step ? "bg-teal-300" : "bg-gray-200"}`} />
        ))}
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">{children}</div>
      <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">← Back</button>
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

// ── Main wizard ───────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

export default function HabitCreationWizard({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<HabitDraft>(EMPTY);

  const update = (patch: Partial<HabitDraft>) => setDraft(d => ({ ...d, ...patch }));

  const goBack = () => { if (step === 0) { onClose(); return; } setStep(s => s - 1); };
  const goNext = () => setStep(s => s + 1);

  async function handleCreate() {
    setSaving(true);
    try {
      const goal = await goalApi.createGoal({
        year: YEAR,
        title: draft.title,
        goalType: "Repetitive",
        lifeArea: draft.lifeArea,
        energyLevel: "Shallow",
        alignedValueNames: [],
      });

      await habitApi.createHabit({
        goalId: goal.id,
        year: YEAR,
        title: draft.title,
        frequency: draft.frequency,
        minimumViableDose: draft.minimumViableDose,
        trackingMethod: "Streak",
      });

      onClose();
    } catch {
      setSaving(false);
    }
  }

  const renderStep = () => {
    switch (step) {

      // ── Step 0: Name ─────────────────────────────────────────────────────
      case 0:
        return (
          <WizardShell step={0} onBack={goBack} onNext={goNext} nextDisabled={!draft.title.trim()}>
            <FieldLabel>What habit do you want to build?</FieldLabel>
            <input
              autoFocus
              value={draft.title}
              onChange={e => update({ title: e.target.value })}
              onKeyDown={e => e.key === "Enter" && draft.title.trim() && goNext()}
              placeholder="e.g. Morning meditation, Daily run, Read 20 pages"
              className="w-full text-lg border-b-2 border-gray-200 focus:border-teal-500 outline-none py-3 bg-transparent text-gray-800 placeholder-gray-300"
            />
          </WizardShell>
        );

      // ── Step 1: Frequency ────────────────────────────────────────────────
      case 1:
        return (
          <WizardShell step={1} onBack={goBack} onNext={goNext} nextDisabled={!draft.frequency}>
            <FieldLabel>How often will you do it?</FieldLabel>
            <div className="space-y-3">
              {FREQUENCIES.map(f => (
                <button
                  key={f.key}
                  onClick={() => update({ frequency: f.key })}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    draft.frequency === f.key
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{f.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </WizardShell>
        );

      // ── Step 2: Life Area ────────────────────────────────────────────────
      case 2:
        return (
          <WizardShell step={2} onBack={goBack} onNext={goNext} nextDisabled={!draft.lifeArea}>
            <FieldLabel>Which area of life does this habit serve?</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {LIFE_AREAS.map(la => (
                <button
                  key={la.key}
                  onClick={() => update({ lifeArea: la.key })}
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

      // ── Step 3: Minimum viable dose ──────────────────────────────────────
      case 3:
        return (
          <WizardShell step={3} onBack={goBack} onNext={goNext} nextDisabled={!draft.minimumViableDose.trim()}>
            <FieldLabel>What's the smallest version that still counts?</FieldLabel>
            <p className="text-sm text-gray-400 mb-4">
              The minimum viable dose is what you do even on your worst day. It keeps the streak alive.
            </p>
            <input
              autoFocus
              value={draft.minimumViableDose}
              onChange={e => update({ minimumViableDose: e.target.value })}
              onKeyDown={e => e.key === "Enter" && draft.minimumViableDose.trim() && goNext()}
              placeholder="e.g. 5 minutes, 10 push-ups, 1 page"
              className="w-full text-lg border-b-2 border-gray-200 focus:border-teal-500 outline-none py-3 bg-transparent text-gray-800 placeholder-gray-300"
            />
          </WizardShell>
        );

      // ── Step 4: Summary + Create ─────────────────────────────────────────
      case 4: {
        const freq = FREQUENCIES.find(f => f.key === draft.frequency);
        const area = LIFE_AREAS.find(l => l.key === draft.lifeArea);
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-center gap-2 pt-6 pb-4">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-teal-300" />
              ))}
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
              <h2 className="font-serif text-2xl text-gray-800">{draft.title}</h2>

              <div className="flex gap-2 flex-wrap">
                {freq && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                    {freq.icon} {freq.label}
                  </span>
                )}
                {area && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {area.icon} {area.label}
                  </span>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Minimum viable dose</div>
                <p className="text-sm text-gray-700">{draft.minimumViableDose}</p>
              </div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
              <button onClick={goBack} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">← Back</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="text-sm text-white px-8 py-2.5 rounded-full disabled:opacity-40 font-medium"
                style={{ backgroundColor: "#0D6E6E" }}
              >
                {saving ? "Creating…" : "Add Habit ✓"}
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
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            New Habit — Step {step + 1} of {TOTAL_STEPS}
          </span>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
        </div>
        {renderStep()}
      </div>
    </div>
  );
}
