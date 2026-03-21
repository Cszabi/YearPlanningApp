import { useState, useRef } from "react";
import {
  Box, Card, CardContent, Chip, Typography,
  Stack, Divider, IconButton, Checkbox, Tooltip, Collapse,
  Menu, MenuItem, TextField, Button, CircularProgress, Snackbar, Alert,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BoltIcon from "@mui/icons-material/Bolt";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { goalApi, type GoalDto, type MilestoneDto } from "@/api/goalApi";
import GoalProgressBar from "./GoalProgressBar";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// ── Constants ─────────────────────────────────────────────────────────────────

const LIFE_AREA_LABELS: Record<string, string> = {
  CareerWork: "Career & Work",         HealthBody: "Health & Body",
  RelationshipsFamily: "Relationships", LearningGrowth: "Learning & Growth",
  Finance: "Finance",                   CreativityHobbies: "Creativity",
  EnvironmentLifestyle: "Environment",  ContributionPurpose: "Contribution",
};

const LIFE_AREA_EMOJIS: Record<string, string> = {
  CareerWork: "💼",          HealthBody: "💪",
  RelationshipsFamily: "❤️", LearningGrowth: "📚",
  Finance: "💰",             CreativityHobbies: "🎨",
  EnvironmentLifestyle: "🌿", ContributionPurpose: "🌍",
};

const LIFE_AREA_COLORS: Record<string, string> = {
  CareerWork: "#0EA5E9",        HealthBody: "#10B981",
  RelationshipsFamily: "#F43F5E", LearningGrowth: "#8B5CF6",
  Finance: "#F59E0B",           CreativityHobbies: "#F97316",
  EnvironmentLifestyle: "#06B6D4", ContributionPurpose: "#6366F1",
};

const ENERGY_COLOR: Record<string, "primary" | "warning" | "default"> = {
  Deep: "primary", Medium: "warning", Shallow: "default",
};

const YEAR = new Date().getFullYear();
const UNDO_DELAY = 5000;

// ── Inline add-task form (requires an existing milestone) ────────────────────

interface AddTaskFormProps {
  goalId: string;
  milestone: MilestoneDto;
  onDone: () => void;
}

function AddTaskForm({ goalId, milestone, onDone }: AddTaskFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await goalApi.createTask(goalId, milestone.id, { year: YEAR, title: trimmed, energyLevel: "Shallow", isNextAction: false });
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
      setTitle("");
      inputRef.current?.focus();
    } catch {
      // keep form open on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack direction="row" alignItems="center" gap={0.75} sx={{ pl: 1, pr: 0.5, py: 0.5 }}>
      <Box sx={{ width: 28 }} />
      <TextField
        inputRef={inputRef}
        autoFocus
        size="small"
        placeholder="Task title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onDone();
        }}
        sx={{ flex: 1, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.875rem" } }}
        disabled={saving}
      />
      <IconButton size="small" color="primary" onClick={submit} disabled={!title.trim() || saving}>
        {saving ? <CircularProgress size={14} /> : <CheckIcon fontSize="small" />}
      </IconButton>
      <IconButton size="small" onClick={onDone} disabled={saving}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}


// ── Inline add-milestone form ─────────────────────────────────────────────────

interface AddMilestoneFormProps {
  goalId: string;
  nextOrderIndex: number;
  onDone: () => void;
}

function AddMilestoneForm({ goalId, nextOrderIndex, onDone }: AddMilestoneFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim().length > 0 && deadline.length > 0 && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await goalApi.createMilestone(goalId, { year: YEAR, title: title.trim(), targetDate: deadline, orderIndex: nextOrderIndex });
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
      onDone();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Stack direction="row" alignItems="center" gap={0.75} sx={{ px: 1, py: 0.5 }}>
      <TextField
        autoFocus
        size="small"
        placeholder="Milestone name…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onDone();
        }}
        sx={{ flex: 1, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.875rem" } }}
        disabled={saving}
      />
      <TextField
        size="small"
        type="date"
        label="Deadline"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ width: 148, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.8rem" } }}
        disabled={saving}
      />
      <IconButton size="small" color="primary" onClick={submit} disabled={!canSubmit}>
        {saving ? <CircularProgress size={14} /> : <CheckIcon fontSize="small" />}
      </IconButton>
      <IconButton size="small" onClick={onDone} disabled={saving}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

// ── Main GoalCard ─────────────────────────────────────────────────────────────

interface Props {
  goal: GoalDto;
}

export default function GoalCard({ goal }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [taskStatus, setTaskStatus] = useState<Record<string, string>>({});
  const [nextActionState, setNextActionState] = useState<Record<string, boolean>>({});
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  // Edit/delete task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [deletedTaskIds, setDeletedTaskIds] = useState<string[]>([]);
  const taskDeleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Edit/delete milestone state
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("");
  const [editingMilestoneDate, setEditingMilestoneDate] = useState("");
  const [deletedMilestoneIds, setDeletedMilestoneIds] = useState<string[]>([]);
  const milestoneDeleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: "success" | "error" | "info";
    message: string;
    undoId?: string;
    undoType?: "task" | "milestone";
  }>({ open: false, severity: "success", message: "" });

  const areaColor = LIFE_AREA_COLORS[goal.lifeArea] ?? "#0D6E6E";
  const totalTasks = goal.milestones.reduce((n, m) => n + m.tasks.length, 0);

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86_400_000)
    : null;

  async function toggleTask(taskId: string, currentStatus: string) {
    const next = currentStatus === "Done" ? "NotStarted" : "Done";
    setTaskStatus((prev) => ({ ...prev, [taskId]: next }));
    try {
      await goalApi.updateTaskStatus(taskId, next);
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    } catch {
      setTaskStatus((prev) => ({ ...prev, [taskId]: currentStatus }));
    }
  }

  async function toggleNextAction(taskId: string, current: boolean) {
    const next = !current;
    setNextActionState((prev) => ({ ...prev, [taskId]: next }));
    try {
      await goalApi.setNextAction(taskId, next);
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    } catch {
      setNextActionState((prev) => ({ ...prev, [taskId]: current }));
    }
  }

  async function handleStatusChange(status: string) {
    setMenuAnchor(null);
    await goalApi.updateStatus(goal.id, YEAR, status).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
  }

  async function handleSendEmail() {
    setMenuAnchor(null);
    setEmailSending(true);
    try {
      await goalApi.sendEmail(goal.id, YEAR);
      setSnackbar({ open: true, severity: "success", message: "Goal details sent to your email!" });
    } catch {
      setSnackbar({ open: true, severity: "error", message: "Failed to send email. Check SMTP settings." });
    } finally {
      setEmailSending(false);
    }
  }

  // ── Task edit/delete ────────────────────────────────────────────────────────

  function startEditTask(taskId: string, title: string) {
    setEditingTaskId(taskId);
    setEditingTaskTitle(title);
  }

  async function saveTaskTitle(taskId: string) {
    const trimmed = editingTaskTitle.trim();
    setEditingTaskId(null);
    if (!trimmed) return;
    try {
      await goalApi.updateTask(taskId, { title: trimmed });
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    } catch {
      // no-op
    }
  }

  function handleDeleteTask(taskId: string) {
    setDeletedTaskIds((prev) => [...prev, taskId]);
    setSnackbar({ open: true, severity: "info", message: "Task deleted", undoId: taskId, undoType: "task" });
    taskDeleteTimers.current[taskId] = setTimeout(async () => {
      await goalApi.deleteTask(taskId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    }, UNDO_DELAY);
  }

  function undoDeleteTask(taskId: string) {
    clearTimeout(taskDeleteTimers.current[taskId]);
    delete taskDeleteTimers.current[taskId];
    setDeletedTaskIds((prev) => prev.filter((id) => id !== taskId));
    setSnackbar((s) => ({ ...s, open: false }));
  }

  // ── Milestone edit/delete ───────────────────────────────────────────────────

  function startEditMilestone(ms: MilestoneDto) {
    setEditingMilestoneId(ms.id);
    setEditingMilestoneTitle(ms.title);
    setEditingMilestoneDate(ms.targetDate ? ms.targetDate.split("T")[0] : "");
  }

  async function saveMilestoneEdit(milestoneId: string) {
    const trimmed = editingMilestoneTitle.trim();
    setEditingMilestoneId(null);
    if (!trimmed) return;
    try {
      await goalApi.updateMilestone(milestoneId, {
        title: trimmed,
        targetDate: editingMilestoneDate || null,
      });
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    } catch {
      // no-op
    }
  }

  function handleDeleteMilestone(milestoneId: string) {
    setDeletedMilestoneIds((prev) => [...prev, milestoneId]);
    setSnackbar({ open: true, severity: "info", message: "Milestone deleted", undoId: milestoneId, undoType: "milestone" });
    milestoneDeleteTimers.current[milestoneId] = setTimeout(async () => {
      await goalApi.deleteMilestone(milestoneId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    }, UNDO_DELAY);
  }

  function undoDeleteMilestone(milestoneId: string) {
    clearTimeout(milestoneDeleteTimers.current[milestoneId]);
    delete milestoneDeleteTimers.current[milestoneId];
    setDeletedMilestoneIds((prev) => prev.filter((id) => id !== milestoneId));
    setSnackbar((s) => ({ ...s, open: false }));
  }

  function handleSnackbarUndo() {
    if (!snackbar.open || !snackbar.undoId) return;
    if (snackbar.undoType === "task") undoDeleteTask(snackbar.undoId);
    if (snackbar.undoType === "milestone") undoDeleteMilestone(snackbar.undoId);
  }

  const hasMilestones = goal.milestones.length > 0;
  const visibleMilestones = goal.milestones.filter((ms) => !deletedMilestoneIds.includes(ms.id));

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: "visible" }}>
      <Box sx={{ display: "flex" }}>
        {/* Left accent bar */}
        <Box sx={{ width: 4, borderRadius: "12px 0 0 12px", bgcolor: areaColor, flexShrink: 0 }} />

        <CardContent sx={{ flex: 1, p: 2, "&:last-child": { pb: 2 } }}>

          {/* Title row */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} mb={1}>
            <Typography
              variant="body1" fontWeight={600}
              sx={{ lineHeight: 1.4, flex: 1, cursor: "pointer", "&:hover": { color: "primary.main" } }}
              onClick={() => navigate(`/goals/${goal.id}`)}
            >
              {goal.title}
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Chip
                label={goal.status}
                size="small"
                sx={{
                  bgcolor: goal.status === "Achieved" ? "success.light" : "primary.light",
                  color:   goal.status === "Achieved" ? "success.dark"  : "primary.dark",
                  fontWeight: 600, flexShrink: 0,
                }}
              />
              <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Status menu */}
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            {goal.status !== "Paused"   && <MenuItem onClick={() => handleStatusChange("Paused")}>Pause goal</MenuItem>}
            {goal.status === "Paused"   && <MenuItem onClick={() => handleStatusChange("Active")}>Resume goal</MenuItem>}
            {goal.status !== "Achieved" && <MenuItem onClick={() => handleStatusChange("Achieved")}>Mark achieved ✅</MenuItem>}
            <MenuItem onClick={handleSendEmail} disabled={emailSending}>
              {emailSending ? "Sending…" : "Send to my email 📧"}
            </MenuItem>
            <MenuItem onClick={() => handleStatusChange("Dropped")} sx={{ color: "error.main" }}>Drop goal</MenuItem>
          </Menu>

          {/* Tags row */}
          <Stack direction="row" flexWrap="wrap" gap={0.75} mb={1.5}>
            <Chip
              label={`${LIFE_AREA_EMOJIS[goal.lifeArea] ?? ""} ${LIFE_AREA_LABELS[goal.lifeArea] ?? goal.lifeArea}`.trim()}
              size="small"
              sx={{ bgcolor: areaColor + "22", color: areaColor, fontWeight: 500 }} />
            <Chip label={goal.energyLevel} size="small"
              color={ENERGY_COLOR[goal.energyLevel] ?? "default"} variant="outlined" />
            {goal.targetDate && daysLeft !== null && (
              <Tooltip title={new Date(goal.targetDate).toLocaleDateString()}>
                <Chip
                  icon={<CalendarTodayIcon sx={{ fontSize: "11px !important" }} />}
                  label={
                    daysLeft > 0 ? `${daysLeft}d left`
                    : daysLeft === 0 ? "Today"
                    : `${Math.abs(daysLeft)}d overdue`
                  }
                  size="small" variant="outlined"
                  color={daysLeft < 0 ? "error" : daysLeft <= 7 ? "warning" : "default"}
                />
              </Tooltip>
            )}
          </Stack>

          {/* Progress — Project goals only */}
          {goal.goalType === "Project" && (
            <Box mb={1}>
              <GoalProgressBar
                percent={goal.progressPercent}
                goalId={goal.id}
                editable
                size="sm"
                onUpdated={(updated) => {
                  queryClient.setQueryData<GoalDto[]>(
                    ["goals", goal.year],
                    (prev) => prev?.map((g) => (g.id === updated.id ? updated : g)) ?? prev
                  );
                }}
              />
            </Box>
          )}

          {/* Values */}
          {goal.alignedValueNames.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1}>
              {goal.alignedValueNames.map((v) => (
                <Chip key={v} label={v} size="small" variant="outlined"
                  color="primary" sx={{ fontSize: "0.68rem" }} />
              ))}
            </Stack>
          )}

          <Divider sx={{ mb: 1 }} />

          {/* ── Tasks section ──────────────────────────────────────────────── */}

          {/* No milestones yet — require a milestone before tasks */}
          {!hasMilestones && (
            addingMilestone ? (
              <AddMilestoneForm
                goalId={goal.id}
                nextOrderIndex={0}
                onDone={() => setAddingMilestone(false)}
              />
            ) : (
              <Stack spacing={0.25}>
                <Typography variant="caption" color="text.disabled">
                  Tasks are organised under milestones.
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setAddingMilestone(true)}
                  sx={{ fontSize: "0.8rem", color: "text.secondary", alignSelf: "flex-start" }}
                >
                  Add milestone
                </Button>
              </Stack>
            )
          )}

          {/* Has milestones */}
          {hasMilestones && (
            <>
              {/* Expand toggle row */}
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box
                  onClick={() => setExpanded((v) => !v)}
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer",
                    color: "text.disabled", "&:hover": { color: "text.secondary" } }}
                >
                  {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  <Typography variant="caption">
                    {expanded ? "Hide tasks" : `Tasks (${totalTasks})`}
                  </Typography>
                </Box>

                {/* Quick "Add task" — expands and adds to last milestone */}
                {!expanded && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setExpanded(true);
                      setAddingTaskTo(goal.milestones[goal.milestones.length - 1].id);
                    }}
                    sx={{ fontSize: "0.75rem", minWidth: 0, py: 0, color: "text.secondary" }}
                  >
                    Add task
                  </Button>
                )}
              </Stack>

              <Collapse in={expanded}>
                <Box mt={1.5}>
                  {visibleMilestones.map((ms) => (
                    <Box key={ms.id} mb={2}>
                      {/* Milestone header — edit mode */}
                      {editingMilestoneId === ms.id ? (
                        <Stack direction="row" alignItems="center" gap={0.75} mb={0.5}>
                          <TextField
                            autoFocus
                            size="small"
                            value={editingMilestoneTitle}
                            onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveMilestoneEdit(ms.id);
                              if (e.key === "Escape") setEditingMilestoneId(null);
                            }}
                            sx={{ flex: 1, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.875rem" } }}
                          />
                          <TextField
                            size="small"
                            type="date"
                            label="Deadline"
                            value={editingMilestoneDate}
                            onChange={(e) => setEditingMilestoneDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 140, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.8rem" } }}
                          />
                          <IconButton size="small" color="primary" onClick={() => saveMilestoneEdit(ms.id)}>
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditingMilestoneId(null)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : (
                        /* Milestone header — normal mode */
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}
                          sx={{ "&:hover .ms-actions": { visibility: "visible" } }}
                        >
                          <Typography variant="caption" fontWeight={600} color="text.secondary"
                            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {ms.isComplete ? "✅" : "🏁"} {ms.title}
                            {ms.targetDate && (
                              <Typography component="span" variant="caption" color="text.disabled" ml={0.5}>
                                · {new Date(ms.targetDate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Typography>
                          <Stack direction="row" alignItems="center" gap={0}>
                            <Stack className="ms-actions" direction="row" sx={{ visibility: "hidden" }}>
                              <Tooltip title="Edit milestone">
                                <IconButton size="small" onClick={() => startEditMilestone(ms)}
                                  sx={{ p: 0.25, color: "text.disabled" }}>
                                  <EditOutlinedIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete milestone">
                                <IconButton size="small" onClick={() => handleDeleteMilestone(ms.id)}
                                  sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: "error.main" } }}>
                                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                            <Button
                              size="small"
                              startIcon={<AddIcon sx={{ fontSize: "12px !important" }} />}
                              onClick={() => setAddingTaskTo(ms.id)}
                              sx={{ fontSize: "0.7rem", py: 0, minWidth: 0, color: "text.disabled",
                                "&:hover": { color: "text.secondary" } }}
                            >
                              Add task
                            </Button>
                          </Stack>
                        </Stack>
                      )}

                      {/* Tasks */}
                      {ms.tasks
                        .filter((t) => !deletedTaskIds.includes(t.id))
                        .map((task) => {
                          const status = taskStatus[task.id] ?? task.status;
                          const isDone = status === "Done";
                          const isNA = nextActionState[task.id] ?? task.isNextAction;

                          /* Edit mode */
                          if (editingTaskId === task.id) {
                            return (
                              <Stack key={task.id} direction="row" alignItems="center" gap={0.5}
                                sx={{ pl: 1, pr: 0.5, py: 0.25 }}>
                                <Box sx={{ width: 28 }} />
                                <TextField
                                  autoFocus
                                  size="small"
                                  value={editingTaskTitle}
                                  onChange={(e) => setEditingTaskTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTaskTitle(task.id);
                                    if (e.key === "Escape") setEditingTaskId(null);
                                  }}
                                  sx={{ flex: 1, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.875rem" } }}
                                />
                                <IconButton size="small" color="primary" onClick={() => saveTaskTitle(task.id)}>
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => setEditingTaskId(null)}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            );
                          }

                          /* Normal mode */
                          return (
                            <Stack key={task.id} direction="row" alignItems="center" gap={0.5}
                              sx={{
                                pl: 1, pr: 0.5, py: 0.25, borderRadius: 1,
                                bgcolor: isNA ? "warning.main" + "0A" : "transparent",
                                "&:hover": { bgcolor: "action.hover" },
                                "&:hover .task-actions": { visibility: "visible" },
                              }}
                            >
                              <Checkbox size="small" checked={isDone}
                                onChange={() => toggleTask(task.id, status)} sx={{ p: 0.5 }} />
                              <Typography variant="body2" sx={{
                                flex: 1,
                                textDecoration: isDone ? "line-through" : "none",
                                color: isDone ? "text.disabled" : "text.primary",
                              }}>
                                {task.title}
                              </Typography>
                              {task.estimatedMinutes && (
                                <Typography variant="caption" color="text.disabled">
                                  {task.estimatedMinutes}m
                                </Typography>
                              )}
                              {/* ⚡ Next action toggle */}
                              {!isDone && (
                                <Tooltip title={isNA ? "Remove next action" : "Mark as next action"}>
                                  <IconButton size="small"
                                    onClick={() => toggleNextAction(task.id, isNA)}
                                    sx={{ p: 0.25, color: isNA ? "warning.main" : "action.disabled" }}
                                  >
                                    <BoltIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {/* Edit/delete actions */}
                              <Stack className="task-actions" direction="row"
                                sx={{ visibility: "hidden", flexShrink: 0 }}>
                                <Tooltip title="Edit title">
                                  <IconButton size="small"
                                    onClick={() => startEditTask(task.id, task.title)}
                                    sx={{ p: 0.25, color: "text.disabled" }}>
                                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete task">
                                  <IconButton size="small"
                                    onClick={() => handleDeleteTask(task.id)}
                                    sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: "error.main" } }}>
                                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          );
                        })}

                      {/* Inline add-task form for this milestone */}
                      {addingTaskTo === ms.id && (
                        <AddTaskForm
                          goalId={goal.id}
                          milestone={ms}
                          onDone={() => setAddingTaskTo(null)}
                        />
                      )}

                      {/* Add task button if form not open */}
                      {addingTaskTo !== ms.id && ms.tasks.filter((t) => !deletedTaskIds.includes(t.id)).length === 0 && (
                        <Box sx={{ pl: 1 }}>
                          <Button size="small" startIcon={<AddIcon />}
                            onClick={() => setAddingTaskTo(ms.id)}
                            sx={{ fontSize: "0.75rem", color: "text.disabled", py: 0 }}>
                            Add task
                          </Button>
                        </Box>
                      )}
                    </Box>
                  ))}

                  <Divider sx={{ mb: 1 }} />

                  {/* Add milestone */}
                  {addingMilestone ? (
                    <AddMilestoneForm
                      goalId={goal.id}
                      nextOrderIndex={goal.milestones.length}
                      onDone={() => setAddingMilestone(false)}
                    />
                  ) : (
                    <Button size="small" startIcon={<AddIcon />}
                      onClick={() => setAddingMilestone(true)}
                      sx={{ fontSize: "0.75rem", color: "text.disabled" }}>
                      Add milestone
                    </Button>
                  )}
                </Box>
              </Collapse>
            </>
          )}
        </CardContent>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.undoId ? 5500 : 4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
          action={
            snackbar.undoId ? (
              <Button color="inherit" size="small" onClick={handleSnackbarUndo}>
                Undo
              </Button>
            ) : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}
