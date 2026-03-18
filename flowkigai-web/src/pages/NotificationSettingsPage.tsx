import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box, Typography, Paper, Stack, Switch, FormControlLabel,
  Select, MenuItem, Chip, Button, Alert, CircularProgress, Divider,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import notificationApi, { type NotificationPreferenceDto } from "@/api/notificationApi";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DEADLINE_OPTIONS = [1, 3, 7, 14, 30];

function formatHour(h: number) {
  return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
}

function parseDaysList(json: string): number[] {
  try { return JSON.parse(json); } catch { return [1, 3, 7]; }
}

export default function NotificationSettingsPage() {
  const qc = useQueryClient();
  const { isPushSupported, isPushEnabled, subscribeToPush, unsubscribeFromPush } =
    usePushNotifications();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: notificationApi.getPreferences,
  });

  const [form, setForm] = useState<NotificationPreferenceDto | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: notificationApi.savePreferences,
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !form) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load notification preferences.</Alert>
      </Box>
    );
  }

  const daysBefore = parseDaysList(form.goalDeadlineDaysBeforeList);

  const toggleDay = (d: number) => {
    const next = daysBefore.includes(d)
      ? daysBefore.filter((x) => x !== d)
      : [...daysBefore, d].sort((a, b) => a - b);
    if (next.length === 0) return; // at least one required
    setForm((f) => f && { ...f, goalDeadlineDaysBeforeList: JSON.stringify(next) });
  };

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSave = () => {
    saveMutation.mutate({ ...form, timezoneId: timezone });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <NotificationsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Notification Settings</Typography>
      </Stack>

      {/* ── Push master toggle ─────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography fontWeight={600}>Push notifications</Typography>
            <Typography variant="body2" color="text.secondary">
              {!isPushSupported
                ? "Not supported in this browser"
                : isPushEnabled
                ? "Active on this device"
                : "Not enabled"}
            </Typography>
          </Box>
          {isPushSupported && (
            <Switch
              checked={isPushEnabled}
              onChange={() =>
                isPushEnabled ? unsubscribeFromPush() : subscribeToPush()
              }
            />
          )}
        </Stack>
      </Paper>

      {/* ── Weekly review ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={form.weeklyReviewEnabled}
              onChange={(e) =>
                setForm((f) => f && { ...f, weeklyReviewEnabled: e.target.checked })
              }
            />
          }
          label={<Typography fontWeight={600}>Weekly review reminder</Typography>}
          labelPlacement="start"
          sx={{ justifyContent: "space-between", ml: 0, width: "100%", mb: 2 }}
        />
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" mb={1}>
          Remind me on
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.75} mb={2}>
          {DAY_LABELS.map((label, idx) => (
            <Chip
              key={idx}
              label={label}
              size="small"
              onClick={() =>
                setForm((f) => f && { ...f, weeklyReviewDayOfWeek: idx })
              }
              color={form.weeklyReviewDayOfWeek === idx ? "primary" : "default"}
              variant={form.weeklyReviewDayOfWeek === idx ? "filled" : "outlined"}
            />
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={0.75}>
          At
        </Typography>
        <Select
          size="small"
          value={form.weeklyReviewHour}
          onChange={(e) =>
            setForm((f) => f && { ...f, weeklyReviewHour: Number(e.target.value) })
          }
          sx={{ minWidth: 120 }}
        >
          {HOURS.map((h) => (
            <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>
          ))}
        </Select>
      </Paper>

      {/* ── Goal deadlines ────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={form.goalDeadlineEnabled}
              onChange={(e) =>
                setForm((f) => f && { ...f, goalDeadlineEnabled: e.target.checked })
              }
            />
          }
          label={<Typography fontWeight={600}>Goal deadline reminders</Typography>}
          labelPlacement="start"
          sx={{ justifyContent: "space-between", ml: 0, width: "100%", mb: 2 }}
        />
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" mb={1}>
          Remind me when a deadline is
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {DEADLINE_OPTIONS.map((d) => (
            <Chip
              key={d}
              label={d === 1 ? "1 day" : `${d} days`}
              size="small"
              onClick={() => toggleDay(d)}
              color={daysBefore.includes(d) ? "primary" : "default"}
              variant={daysBefore.includes(d) ? "filled" : "outlined"}
            />
          ))}
        </Stack>
      </Paper>

      {/* ── Habit streaks ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={form.habitStreakRiskEnabled}
              onChange={(e) =>
                setForm((f) => f && { ...f, habitStreakRiskEnabled: e.target.checked })
              }
            />
          }
          label={<Typography fontWeight={600}>Habit streak reminders</Typography>}
          labelPlacement="start"
          sx={{ justifyContent: "space-between", ml: 0, width: "100%", mb: 2 }}
        />
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" mb={0.75}>
          Remind me at
        </Typography>
        <Select
          size="small"
          value={form.habitStreakRiskHour}
          onChange={(e) =>
            setForm((f) => f && { ...f, habitStreakRiskHour: Number(e.target.value) })
          }
          sx={{ minWidth: 120 }}
        >
          {HOURS.map((h) => (
            <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>
          ))}
        </Select>
      </Paper>

      {/* ── Timezone (read-only) ───────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">Timezone</Typography>
        <Typography fontWeight={500}>{timezone}</Typography>
      </Paper>

      {/* ── Save ──────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          Save preferences
        </Button>
        {saved && (
          <Typography variant="body2" color="success.main" fontWeight={500}>
            Saved ✓
          </Typography>
        )}
        {saveMutation.isError && (
          <Typography variant="body2" color="error">
            Failed to save.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
