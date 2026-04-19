import { useState } from "react";
import {
  Box, Typography, Button, Stack, Slider, TextField, CircularProgress,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useFlowTimerStore } from "@/stores/flowTimerStore";
import { flowSessionApi } from "@/api/flowSessionApi";

const OUTCOMES = [
  { value: "Fully",      label: "Fully ✅",       desc: "I got into the zone" },
  { value: "Partially",  label: "Partially 🟡",   desc: "Some focus, some drift" },
  { value: "NotReally",  label: "Not really ❌",  desc: "Hard to concentrate" },
];

const QUALITY_LABELS = ["Scattered", "Distracted", "Focused", "Deep", "In the zone"];
const ENERGY_LABELS  = ["Drained", "Low", "Neutral", "Good", "Energised"];

export default function MicroReview() {
  const queryClient = useQueryClient();
  const { session, elapsed, complete } = useFlowTimerStore();
  const [outcome,  setOutcome]  = useState<string | null>(null);
  const [quality,  setQuality]  = useState(3);
  const [energy,   setEnergy]   = useState(3);
  const [blockers, setBlockers] = useState("");
  const [saving,   setSaving]   = useState(false);

  async function handleSave() {
    if (!session || !outcome || saving) return;
    setSaving(true);
    try {
      const saved = await flowSessionApi.complete(session.id, {
        outcome,
        flowQualityRating: quality,
        energyAfterRating: energy,
        blockers: blockers.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      complete(saved);
    } catch {
      setSaving(false);
    }
  }

  const mins = Math.floor(elapsed / 60);

  return (
    <Box sx={{
      height: "100%", overflow: "auto", bgcolor: "background.default",
      display: "flex", flexDirection: "column", alignItems: "center",
      px: 3, py: 5,
    }}>
      <Box sx={{ width: "100%", maxWidth: 480 }}>
        <Typography variant="h6" fontWeight={700} textAlign="center" mb={0.5}>
          How was that session?
        </Typography>
        <Typography variant="body2" color="text.disabled" textAlign="center" mb={4}>
          {mins} min elapsed
        </Typography>

        {/* Outcome */}
        <Typography variant="caption" color="text.secondary" fontWeight={600}
          sx={{ mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          How did it go?
        </Typography>
        <Stack direction="row" gap={1} mb={4} flexWrap="wrap">
          {OUTCOMES.map((o) => (
            <Button
              key={o.value}
              variant={outcome === o.value ? "contained" : "outlined"}
              size="medium"
              onClick={() => setOutcome(o.value)}
              sx={{ borderRadius: 3, flex: 1, minWidth: 120, flexDirection: "column", py: 1.5 }}
            >
              <Typography variant="body2" fontWeight={600}>{o.label}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>{o.desc}</Typography>
            </Button>
          ))}
        </Stack>

        {/* Flow quality */}
        <Typography variant="caption" color="text.secondary" fontWeight={600}
          sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Flow quality
        </Typography>
        <Typography variant="body2" color="primary.main" fontWeight={600} textAlign="center" mb={1}>
          {QUALITY_LABELS[quality - 1]}
        </Typography>
        <Slider
          value={quality} min={1} max={5} step={1}
          onChange={(_, v) => setQuality(v as number)}
          marks={QUALITY_LABELS.map((_l, i) => ({ value: i + 1, label: "" }))}
          sx={{ mb: 3 }}
        />

        {/* Energy after */}
        <Typography variant="caption" color="text.secondary" fontWeight={600}
          sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Energy now
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={600} textAlign="center" mb={1}>
          {ENERGY_LABELS[energy - 1]}
        </Typography>
        <Slider
          value={energy} min={1} max={5} step={1}
          onChange={(_, v) => setEnergy(v as number)}
          sx={{ mb: 3 }}
        />

        {/* Blockers */}
        <TextField
          fullWidth label="Any blockers or notes? (optional)"
          value={blockers} onChange={(e) => setBlockers(e.target.value)}
          multiline rows={2} sx={{ mb: 4 }}
        />

        <Button
          variant="contained" size="large" fullWidth
          disabled={!outcome || saving}
          onClick={handleSave}
          sx={{ borderRadius: 6 }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Save & close →"}
        </Button>
      </Box>
    </Box>
  );
}
