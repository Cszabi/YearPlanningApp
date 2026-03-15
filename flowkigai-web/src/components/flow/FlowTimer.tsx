import { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { useFlowTimerStore } from "@/stores/flowTimerStore";
import { flowSessionApi } from "@/api/flowSessionApi";

const RING_R = 120;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export default function FlowTimer() {
  const { phase, elapsed, session, setup, tick, pause, resume, beginMicroReview, reset } = useFlowTimerStore();
  const [interruptOpen, setInterruptOpen] = useState(false);
  const [interruptReason, setInterruptReason] = useState("");
  const [interrupting, setInterrupting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second while running
  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, tick]);

  const planned = (setup?.plannedMinutes ?? 45) * 60;
  const progress = Math.min(elapsed / planned, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeLabel = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  async function handleInterruptConfirm() {
    if (!session || interrupting) return;
    setInterrupting(true);
    try {
      await flowSessionApi.interrupt(session.id, interruptReason.trim() || "—");
    } catch { /* silent */ }
    setInterruptOpen(false);
    reset();
  }

  const isPaused = phase === "paused";

  return (
    <Box
      sx={{
        position: "fixed", inset: 0, zIndex: 1200,
        bgcolor: "background.default",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 3,
      }}
    >
      {/* SVG progress ring — shows elapsed, not countdown */}
      <Box sx={{ position: "relative", width: 300, height: 300 }}>
        <svg width={300} height={300} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx={150} cy={150} r={RING_R}
            fill="none" stroke="currentColor" strokeWidth={10}
            style={{ color: "var(--border)", opacity: 0.3 }} />
          {/* Progress */}
          <circle cx={150} cy={150} r={RING_R}
            fill="none" stroke="#0D6E6E" strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s linear" }} />
        </svg>

        {/* Center content */}
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h3" fontWeight={700} fontFamily="monospace">
            {timeLabel}
          </Typography>
          {isPaused && (
            <Typography variant="caption" color="text.disabled" sx={{ letterSpacing: 2, textTransform: "uppercase" }}>
              Paused
            </Typography>
          )}
        </Box>
      </Box>

      {/* Task / intention label */}
      {(setup?.taskTitle || setup?.goalTitle) && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 400 }}>
          {setup.taskTitle || setup.goalTitle}
        </Typography>
      )}
      {setup?.sessionIntention && (
        <Typography variant="body2" color="text.disabled"
          sx={{ textAlign: "center", maxWidth: 480, fontStyle: "italic", opacity: 0.6 }}>
          "{setup.sessionIntention}"
        </Typography>
      )}

      {/* Controls */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="outlined"
          size="large"
          onClick={isPaused ? resume : pause}
          sx={{ borderRadius: 6, minWidth: 120 }}
        >
          {isPaused ? "Resume" : "Pause"}
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={beginMicroReview}
          sx={{ borderRadius: 6, minWidth: 140 }}
        >
          End session
        </Button>
        <Button
          variant="text"
          size="large"
          color="error"
          onClick={() => setInterruptOpen(true)}
          sx={{ borderRadius: 6 }}
        >
          Interrupt
        </Button>
      </Box>

      {/* Interrupt dialog */}
      <Dialog open={interruptOpen} onClose={() => setInterruptOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record interruption</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="What interrupted you?" value={interruptReason}
            onChange={(e) => setInterruptReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInterruptOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleInterruptConfirm} disabled={interrupting}>
            {interrupting ? "Saving…" : "End & record"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
