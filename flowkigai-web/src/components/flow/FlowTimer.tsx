import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Tooltip, Stack,
} from "@mui/material";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useFlowTimerStore } from "@/stores/flowTimerStore";
import { flowSessionApi } from "@/api/flowSessionApi";
import { musicApi, type FocusTrackDto } from "@/api/musicApi";

const RING_R = 120;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

function fillNoise(data: Float32Array, type: "white" | "brown" | "nature") {
  if (type === "white" || type === "nature") {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } else {
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
}

export default function FlowTimer() {
  const { phase, elapsed, session, setup, tick, pause, resume, beginMicroReview, reset } = useFlowTimerStore();
  const [interruptOpen, setInterruptOpen] = useState(false);
  const [interruptReason, setInterruptReason] = useState("");
  const [interrupting, setInterrupting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Ambient noise (Web Audio API) ──────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // ── Focus music (HTML audio element) ──────────────────────────────────────
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<FocusTrackDto[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [musicMuted, setMusicMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<FocusTrackDto | null>(null);

  // Tick every second while running
  useEffect(() => {
    if (phase === "running") {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, tick]);

  // Fetch music playlist once on mount
  useEffect(() => {
    musicApi.getFocusTracks().then((t) => {
      setTracks(t);
      setTrackIndex(0);
    }).catch(() => { /* music is optional, fail silently */ });
  }, []);

  // Play current track when phase/index/mute changes
  const playTrack = useCallback((list: FocusTrackDto[], idx: number, muted: boolean) => {
    const el = audioElRef.current;
    if (!el || list.length === 0) return;
    const track = list[idx % list.length];
    if (el.src !== track.audioUrl) {
      el.src = track.audioUrl;
      setCurrentTrack(track);
    }
    el.volume = muted ? 0 : 0.55;
    if (phase === "running") {
      el.play().catch(() => { /* autoplay policy — user must interact first */ });
    } else {
      el.pause();
    }
  }, [phase]);

  useEffect(() => {
    playTrack(tracks, trackIndex, musicMuted);
  }, [tracks, trackIndex, musicMuted, playTrack]);

  function skipTrack() {
    setTrackIndex((i) => (i + 1) % (tracks.length || 1));
  }

  // Ambient sound: play while running, stop while paused
  useEffect(() => {
    const sound = setup?.ambientSound ?? "None";
    if (sound === "None" || phase !== "running") {
      sourceRef.current?.stop();
      sourceRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      return;
    }

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const noiseType = sound === "BrownNoise" ? "brown" : sound === "Nature" ? "nature" : "white";
    fillNoise(data, noiseType);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.25;

    if (sound === "Nature") {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 0.5;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }
    gain.connect(ctx.destination);
    source.start();
    sourceRef.current = source;

    return () => {
      source.stop();
      ctx.close();
      sourceRef.current = null;
      audioCtxRef.current = null;
    };
  }, [phase, setup?.ambientSound]);

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
      {/* Hidden audio element for music */}
      <audio
        ref={audioElRef}
        onEnded={skipTrack}
        style={{ display: "none" }}
      />

      {/* SVG progress ring */}
      <Box sx={{ position: "relative", width: 300, height: 300 }}>
        <svg width={300} height={300} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={150} cy={150} r={RING_R}
            fill="none" stroke="currentColor" strokeWidth={10}
            style={{ color: "var(--border)", opacity: 0.3 }} />
          <circle cx={150} cy={150} r={RING_R}
            fill="none" stroke="#0D6E6E" strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s linear" }} />
        </svg>

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
        <Button variant="outlined" size="large" onClick={isPaused ? resume : pause}
          sx={{ borderRadius: 6, minWidth: 120 }}>
          {isPaused ? "Resume" : "Pause"}
        </Button>
        <Button variant="contained" size="large" onClick={beginMicroReview}
          sx={{ borderRadius: 6, minWidth: 140 }}>
          End session
        </Button>
        <Button variant="text" size="large" color="error" onClick={() => setInterruptOpen(true)}
          sx={{ borderRadius: 6 }}>
          Interrupt
        </Button>
      </Box>

      {/* Now-playing strip — only shown when tracks are loaded */}
      {tracks.length > 0 && (
        <Box sx={{
          position: "fixed", bottom: 24,
          display: "flex", alignItems: "center", gap: 1.5,
          bgcolor: "background.paper",
          border: 1, borderColor: "divider",
          borderRadius: 4, px: 2, py: 1,
          maxWidth: 380, width: "90%",
          boxShadow: 2,
        }}>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.2 }}>
              {musicMuted ? "Music muted" : "Now playing"}
            </Typography>
            {currentTrack && (
              <Typography variant="body2" fontWeight={600} noWrap>
                {currentTrack.name}
              </Typography>
            )}
            {currentTrack && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {currentTrack.artistName} · CC licensed
              </Typography>
            )}
          </Stack>
          <Tooltip title={musicMuted ? "Unmute music" : "Mute music"}>
            <IconButton size="small" onClick={() => setMusicMuted((m) => !m)}>
              {musicMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Skip track">
            <IconButton size="small" onClick={skipTrack}>
              <SkipNextIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

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
