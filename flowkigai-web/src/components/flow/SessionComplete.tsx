import { Box, Typography, Button, Stack, Paper } from "@mui/material";
import { useFlowTimerStore } from "@/stores/flowTimerStore";

const OUTCOME_LABEL: Record<string, string> = {
  Fully: "Fully ✅", Partially: "Partially 🟡", NotReally: "Not really ❌",
};

const QUALITY_LABEL = ["", "Scattered", "Distracted", "Focused", "Deep", "In the zone"];

export default function SessionComplete() {
  const { completedSession, setup, startSetup, reset } = useFlowTimerStore();

  if (!completedSession) return null;

  const actual = completedSession.actualMinutes ?? 0;

  return (
    <Box sx={{
      height: "100%", bgcolor: "background.default",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      px: 3,
    }}>
      <Box sx={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <Typography variant="h2" mb={2}>✨</Typography>
        <Typography variant="h6" fontWeight={700} mb={1}>Session complete</Typography>
        {setup?.goalTitle && (
          <Typography variant="body2" color="text.disabled" mb={3}>{setup.goalTitle}</Typography>
        )}

        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, mb: 4 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.disabled">Duration</Typography>
              <Typography variant="body2" fontWeight={600}>{actual} min</Typography>
            </Stack>
            {completedSession.outcome && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.disabled">Outcome</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {OUTCOME_LABEL[completedSession.outcome] ?? completedSession.outcome}
                </Typography>
              </Stack>
            )}
            {completedSession.flowQualityRating && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.disabled">Flow quality</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {QUALITY_LABEL[completedSession.flowQualityRating]}
                </Typography>
              </Stack>
            )}
            {completedSession.energyAfterRating && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.disabled">Energy after</Typography>
                <Typography variant="body2" fontWeight={600}>{completedSession.energyAfterRating}/5</Typography>
              </Stack>
            )}
          </Stack>
        </Paper>

        <Stack direction="row" gap={2}>
          <Button variant="contained" size="large" onClick={startSetup} sx={{ borderRadius: 6, flex: 1 }}>
            Start another →
          </Button>
          <Button variant="outlined" size="large" onClick={reset} sx={{ borderRadius: 6 }}>
            Done
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
