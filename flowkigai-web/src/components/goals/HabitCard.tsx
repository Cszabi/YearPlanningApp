import { useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import {
  Box, Card, CardContent, Chip, Typography, Stack, Button, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Switch, FormControlLabel,
} from "@mui/material";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useQueryClient } from "@tanstack/react-query";
import { habitApi, type HabitDto } from "@/api/habitApi";

const YEAR = new Date().getFullYear();

const FREQ_LABEL: Record<string, string> = {
  Daily: "Daily", Weekly: "Weekly", Monthly: "Monthly", Custom: "Custom",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

interface Props {
  habit: HabitDto;
}

export default function HabitCard({ habit }: Props) {
  const queryClient = useQueryClient();
  const [logging, setLogging] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [localStreak, setLocalStreak] = useState(habit.currentStreak);
  const [loggedToday, setLoggedToday] = useState(() => {
    const today = todayKey();
    return habit.recentLogs.some((l) => l.loggedDate.slice(0, 10) === today);
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editNotifOpen, setEditNotifOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(habit.notificationEnabled);
  const [notifTime, setNotifTime] = useState<Dayjs>(
    dayjs().hour(habit.reminderHour ?? 8).minute(habit.reminderMinute ?? 0).second(0)
  );
  const [savingNotif, setSavingNotif] = useState(false);

  const days = last7Days();
  const loggedDates = new Set(habit.recentLogs.map((l) => l.loggedDate.slice(0, 10)));

  async function handleLog() {
    if (loggedToday || logging) return;
    setLogging(true);
    try {
      await habitApi.logHabit(habit.id);
      setLoggedToday(true);
      setLocalStreak((s) => s + 1);
      setCelebrated(true);
      setTimeout(() => setCelebrated(false), 1800);
      queryClient.invalidateQueries({ queryKey: ["habits", YEAR] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      // silent
    } finally {
      setLogging(false);
    }
  }

  async function handleSaveNotif() {
    setSavingNotif(true);
    try {
      await habitApi.updateNotification(
        habit.id, notifEnabled,
        notifEnabled ? notifTime.hour() : null,
        notifEnabled ? notifTime.minute() : null,
      );
      queryClient.invalidateQueries({ queryKey: ["habits", YEAR] });
      setEditNotifOpen(false);
    } catch {
      // silent
    } finally {
      setSavingNotif(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await habitApi.deleteHabit(habit.id);
      setDeleteConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["habits", YEAR] });
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      // silent — leave dialog open so user can retry
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        transition: "transform 0.2s, box-shadow 0.2s",
        ...(celebrated && {
          transform: "scale(1.02)",
          boxShadow: "0 0 0 3px #10B98188",
        }),
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} mb={0.5}>
          <Typography variant="body1" fontWeight={600} sx={{ flex: 1, lineHeight: 1.4 }}>
            {habit.title}
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <LocalFireDepartmentIcon sx={{ fontSize: 16, color: localStreak > 0 ? "#F97316" : "text.disabled" }} />
            <Typography variant="body2" fontWeight={700}
              sx={{ color: localStreak > 0 ? "#F97316" : "text.disabled" }}>
              {localStreak}
            </Typography>
          </Stack>
        </Stack>

        {/* Subtitle */}
        {habit.minimumViableDose && (
          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mb: 1 }}>
            {habit.minimumViableDose}
          </Typography>
        )}

        {/* Frequency chip */}
        <Stack direction="row" gap={0.75} mb={1.5} flexWrap="wrap" alignItems="center">
          <Chip label={FREQ_LABEL[habit.frequency] ?? habit.frequency} size="small" variant="outlined" />
          {loggedToday && (
            <Chip label="Done today ✓" size="small"
              sx={{ bgcolor: "success.light", color: "success.dark", fontWeight: 600 }} />
          )}
          {habit.notificationEnabled ? (
            <Chip
              size="small"
              icon={<NotificationsIcon />}
              label={`${String(habit.reminderHour).padStart(2, "0")}:${String(habit.reminderMinute ?? 0).padStart(2, "0")}`}
              variant="outlined"
              sx={{ fontSize: "0.7rem" }}
              onClick={() => setEditNotifOpen(true)}
            />
          ) : (
            <Tooltip title="Set reminder">
              <IconButton size="small" onClick={() => setEditNotifOpen(true)}>
                <NotificationsOffIcon fontSize="small" sx={{ opacity: 0.3 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* 7-day history */}
        <Stack direction="row" gap={0.75} mb={2} alignItems="center">
          {days.map((d) => {
            const done = loggedDates.has(d) || (d === todayKey() && loggedToday);
            const dayLabel = new Date(d).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1);
            return (
              <Tooltip key={d} title={new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: "50%",
                    bgcolor: done ? "#10B981" : "action.disabled",
                    opacity: done ? 1 : 0.4,
                    transition: "background-color 0.3s",
                  }} />
                  <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "text.faint" }}>{dayLabel}</Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Stack>

        {/* Log today button */}
        <Button
          variant={loggedToday ? "outlined" : "contained"}
          size="small"
          fullWidth
          disabled={loggedToday || logging}
          onClick={handleLog}
          sx={{ borderRadius: 3 }}
        >
          {logging ? "Logging…" : loggedToday ? "Logged ✓" : "Log today"}
        </Button>

        {/* Celebration ritual */}
        {celebrated && habit.celebrationRitual && (
          <Typography
            variant="caption"
            sx={{
              display: "block", textAlign: "center", mt: 1,
              color: "#10B981", fontStyle: "italic",
              animation: "fadeIn 0.3s ease-in",
            }}
          >
            🎉 {habit.celebrationRitual}
          </Typography>
        )}

        {/* Bottom row: delete */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <Tooltip title="Delete habit">
            <IconButton size="small" onClick={() => setDeleteConfirmOpen(true)}
              sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete habit?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{habit.title}</strong> and all its logs will be permanently removed. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit" disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} disabled={deleting} color="error" variant="contained">
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification edit dialog */}
      <Dialog open={editNotifOpen} onClose={() => setEditNotifOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Habit Reminder</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={notifEnabled}
                onChange={e => setNotifEnabled(e.target.checked)}
              />
            }
            label="Enable reminder"
          />
          {notifEnabled && (
            <Box mt={2}>
              <TimePicker
                label="Reminder time"
                value={notifTime}
                onChange={v => v && setNotifTime(v)}
                ampm={false}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNotifOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSaveNotif} disabled={savingNotif} variant="contained">
            {savingNotif ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
