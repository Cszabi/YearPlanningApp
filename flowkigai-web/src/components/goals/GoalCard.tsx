import { useState, useRef } from "react";
import {
  Box, Card, CardContent, Chip, LinearProgress, Typography,
  Stack, Divider, IconButton, Checkbox, Tooltip, Collapse,
  Menu, MenuItem, TextField, Button, CircularProgress,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BoltIcon from "@mui/icons-material/Bolt";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { goalApi, type GoalDto, type MilestoneDto } from "@/api/goalApi";
import { useQueryClient } from "@tanstack/react-query";

// ── Constants ─────────────────────────────────────────────────────────────────

const LIFE_AREA_LABELS: Record<string, string> = {
  CareerWork: "Career & Work",         HealthBody: "Health & Body",
  RelationshipsFamily: "Relationships", LearningGrowth: "Learning & Growth",
  Finance: "Finance",                   CreativityHobbies: "Creativity",
  EnvironmentLifestyle: "Environment",  ContributionPurpose: "Contribution",
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


// ── First-task form: creates milestone + task in one shot ─────────────────────

interface AddFirstTaskFormProps {
  goalId: string;
  onDone: () => void;
}

function AddFirstTaskForm({ goalId, onDone }: AddFirstTaskFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const canSubmit = title.trim().length > 0 && deadline.length > 0 && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(false);
    try {
      const ms = await goalApi.createMilestone(goalId, { year: YEAR, title: "Steps", targetDate: deadline, orderIndex: 0 });
      await goalApi.createTask(goalId, ms.id, { year: YEAR, title: title.trim(), energyLevel: "Shallow", isNextAction: false });
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
      onDone();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ pr: 0.5, py: 0.5 }}>
        <TextField
          autoFocus
          size="small"
          placeholder="What's the first step?"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onDone();
          }}
          error={error}
          helperText={error ? "Failed to save — is the backend running?" : undefined}
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
    </Box>
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
  const [expanded, setExpanded] = useState(false);
  const [taskStatus, setTaskStatus] = useState<Record<string, string>>({});
  const [nextActionState, setNextActionState] = useState<Record<string, boolean>>({});
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null); // milestoneId
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [addingFirstTask, setAddingFirstTask] = useState(false);

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

  const hasMilestones = goal.milestones.length > 0;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: "visible" }}>
      <Box sx={{ display: "flex" }}>
        {/* Left accent bar */}
        <Box sx={{ width: 4, borderRadius: "12px 0 0 12px", bgcolor: areaColor, flexShrink: 0 }} />

        <CardContent sx={{ flex: 1, p: 2, "&:last-child": { pb: 2 } }}>

          {/* Title row */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} mb={1}>
            <Typography variant="body1" fontWeight={600} sx={{ lineHeight: 1.4, flex: 1 }}>
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
            <MenuItem onClick={() => handleStatusChange("Dropped")} sx={{ color: "error.main" }}>Drop goal</MenuItem>
          </Menu>

          {/* Tags row */}
          <Stack direction="row" flexWrap="wrap" gap={0.75} mb={1.5}>
            <Chip label={LIFE_AREA_LABELS[goal.lifeArea] ?? goal.lifeArea} size="small"
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

          {/* Progress */}
          <Box mb={1}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.disabled">Progress</Typography>
              <Typography variant="caption" color="text.disabled">{Math.round(goal.progress)}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={goal.progress}
              sx={{ "& .MuiLinearProgress-bar": { bgcolor: areaColor }, bgcolor: areaColor + "22" }} />
          </Box>

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

          {/* No milestones yet */}
          {!hasMilestones && (
            addingFirstTask ? (
              <AddFirstTaskForm
                goalId={goal.id}
                onDone={() => setAddingFirstTask(false)}
              />
            ) : (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddingFirstTask(true)}
                sx={{ fontSize: "0.8rem", color: "text.secondary" }}
              >
                Add first task
              </Button>
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
                  {goal.milestones.map((ms) => (
                    <Box key={ms.id} mb={2}>
                      {/* Milestone header */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary"
                          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {ms.isComplete ? "✅" : "🏁"} {ms.title}
                          {ms.targetDate && (
                            <Typography component="span" variant="caption" color="text.disabled" ml={0.5}>
                              · {new Date(ms.targetDate).toLocaleDateString()}
                            </Typography>
                          )}
                        </Typography>
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

                      {/* Tasks */}
                      {ms.tasks.map((task) => {
                        const status = taskStatus[task.id] ?? task.status;
                        const isDone = status === "Done";
                        const isNA = nextActionState[task.id] ?? task.isNextAction;
                        return (
                          <Stack key={task.id} direction="row" alignItems="center" gap={0.5}
                            sx={{
                              pl: 1, pr: 0.5, py: 0.25, borderRadius: 1,
                              bgcolor: isNA ? "warning.main" + "0A" : "transparent",
                              "&:hover": { bgcolor: "action.hover" },
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
                      {addingTaskTo !== ms.id && ms.tasks.length === 0 && (
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
    </Card>
  );
}
