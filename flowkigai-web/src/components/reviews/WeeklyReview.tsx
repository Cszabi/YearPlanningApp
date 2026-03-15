import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box, Typography, Button, Stack, Slider, TextField, Paper,
  Chip, CircularProgress, Divider, ToggleButton, ToggleButtonGroup,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SaveIcon from "@mui/icons-material/Save";
import { reviewApi, type ReviewDto, type ReviewAnswers, type WeeklyReviewDataDto } from "@/api/reviewApi";
import { ikigaiApi } from "@/api/ikigaiApi";

const YEAR = new Date().getFullYear();
const ENERGY_LABELS = ["Drained", "Low", "Neutral", "Good", "Energised"];
const OUTCOME_LABEL: Record<string, string> = {
  Fully: "Fully ✅", Partially: "Partially 🟡", NotReally: "Not really ❌",
};

interface Props {
  weekStartDate: string; // "YYYY-MM-DD"
  onBack: () => void;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      fontWeight={700}
      color="primary.main"
      sx={{ display: "block", letterSpacing: 1.5, mb: 2, mt: 0.5 }}
    >
      {children}
    </Typography>
  );
}

export default function WeeklyReview({ weekStartDate, onBack }: Props) {
  // ── Fetch auto-populated data ────────────────────────────────────────────
  const { data: weekData, isLoading: loadingData, isError: dataError } =
    useQuery<WeeklyReviewDataDto>({
      queryKey: ["weekly-data", weekStartDate],
      queryFn: () => reviewApi.getWeeklyData(weekStartDate),
      retry: 1,
    });

  const { data: existingReview, isLoading: loadingReview } =
    useQuery<ReviewDto | null>({
      queryKey: ["review", "Weekly", weekStartDate],
      queryFn: () => reviewApi.getReview("Weekly", weekStartDate),
      retry: false,
    });

  const { data: journey } = useQuery({
    queryKey: ["ikigai", YEAR],
    queryFn: () => ikigaiApi.getJourney(YEAR),
    retry: false,
  });

  // ── Form state ───────────────────────────────────────────────────────────
  const [energyRating, setEnergyRating] = useState(3);
  const [completedTaskNotes, setCompletedTaskNotes] = useState("");
  const [carriedOverNote, setCarriedOverNote] = useState("");
  const [habitNotes, setHabitNotes] = useState("");
  const [priority1, setPriority1] = useState("");
  const [priority2, setPriority2] = useState("");
  const [priority3, setPriority3] = useState("");
  const [flowScheduled, setFlowScheduled] = useState<string | null>(null);
  const [goalNextActions, setGoalNextActions] = useState<Record<string, string>>({});
  const [valuesReflection, setValuesReflection] = useState("");

  // ── Persistence state ────────────────────────────────────────────────────
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isComplete, setIsComplete] = useState(false);
  const isDirty = useRef(false);

  // Initialise from existing review
  useEffect(() => {
    if (existingReview) {
      setSavedId(existingReview.id);
      setIsComplete(existingReview.isComplete);
      if (existingReview.energyRating) setEnergyRating(existingReview.energyRating);
      const a = existingReview.answers ?? {};
      if (a.completedTaskNotes) setCompletedTaskNotes(a.completedTaskNotes);
      if (a.carriedOverNote) setCarriedOverNote(a.carriedOverNote);
      if (a.habitNotes) setHabitNotes(a.habitNotes);
      if (a.priority1) setPriority1(a.priority1);
      if (a.priority2) setPriority2(a.priority2);
      if (a.priority3) setPriority3(a.priority3);
      if (a.flowSessionsScheduled) setFlowScheduled(a.flowSessionsScheduled);
      if (a.goalNextActions) setGoalNextActions(a.goalNextActions);
      if (a.valuesReflection) setValuesReflection(a.valuesReflection);
    }
  }, [existingReview]);

  // Mark dirty on any change
  function markDirty() { isDirty.current = true; setSaveStatus("idle"); }

  // ── Auto-save ────────────────────────────────────────────────────────────
  async function doSave(complete = false) {
    if (!isDirty.current && !complete) return;
    setSaveStatus("saving");
    const answers: ReviewAnswers = {
      completedTaskNotes: completedTaskNotes || undefined,
      carriedOverNote: carriedOverNote || undefined,
      habitNotes: habitNotes || undefined,
      priority1: priority1 || undefined,
      priority2: priority2 || undefined,
      priority3: priority3 || undefined,
      flowSessionsScheduled: flowScheduled ?? undefined,
      goalNextActions: Object.keys(goalNextActions).length ? goalNextActions : undefined,
      valuesReflection: valuesReflection || undefined,
    };
    try {
      if (savedId) {
        await reviewApi.update(savedId, { energyRating, answers, isComplete: complete || isComplete });
      } else {
        const saved = await reviewApi.createOrUpdate({
          reviewType: "Weekly",
          periodStart: weekStartDate,
          energyRating,
          answers,
          isComplete: complete || isComplete,
        });
        setSavedId(saved.id);
      }
      isDirty.current = false;
      setSaveStatus("saved");
      if (complete) setIsComplete(true);
    } catch {
      setSaveStatus("error");
    }
  }

  useEffect(() => {
    const interval = setInterval(() => { doSave(); }, 30_000);
    return () => {
      clearInterval(interval);
      doSave(); // save on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedId, energyRating, completedTaskNotes, carriedOverNote, habitNotes,
      priority1, priority2, priority3, flowScheduled, goalNextActions, valuesReflection, isComplete]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const top5Values = journey?.values
    ? [...journey.values].sort((a, b) => a.rank - b.rank).slice(0, 5)
    : [];

  const activeGoals = weekData?.activeGoals ?? [];
  const weekLabel = new Date(weekStartDate + "T00:00:00").toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  });

  const isLoading = loadingData || loadingReview;

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box sx={{
        position: "sticky", top: 0, zIndex: 10,
        bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
        px: 3, py: 1.5,
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1}>
            <Button startIcon={<ArrowBackIcon />} size="small" onClick={onBack} sx={{ mr: 1 }}>
              Back
            </Button>
            <Box>
              <Typography variant="h6" fontWeight={700}>Weekly Review</Typography>
              <Typography variant="caption" color="text.disabled">Week of {weekLabel}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1.5}>
            {saveStatus === "saving" && (
              <Stack direction="row" alignItems="center" gap={0.5}>
                <CircularProgress size={12} /><Typography variant="caption" color="text.disabled">Saving…</Typography>
              </Stack>
            )}
            {saveStatus === "saved" && (
              <Typography variant="caption" color="success.main">✓ Saved</Typography>
            )}
            {saveStatus === "error" && (
              <Typography variant="caption" color="error.main">Save failed</Typography>
            )}
            {isComplete ? (
              <Chip icon={<CheckCircleIcon />} label="Completed" color="success" size="small" />
            ) : (
              <>
                <Button size="small" startIcon={<SaveIcon />} onClick={() => doSave()}>
                  Save
                </Button>
                <Button
                  variant="contained" size="small" color="success"
                  onClick={() => doSave(true)}
                >
                  Complete Review
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ px: 3, py: 4, maxWidth: 700, mx: "auto" }}>

          {dataError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Could not load auto-populated data. You can still write your review manually.
            </Alert>
          )}

          {/* ══ SECTION 1: LOOK BACK ══════════════════════════════════════════ */}
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mb: 3 }}>
            <SectionHeader>1 · Look Back</SectionHeader>

            {/* Completed tasks */}
            {weekData && weekData.completedTasks.length > 0 && (
              <Box mb={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
                  Completed this week
                </Typography>
                <Stack gap={0.5} mb={1.5}>
                  {weekData.completedTasks.map((t) => (
                    <Stack key={t.taskId} direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "success.main", flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t.title}
                        <Typography component="span" variant="caption" color="text.disabled" ml={0.5}>
                          · {t.goalTitle}
                        </Typography>
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <TextField
                  fullWidth size="small" multiline rows={2}
                  label="Any notes on completed work? (optional)"
                  value={completedTaskNotes}
                  onChange={(e) => { setCompletedTaskNotes(e.target.value); markDirty(); }}
                />
              </Box>
            )}

            {/* Carried over */}
            <Box mb={3}>
              <TextField
                fullWidth multiline rows={2}
                label="What carried over and why?"
                value={carriedOverNote}
                onChange={(e) => { setCarriedOverNote(e.target.value); markDirty(); }}
              />
            </Box>

            {/* Energy slider */}
            <Box mb={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.5 }}>
                Energy this week
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight={600} textAlign="center" mb={1}>
                {ENERGY_LABELS[energyRating - 1]}
              </Typography>
              <Slider
                value={energyRating} min={1} max={5} step={1}
                onChange={(_, v) => { setEnergyRating(v as number); markDirty(); }}
                marks={ENERGY_LABELS.map((l, i) => ({ value: i + 1, label: l }))}
                sx={{ "& .MuiSlider-markLabel": { fontSize: "0.7rem" } }}
              />
            </Box>

            {/* Habits */}
            {weekData && weekData.habitSummaries.length > 0 && (
              <Box mb={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
                  Habits this week
                </Typography>
                <Stack gap={0.75} mb={1.5}>
                  {weekData.habitSummaries.map((h) => (
                    <Stack key={h.habitId} direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2">{h.title}</Typography>
                      <Chip
                        label={`${h.daysCompleted}/${h.daysExpected} days`}
                        size="small"
                        color={h.daysCompleted >= h.daysExpected ? "success" : h.daysCompleted > 0 ? "warning" : "default"}
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    </Stack>
                  ))}
                </Stack>
                <TextField
                  fullWidth size="small" multiline rows={2}
                  label="Habit notes (optional)"
                  value={habitNotes}
                  onChange={(e) => { setHabitNotes(e.target.value); markDirty(); }}
                />
              </Box>
            )}

            {/* Flow sessions */}
            {weekData && weekData.flowSummary.sessionCount > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
                  Flow sessions this week
                </Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                  <Stack direction="row" gap={3} flexWrap="wrap">
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={700} color="primary.main">
                        {weekData.flowSummary.sessionCount}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">sessions</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={700} color="primary.main">
                        {Math.round(weekData.flowSummary.totalMinutes / 60 * 10) / 10}h
                      </Typography>
                      <Typography variant="caption" color="text.disabled">deep work</Typography>
                    </Box>
                    {weekData.flowSummary.avgFlowQuality && (
                      <Box textAlign="center">
                        <Typography variant="h5" fontWeight={700} color="primary.main">
                          {weekData.flowSummary.avgFlowQuality.toFixed(1)}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">avg quality</Typography>
                      </Box>
                    )}
                    {weekData.flowSummary.bestOutcome && (
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={600}>
                          {OUTCOME_LABEL[weekData.flowSummary.bestOutcome] ?? weekData.flowSummary.bestOutcome}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">best session</Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Box>
            )}

            {weekData && weekData.flowSummary.sessionCount === 0 && weekData.habitSummaries.length === 0 && weekData.completedTasks.length === 0 && (
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 2 }}>
                No tracked activity found for this week yet.
              </Typography>
            )}
          </Paper>

          {/* ══ SECTION 2: LOOK FORWARD ═══════════════════════════════════════ */}
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mb: 3 }}>
            <SectionHeader>2 · Look Forward</SectionHeader>

            {/* Top 3 priorities */}
            <Box mb={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1.5 }}>
                Top 3 priorities next week
              </Typography>
              <Stack gap={1.5}>
                <TextField
                  fullWidth size="small" label="Priority 1"
                  value={priority1}
                  onChange={(e) => { setPriority1(e.target.value); markDirty(); }}
                />
                <TextField
                  fullWidth size="small" label="Priority 2"
                  value={priority2}
                  onChange={(e) => { setPriority2(e.target.value); markDirty(); }}
                />
                <TextField
                  fullWidth size="small" label="Priority 3"
                  value={priority3}
                  onChange={(e) => { setPriority3(e.target.value); markDirty(); }}
                />
              </Stack>
            </Box>

            {/* Flow sessions scheduled */}
            <Box mb={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
                Are next week's flow sessions scheduled?
              </Typography>
              <ToggleButtonGroup
                value={flowScheduled} exclusive
                onChange={(_, v) => { if (v !== null) { setFlowScheduled(v); markDirty(); } }}
                size="small"
              >
                <ToggleButton value="Yes">Yes ✅</ToggleButton>
                <ToggleButton value="Planning">Planning 🗓️</ToggleButton>
                <ToggleButton value="No">Not yet ❌</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Next action per goal */}
            {activeGoals.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1.5 }}>
                  Next action for each active goal
                </Typography>
                <Stack gap={1.5}>
                  {activeGoals.map((g) => (
                    <Box key={g.id}>
                      <Typography variant="caption" color="text.disabled" sx={{ display: "block", mb: 0.5 }}>
                        {g.title}
                      </Typography>
                      <TextField
                        fullWidth size="small" placeholder="What's the next action?"
                        value={goalNextActions[g.id] ?? ""}
                        onChange={(e) => {
                          setGoalNextActions((p) => ({ ...p, [g.id]: e.target.value }));
                          markDirty();
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>

          {/* ══ SECTION 3: VALUES CHECK ═══════════════════════════════════════ */}
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, mb: 4 }}>
            <SectionHeader>3 · Values Check</SectionHeader>

            {top5Values.length > 0 && (
              <Box mb={2.5}>
                <Typography variant="caption" color="text.disabled"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
                  Your top values
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {top5Values.map((v, i) => (
                    <Chip
                      key={v.id}
                      label={`${i + 1}. ${v.valueName}`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <TextField
              fullWidth multiline rows={3}
              label="Did this week reflect what matters to you?"
              value={valuesReflection}
              onChange={(e) => { setValuesReflection(e.target.value); markDirty(); }}
            />
          </Paper>

          {/* Bottom complete button */}
          {!isComplete && (
            <Box textAlign="center" pb={4}>
              <Divider sx={{ mb: 3 }} />
              <Button
                variant="contained" size="large" color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => doSave(true)}
                sx={{ borderRadius: 6, px: 4 }}
              >
                Complete this review
              </Button>
            </Box>
          )}

          {isComplete && (
            <Box textAlign="center" pb={4}>
              <Typography variant="body2" color="success.main" fontWeight={600}>
                ✅ This review is complete
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
