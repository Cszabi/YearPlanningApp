import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box, Typography, IconButton, Chip, CircularProgress,
  Paper, Stack, Divider, Tooltip, Button,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon from "@mui/icons-material/Download";
import { goalApi, type GoalDto } from "@/api/goalApi";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventKind = "goal" | "milestone" | "task";

interface CalEvent {
  id: string;
  kind: EventKind;
  date: string;         // "YYYY-MM-DD"
  title: string;
  goalTitle: string;
  lifeArea: string;
  isDone: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const YEAR = new Date().getFullYear();
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const LIFE_AREA_COLOR: Record<string, string> = {
  CareerWork: "#0EA5E9",
  HealthBody: "#10B981",
  RelationshipsFamily: "#F43F5E",
  LearningGrowth: "#8B5CF6",
  Finance: "#F59E0B",
  CreativityHobbies: "#F97316",
  EnvironmentLifestyle: "#06B6D4",
  ContributionPurpose: "#6366F1",
};

const KIND_LABEL: Record<EventKind, string> = {
  goal: "Goal deadline",
  milestone: "Milestone",
  task: "Task due",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function todayKey(): string {
  return toDateKey(new Date().toISOString());
}

function extractEvents(goals: GoalDto[]): CalEvent[] {
  const events: CalEvent[] = [];
  for (const goal of goals) {
    if (goal.targetDate) {
      events.push({
        id: `goal-${goal.id}`,
        kind: "goal",
        date: toDateKey(goal.targetDate),
        title: goal.title,
        goalTitle: goal.title,
        lifeArea: goal.lifeArea,
        isDone: goal.status === "Achieved",
      });
    }
    for (const ms of goal.milestones) {
      if (ms.targetDate) {
        events.push({
          id: `ms-${ms.id}`,
          kind: "milestone",
          date: toDateKey(ms.targetDate),
          title: ms.title,
          goalTitle: goal.title,
          lifeArea: goal.lifeArea,
          isDone: ms.isComplete,
        });
      }
      for (const task of ms.tasks) {
        if (task.dueDate) {
          events.push({
            id: `task-${task.id}`,
            kind: "task",
            date: toDateKey(task.dueDate),
            title: task.title,
            goalTitle: goal.title,
            lifeArea: goal.lifeArea,
            isDone: task.status === "Done",
          });
        }
      }
    }
  }
  return events;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ── Event dot ─────────────────────────────────────────────────────────────────

function EventDot({ event }: { event: CalEvent }) {
  const color = LIFE_AREA_COLOR[event.lifeArea] ?? "#0D6E6E";
  // goal = square, milestone = rounded rect, task = circle
  const borderRadius = event.kind === "goal" ? "3px" : event.kind === "milestone" ? "2px" : "50%";
  return (
    <Tooltip title={`${KIND_LABEL[event.kind]}: ${event.title}`} placement="top">
      <Box
        sx={{
          width: 8, height: 8,
          borderRadius,
          bgcolor: event.isDone ? "action.disabled" : color,
          opacity: event.isDone ? 0.45 : 1,
          cursor: "default",
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

// ── Day detail panel ──────────────────────────────────────────────────────────

function DayPanel({ dateKey, events, onClose }: {
  dateKey: string;
  events: CalEvent[];
  onClose: () => void;
}) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });

  const byKind: Record<EventKind, CalEvent[]> = { goal: [], milestone: [], task: [] };
  for (const e of events) byKind[e.kind].push(e);

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden" }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ fontSize: 14 }}>✕</IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {events.length === 0 && (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", pt: 4 }}>
            Nothing scheduled
          </Typography>
        )}
        {(["goal", "milestone", "task"] as EventKind[]).map((kind) => {
          const list = byKind[kind];
          if (!list.length) return null;
          return (
            <Box key={kind} mb={2}>
              <Typography variant="caption" color="text.disabled"
                sx={{ textTransform: "uppercase", letterSpacing: 0.8, display: "block", mb: 1 }}>
                {KIND_LABEL[kind]}
              </Typography>
              <Stack spacing={1}>
                {list.map((e) => {
                  const color = LIFE_AREA_COLOR[e.lifeArea] ?? "#0D6E6E";
                  return (
                    <Box key={e.id} sx={{
                      display: "flex", alignItems: "flex-start", gap: 1.5,
                      p: 1.25, borderRadius: 2,
                      bgcolor: color + "14",
                      opacity: e.isDone ? 0.5 : 1,
                    }}>
                      <Box sx={{ width: 3, borderRadius: 4, bgcolor: color, alignSelf: "stretch", flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}
                          sx={{ textDecoration: e.isDone ? "line-through" : "none" }}>
                          {e.title}
                        </Typography>
                        {kind !== "goal" && (
                          <Typography variant="caption" color="text.disabled">{e.goalTitle}</Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
              <Divider sx={{ mt: 2 }} />
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ── ICS export ────────────────────────────────────────────────────────────────

function toIcsDate(dateKey: string): string {
  // "2026-03-20" → "20260320"
  return dateKey.replace(/-/g, "");
}

function buildIcs(events: CalEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Flowkigai//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    const dt = toIcsDate(e.date);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@flowkigai`,
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${dt}`,
      `SUMMARY:${KIND_LABEL[e.kind]}: ${e.title}`,
      `DESCRIPTION:Goal: ${e.goalTitle}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadIcs(events: CalEvent[]) {
  const content = buildIcs(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flowkigai-${YEAR}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main calendar page ────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const today = todayKey();

  const { data: goals = [], isLoading, isError } = useQuery({
    queryKey: ["goals", YEAR],
    queryFn: () => goalApi.getGoals(YEAR),
  });

  const allEvents = useMemo(() => extractEvents(goals), [goals]);
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of allEvents) {
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [allEvents]);

  const selectedEvents = selected ? (eventsByDate[selected] ?? []) : [];

  // Build calendar grid cells
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstDayOfWeek(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelected(null); }
  function nextMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelected(null); }
  function goToday()   { setViewDate(new Date()); setSelected(today); }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box sx={{
        px: 3, py: 1.5,
        borderBottom: 1, borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      }}>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <IconButton size="small" onClick={prevMonth}><ChevronLeftIcon fontSize="small" /></IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ minWidth: 190, textAlign: "center" }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Typography>
          <IconButton size="small" onClick={nextMonth}><ChevronRightIcon fontSize="small" /></IconButton>
        </Stack>

        <Chip label="Today" size="small" variant="outlined" onClick={goToday}
          sx={{ borderRadius: 2, cursor: "pointer" }} />

        <Box sx={{ flex: 1 }} />

        {/* Export */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={allEvents.length === 0}
          onClick={() => downloadIcs(allEvents)}
          sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem" }}
        >
          Export .ics
        </Button>

        {/* Legend */}
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
          {([
            { label: "Goal", borderRadius: "3px" },
            { label: "Milestone", borderRadius: "2px" },
            { label: "Task", borderRadius: "50%" },
          ] as const).map(({ label, borderRadius }) => (
            <Stack key={label} direction="row" alignItems="center" gap={0.75}>
              <Box sx={{ width: 8, height: 8, borderRadius, bgcolor: "primary.main" }} />
              <Typography variant="caption" color="text.disabled">{label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflow: "hidden", display: "flex" }}>

        {/* Calendar grid */}
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {isError ? (
            <Box sx={{ pt: 6, px: 2 }}>
              <Typography color="error" textAlign="center">Failed to load calendar data.</Typography>
            </Box>
          ) : isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ minWidth: 400 }}>
              {/* Day name headers */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 1 }}>
                {DAY_NAMES.map((d) => (
                  <Typography key={d} variant="caption" color="text.disabled"
                    sx={{ textAlign: "center", py: 0.5, fontWeight: 600, letterSpacing: 0.5 }}>
                    {d}
                  </Typography>
                ))}
              </Box>

              {/* Day cells */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.75 }}>
                {cells.map((day, idx) => {
                  if (day === null) return <Box key={`e-${idx}`} sx={{ minHeight: 72 }} />;

                  const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayEvents = eventsByDate[dateKey] ?? [];
                  const isToday = dateKey === today;
                  const isSelected = dateKey === selected;

                  return (
                    <Paper
                      key={dateKey}
                      variant="outlined"
                      onClick={() => setSelected(isSelected ? null : dateKey)}
                      sx={{
                        minHeight: 72,
                        p: 0.75,
                        cursor: "pointer",
                        borderRadius: 2,
                        borderColor: isSelected ? "primary.main" : isToday ? "primary.light" : "divider",
                        borderWidth: isSelected || isToday ? 2 : 1,
                        bgcolor: isSelected ? "primary.main" + "12" : isToday ? "primary.main" + "06" : "background.paper",
                        transition: "border-color 0.12s, background-color 0.12s",
                        "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                        display: "flex", flexDirection: "column",
                      }}
                    >
                      {/* Day number */}
                      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0.5 }}>
                        <Box sx={{
                          width: 22, height: 22,
                          borderRadius: "50%",
                          bgcolor: isToday ? "primary.main" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Typography variant="caption" fontWeight={isToday ? 700 : 400}
                            sx={{ color: isToday ? "primary.contrastText" : "text.primary", lineHeight: 1, fontSize: "0.75rem" }}>
                            {day}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Event dots */}
                      {dayEvents.length > 0 && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: "auto" }}>
                          {dayEvents.slice(0, 5).map((e) => <EventDot key={e.id} event={e} />)}
                          {dayEvents.length > 5 && (
                            <Typography sx={{ fontSize: "0.6rem", color: "text.disabled", lineHeight: "8px" }}>
                              +{dayEvents.length - 5}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>

        {/* Day detail panel */}
        {selected && (
          <Box sx={{ p: 2, pl: 0 }}>
            <DayPanel dateKey={selected} events={selectedEvents} onClose={() => setSelected(null)} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
