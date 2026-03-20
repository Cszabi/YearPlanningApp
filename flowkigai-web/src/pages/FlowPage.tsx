import { useEffect } from "react";
import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useFlowTimerStore } from "@/stores/flowTimerStore";
import { flowSessionApi } from "@/api/flowSessionApi";
import PreSessionSetup from "@/components/flow/PreSessionSetup";
import FlowTimer from "@/components/flow/FlowTimer";
import MicroReview from "@/components/flow/MicroReview";
import SessionComplete from "@/components/flow/SessionComplete";
import { useState } from "react";

export default function FlowPage() {
  usePageAnalytics("/flow");
  const { phase, startSetup, restoreRunning, reset } = useFlowTimerStore();
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState(false);

  // On mount: sync store with DB session state
  useEffect(() => {
    let cancelled = false;
    async function checkActive() {
      try {
        const active = await flowSessionApi.getActive();
        if (!cancelled) {
          if (active && phase === "idle") {
            // Resume a session that was started in another tab or before a navigation
            const elapsedSec = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
            restoreRunning(active, elapsedSec);
          } else if (!active && (phase === "running" || phase === "paused" || phase === "microreview")) {
            // Session is gone from DB (ended elsewhere) but store is stale — reset
            reset();
          }
        }
      } catch {
        if (!cancelled) setCheckError(true);
      }
      if (!cancelled) setChecking(false);
    }
    checkActive();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── State machine routing ────────────────────────────────────────────────

  if (phase === "setup")       return <PreSessionSetup />;
  if (phase === "running" || phase === "paused") return <FlowTimer />;
  if (phase === "microreview") return <MicroReview />;
  if (phase === "complete")    return <SessionComplete />;

  // ── Idle state: landing screen ───────────────────────────────────────────
  return (
    <Box sx={{
      height: "100%", bgcolor: "background.default",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      px: 4, textAlign: "center",
    }}>
      {checkError && (
        <Alert severity="warning" sx={{ mb: 3, maxWidth: 400 }}>
          Could not check for an active session. You can still start a new one.
        </Alert>
      )}
      <Typography variant="h1" mb={2} sx={{ fontSize: "3rem" }}>🌊</Typography>
      <Typography variant="h5" fontWeight={700} mb={1}>Flow sessions</Typography>
      <Typography variant="body1" color="text.secondary" mb={1} sx={{ maxWidth: 400 }}>
        Dedicated, distraction-free blocks of deep work.
      </Typography>
      <Typography variant="body2" color="text.disabled" mb={4} sx={{ maxWidth: 400 }}>
        Start a session, link it to a goal, and review how it went afterwards.
      </Typography>
      <Button variant="contained" size="large" onClick={startSetup} sx={{ borderRadius: 6, px: 4 }}>
        Start a session →
      </Button>
    </Box>
  );
}
