import { useState } from "react";
import {
  Box, Button, Typography, Stack, TextField, ToggleButton, ToggleButtonGroup,
  CircularProgress, Paper, Divider, Alert,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { goalApi } from "@/api/goalApi";
import { flowSessionApi } from "@/api/flowSessionApi";
import { useFlowTimerStore, type SetupConfig } from "@/stores/flowTimerStore";

const YEAR = new Date().getFullYear();

const ENERGY_PRESETS: Record<string, number[]> = {
  Deep:    [90, 60, 45],
  Medium:  [45, 30, 25],
  Shallow: [25, 15, 10],
};

const AMBIENT_OPTIONS = [
  { value: "None",        label: "🔇 Silence" },
  { value: "BrownNoise",  label: "🟤 Brown noise" },
  { value: "WhiteNoise",  label: "⚪ White noise" },
  { value: "Nature",      label: "🌿 Nature" },
  { value: "FocusMusic",  label: "🎵 Focus music" },
];

const OVERTIME_OPTIONS = [
  { value: "None",          label: "🔕 Stay silent" },
  { value: "Visual",        label: "🟡 Visual indicator" },
  { value: "VisualAndTone", label: "🔔 Visual + soft tone" },
];

export default function PreSessionSetup() {
  const confirmSetup = useFlowTimerStore((s) => s.confirmSetup);
  const reset = useFlowTimerStore((s) => s.reset);

  const [goalId,      setGoalId]      = useState<string | null>(null);
  const [taskItemId,  setTaskItemId]  = useState<string | null>(null);
  const [intention,   setIntention]   = useState("");
  const [energyLevel, setEnergyLevel] = useState("Medium");
  const [minutes,     setMinutes]     = useState(45);
  const [customVal,   setCustomVal]   = useState("");
  const [customUnit,  setCustomUnit]  = useState<"min" | "hr">("min");
  const [ambient,      setAmbient]      = useState("None");
  const [overTimeMode, setOverTimeMode] = useState<"None" | "Visual" | "VisualAndTone">("None");
  const [starting,     setStarting]    = useState(false);
  const [startError,  setStartError]  = useState(false);

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", YEAR],
    queryFn: () => goalApi.getGoals(YEAR),
  });

  const activeGoals = goals.filter((g) => g.status === "Active");
  const selectedGoal = activeGoals.find((g) => g.id === goalId);
  const availableTasks = selectedGoal?.milestones.flatMap((m) => m.tasks.filter((t) => t.status !== "Done")) ?? [];
  const selectedTask = availableTasks.find((t) => t.id === taskItemId);

  const presets = ENERGY_PRESETS[energyLevel] ?? [45, 30, 25];
  const customValNum = customVal ? parseInt(customVal) : null;
  const customValValid = customValNum === null || customValNum >= 1;
  const customActualMinutes = customValNum === null ? null
    : customUnit === "hr" ? customValNum * 60 : customValNum;
  const actualMinutes = customActualMinutes ?? minutes;

  async function handleBegin() {
    if (starting) return;
    setStarting(true);
    try {
      const session = await flowSessionApi.start({
        goalId:           goalId ?? undefined,
        taskItemId:       taskItemId ?? undefined,
        sessionIntention: intention.trim() || undefined,
        plannedMinutes:   actualMinutes,
        energyLevel,
        ambientSound:     ambient,
      });
      const config: SetupConfig = {
        goalId, taskItemId,
        goalTitle:        selectedGoal?.title ?? "",
        taskTitle:        selectedTask?.title ?? "",
        sessionIntention: intention.trim(),
        plannedMinutes:   actualMinutes,
        energyLevel, ambientSound: ambient, overTimeMode,
      };
      confirmSetup(config, session);
    } catch {
      setStarting(false);
      setStartError(true);
    }
  }

  return (
    <Box sx={{
      height: "100%", overflow: "auto", bgcolor: "background.default",
      display: "flex", flexDirection: "column", alignItems: "center",
      px: 3, py: 4,
    }}>
      <Box sx={{ width: "100%", maxWidth: 520 }}>
        <Typography variant="h6" fontWeight={700} mb={0.5}>Set up your session</Typography>
        <Typography variant="body2" color="text.disabled" mb={3}>
          Choose what you'll work on, then begin.
        </Typography>

        {startError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStartError(false)}>
            Failed to start session. Please try again.
          </Alert>
        )}

        {/* Goal selector */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Goal (optional)
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
          <Paper
            variant="outlined"
            onClick={() => { setGoalId(null); setTaskItemId(null); }}
            sx={{ px: 1.5, py: 0.75, cursor: "pointer", borderRadius: 2, borderColor: !goalId ? "primary.main" : "divider", bgcolor: !goalId ? "primary.main" + "12" : "transparent" }}
          >
            <Typography variant="body2">Free session</Typography>
          </Paper>
          {activeGoals.map((g) => (
            <Paper
              key={g.id}
              variant="outlined"
              onClick={() => { setGoalId(g.id); setTaskItemId(null); }}
              sx={{ px: 1.5, py: 0.75, cursor: "pointer", borderRadius: 2, borderColor: goalId === g.id ? "primary.main" : "divider", bgcolor: goalId === g.id ? "primary.main" + "12" : "transparent" }}
            >
              <Typography variant="body2">{g.title}</Typography>
            </Paper>
          ))}
        </Stack>

        {/* Task selector */}
        {selectedGoal && availableTasks.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Task (optional)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
              {availableTasks.map((t) => (
                <Paper
                  key={t.id}
                  variant="outlined"
                  onClick={() => setTaskItemId(t.id)}
                  sx={{ px: 1.5, py: 0.75, cursor: "pointer", borderRadius: 2, borderColor: taskItemId === t.id ? "primary.main" : "divider", bgcolor: taskItemId === t.id ? "primary.main" + "12" : "transparent" }}
                >
                  <Typography variant="body2">{t.isNextAction ? "⚡ " : ""}{t.title}</Typography>
                </Paper>
              ))}
            </Stack>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Energy level */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Energy level
        </Typography>
        <ToggleButtonGroup value={energyLevel} exclusive size="small"
          onChange={(_, v) => { if (v) { setEnergyLevel(v); setMinutes(ENERGY_PRESETS[v]?.[0] ?? 45); setCustomVal(""); } }}
          sx={{ mb: 2 }}>
          <ToggleButton value="Deep">🔵 Deep</ToggleButton>
          <ToggleButton value="Medium">🟡 Medium</ToggleButton>
          <ToggleButton value="Shallow">⚪ Shallow</ToggleButton>
        </ToggleButtonGroup>

        {/* Duration */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Duration
        </Typography>
        <Stack direction="row" gap={1} mb={2} alignItems="flex-start" flexWrap="wrap">
          {presets.map((p) => (
            <Button key={p} size="small" variant={minutes === p && !customVal ? "contained" : "outlined"}
              onClick={() => { setMinutes(p); setCustomVal(""); }} sx={{ borderRadius: 3 }}>
              {p}m
            </Button>
          ))}
          <Stack direction="row" gap={0.5} alignItems="flex-start">
            <TextField
              size="small" placeholder="Custom" value={customVal}
              onChange={(e) => setCustomVal(e.target.value.replace(/\D/, ""))}
              inputProps={{ min: 1, style: { width: 64 } }}
              error={!!customVal && !customValValid}
              helperText={!!customVal && !customValValid ? "Min. 1" : undefined}
              sx={{ "& input": { textAlign: "center" } }}
            />
            <ToggleButtonGroup
              value={customUnit} exclusive size="small"
              onChange={(_, v) => { if (v) setCustomUnit(v); }}
              sx={{ height: 40 }}
            >
              <ToggleButton value="min" sx={{ px: 1.5 }}>min</ToggleButton>
              <ToggleButton value="hr" sx={{ px: 1.5 }}>hr</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {/* Sounds */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Sounds
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
          {AMBIENT_OPTIONS.map((o) => (
            <Button key={o.value} size="small"
              variant={ambient === o.value ? "contained" : "outlined"}
              onClick={() => setAmbient(o.value)} sx={{ borderRadius: 3 }}>
              {o.label}
            </Button>
          ))}
        </Stack>

        {/* Over-time behaviour */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          When I go over time
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
          {OVERTIME_OPTIONS.map((o) => (
            <Button key={o.value} size="small"
              variant={overTimeMode === o.value ? "contained" : "outlined"}
              onClick={() => setOverTimeMode(o.value as typeof overTimeMode)}
              sx={{ borderRadius: 3 }}>
              {o.label}
            </Button>
          ))}
        </Stack>

        {/* Intention */}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Session intention
        </Typography>
        <TextField
          fullWidth multiline rows={2}
          placeholder="What does a successful session look like?"
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          sx={{ mb: 3 }}
        />

        {/* Actions */}
        <Stack direction="row" gap={2}>
          <Button variant="contained" size="large" onClick={handleBegin} disabled={starting || !customValValid}
            sx={{ borderRadius: 6, flex: 1 }}>
            {starting ? <CircularProgress size={20} color="inherit" /> : "Begin session →"}
          </Button>
          <Button variant="outlined" size="large" onClick={reset} sx={{ borderRadius: 6 }}>
            Cancel
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
