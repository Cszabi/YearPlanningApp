import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, Typography, Stack, Chip, Tabs, Tab,
  Button, IconButton, TextField, CircularProgress, Alert,
  Divider, Checkbox, Tooltip, Menu, MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BoltIcon from "@mui/icons-material/Bolt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { goalApi, type MilestoneDto, type TaskDto, type GoalProgressSnapshotDto } from "@/api/goalApi";
import GoalProgressBar from "@/components/goals/GoalProgressBar";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { habitApi } from "@/api/habitApi";

const YEAR = new Date().getFullYear();

const LIFE_AREA_LABELS: Record<string, string> = {
  CareerWork: "Career & Work",          HealthBody: "Health & Body",
  RelationshipsFamily: "Relationships", LearningGrowth: "Learning & Growth",
  Finance: "Finance",                   CreativityHobbies: "Creativity",
  EnvironmentLifestyle: "Environment",  ContributionPurpose: "Contribution",
};
const LIFE_AREA_EMOJIS: Record<string, string> = {
  CareerWork: "💼", HealthBody: "💪", RelationshipsFamily: "❤️",
  LearningGrowth: "📚", Finance: "💰", CreativityHobbies: "🎨",
  EnvironmentLifestyle: "🌿", ContributionPurpose: "🌍",
};
const LIFE_AREA_COLORS: Record<string, string> = {
  CareerWork: "#0EA5E9",          HealthBody: "#10B981",
  RelationshipsFamily: "#F43F5E", LearningGrowth: "#8B5CF6",
  Finance: "#F59E0B",             CreativityHobbies: "#F97316",
  EnvironmentLifestyle: "#06B6D4", ContributionPurpose: "#6366F1",
};
const STATUS_OPTIONS = ["Active", "Paused", "Achieved", "Dropped"];
const STATUS_COLORS: Record<string, "success" | "warning" | "default" | "error"> = {
  Active: "success", Paused: "warning", Achieved: "default", Dropped: "error",
};

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: goal, isLoading, isError, refetch } = useQuery({
    queryKey: ["goal", goalId, YEAR],
    queryFn: () => goalApi.getGoal(goalId!, YEAR),
    enabled: !!goalId,
  });

  const { data: habits } = useQuery({
    queryKey: ["habits", YEAR],
    queryFn: () => habitApi.getHabits(YEAR),
    enabled: goal?.goalType === "Repetitive",
  });
  const habit = habits?.find((h) => h.goalId === goalId);

  const { data: progressHistory } = useQuery<GoalProgressSnapshotDto[]>({
    queryKey: ["goal-progress-history", goalId],
    queryFn: () => goalApi.getProgressHistory(goalId!),
    enabled: !!goalId && goal?.goalType === "Project",
  });

  const { logAction } = usePageAnalytics("/goals/:goalId");
  const [tab, setTab] = useState(0);

  // Header
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);

  // Tab 0 — Overview
  const [editWhy, setEditWhy] = useState(false);
  const [whyValue, setWhyValue] = useState("");

  // Tab 1 — SMART + WOOP
  const [smartEdit, setSmartEdit] = useState<{
    specific: string; measurable: string; achievable: string;
    relevant: string; timeBound: string;
  } | null>(null);
  const [woopEdit, setWoopEdit] = useState<{
    wish: string; outcome: string; obstacle: string; plan: string;
  } | null>(null);

  // Tab 2 — Tasks
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("");
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  if (isLoading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", bgcolor: "background.default" }}>
      <CircularProgress />
    </Box>
  );
  if (isError || !goal) return (
    <Box sx={{ p: 4, bgcolor: "background.default", height: "100%" }}>
      <Alert severity="error" action={<Button onClick={() => refetch()}>Retry</Button>}>
        Could not load goal.
      </Alert>
    </Box>
  );

  const lifeAreaColor = LIFE_AREA_COLORS[goal.lifeArea] ?? "#64748B";
  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86_400_000)
    : null;

  async function saveTitle() {
    if (!goal || !titleValue.trim()) { setEditTitle(false); return; }
    await goalApi.updateGoal(goal.id, YEAR, { title: titleValue.trim() }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    setEditTitle(false);
  }

  async function saveStatus(status: string) {
    if (!goal) return;
    setStatusAnchor(null);
    await goalApi.updateStatus(goal.id, YEAR, status).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
  }

  async function saveWhy() {
    if (!goal) return;
    await goalApi.updateGoal(goal.id, YEAR, { whyItMatters: whyValue }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    setEditWhy(false);
  }

  async function saveSmart() {
    if (!goal || !smartEdit) return;
    await goalApi.saveSmart(goal.id, YEAR, {
      specific: smartEdit.specific,
      measurable: smartEdit.measurable,
      achievable: smartEdit.achievable,
      relevant: smartEdit.relevant,
      timeBound: smartEdit.timeBound,
    }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    setSmartEdit(null);
  }

  async function saveWoop() {
    if (!goal || !woopEdit) return;
    await goalApi.saveWoop(goal.id, YEAR, {
      wish: woopEdit.wish,
      outcome: woopEdit.outcome,
      obstacle: woopEdit.obstacle,
      plan: woopEdit.plan,
    }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    setWoopEdit(null);
  }

  async function saveTaskTitle(taskId: string) {
    if (!editingTaskTitle.trim()) { setEditingTaskId(null); return; }
    await goalApi.updateTask(taskId, { title: editingTaskTitle.trim() }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    setEditingTaskId(null);
  }

  async function toggleTask(task: TaskDto) {
    const newStatus = task.status === "Done" ? "NotStarted" : "Done";
    await goalApi.updateTaskStatus(task.id, newStatus).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
  }

  async function toggleNextAction(task: TaskDto) {
    await goalApi.setNextAction(task.id, !task.isNextAction).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
  }

  async function deleteTask(taskId: string) {
    await goalApi.deleteTask(taskId).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
  }

  async function saveMilestoneTitle(milestoneId: string) {
    if (!editingMilestoneTitle.trim()) { setEditingMilestoneId(null); return; }
    await goalApi.updateMilestone(milestoneId, { title: editingMilestoneTitle.trim() }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    setEditingMilestoneId(null);
  }

  async function toggleMilestoneComplete(ms: MilestoneDto) {
    await goalApi.updateMilestone(ms.id, { isComplete: !ms.isComplete }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
  }

  async function deleteMilestone(milestoneId: string) {
    await goalApi.deleteMilestone(milestoneId).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
  }

  async function addTask(milestoneId: string) {
    if (!goal || !newTaskTitle.trim()) return;
    await goalApi.createTask(goal.id, milestoneId, { year: YEAR, title: newTaskTitle.trim(), energyLevel: "Shallow", isNextAction: false }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["goal", goalId, YEAR] });
    setNewTaskTitle("");
  }

  type SmartKey = "specific" | "measurable" | "achievable" | "relevant";
  type WoopKey  = "wish" | "outcome" | "obstacle" | "plan";

  const smartFields: Array<{ key: SmartKey; label: string; hint: string }> = [
    { key: "specific",   label: "S — Specific",   hint: "What exactly will you accomplish?" },
    { key: "measurable", label: "M — Measurable", hint: "How will you know you've succeeded?" },
    { key: "achievable", label: "A — Achievable", hint: "Is this realistic given your resources?" },
    { key: "relevant",   label: "R — Relevant",   hint: "Why does this matter to you right now?" },
  ];

  const woopFields: Array<{ key: WoopKey; label: string; hint: string }> = [
    { key: "wish",     label: "W — Wish",     hint: "What is your deepest wish?" },
    { key: "outcome",  label: "O — Outcome",  hint: "What's the best outcome you imagine?" },
    { key: "obstacle", label: "O — Obstacle", hint: "What inner obstacle might stop you?" },
    { key: "plan",     label: "P — Plan",     hint: "If obstacle occurs, then I will…" },
  ];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", overflow: "hidden" }}>

      {/* ── Header ── */}
      <Box sx={{ px: 4, pt: 2.5, pb: 2, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" spacing={0.5} mb={1.5}>
          <IconButton size="small" onClick={() => navigate("/goals")}><ArrowBackIcon fontSize="small" /></IconButton>
          <Typography variant="caption" color="text.secondary">Goals</Typography>
        </Stack>

        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box flex={1} minWidth={0}>
            {editTitle ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  autoFocus size="small" value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditTitle(false); }}
                  sx={{ minWidth: 280 }}
                />
                <IconButton size="small" onClick={saveTitle}><CheckIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => setEditTitle(false)}><CloseIcon fontSize="small" /></IconButton>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  variant="h5" fontWeight={700}
                  sx={{ cursor: "pointer", "&:hover": { color: "primary.main" } }}
                  onClick={() => { setEditTitle(true); setTitleValue(goal.title); }}
                >
                  {goal.title}
                </Typography>
                <IconButton size="small" onClick={() => { setEditTitle(true); setTitleValue(goal.title); }}>
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            )}

            <Stack direction="row" alignItems="center" spacing={1} mt={1} flexWrap="wrap">
              <Chip
                label={goal.status}
                size="small"
                color={STATUS_COLORS[goal.status] ?? "default"}
                onClick={(e) => setStatusAnchor(e.currentTarget)}
                sx={{ cursor: "pointer", fontWeight: 600 }}
              />
              <Menu anchorEl={statusAnchor} open={!!statusAnchor} onClose={() => setStatusAnchor(null)}>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} selected={s === goal.status} onClick={() => saveStatus(s)}>{s}</MenuItem>
                ))}
              </Menu>

              <Chip
                label={`${LIFE_AREA_EMOJIS[goal.lifeArea] ?? ""} ${LIFE_AREA_LABELS[goal.lifeArea] ?? goal.lifeArea}`}
                size="small"
                sx={{ bgcolor: lifeAreaColor + "22", color: lifeAreaColor, fontWeight: 500 }}
              />
              <Chip label={goal.energyLevel} size="small" variant="outlined" />
              {daysLeft !== null && (
                <Typography variant="caption" color={daysLeft < 0 ? "error.main" : daysLeft <= 14 ? "warning.main" : "text.secondary"}>
                  {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : `${-daysLeft}d overdue`}
                </Typography>
              )}
            </Stack>

            {goal.goalType === "Project" && (
              <Box mt={1.5} maxWidth={480}>
                <GoalProgressBar
                  percent={goal.progressPercent}
                  goalId={goal.id}
                  editable
                  size="md"
                  onUpdated={(updated) => {
                    queryClient.setQueryData(["goal", goalId, YEAR], updated);
                    queryClient.setQueryData<import("@/api/goalApi").GoalDto[]>(
                      ["goals", YEAR],
                      (prev) => prev?.map((g) => (g.id === updated.id ? updated : g)) ?? prev
                    );
                    queryClient.invalidateQueries({ queryKey: ["goal-progress-history", goalId] });
                  }}
                />
                {progressHistory && progressHistory.length > 1 && (
                  <Box mt={2}>
                    <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5, display: "block" }}>
                      Progress history
                    </Typography>
                    <ResponsiveContainer width="100%" height={90}>
                      <LineChart data={progressHistory} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <XAxis
                          dataKey="snapshotDate"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d: string) => {
                            const [, m, day] = d.split("-");
                            return `${parseInt(m)}/${parseInt(day)}`;
                          }}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <RechartsTooltip
                          formatter={(val) => [`${val}%`, "Progress"]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="progressPercent"
                          stroke="#0D9E9E"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => navigate("/flow")}
            sx={{ borderRadius: 3, whiteSpace: "nowrap", mt: 0.5, flexShrink: 0 }}
          >
            Start Flow
          </Button>
        </Stack>
      </Box>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); logAction("tab_switched", ["overview","smart_woop","tasks","habit"][v]); }}
        sx={{ px: 4, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", minHeight: 44 }}
        TabIndicatorProps={{ style: { backgroundColor: "#0D6E6E" } }}
      >
        <Tab label="Overview" sx={{ minHeight: 44, fontSize: "0.82rem" }} />
        <Tab label="SMART + WOOP" sx={{ minHeight: 44, fontSize: "0.82rem" }} />
        <Tab label="Tasks" sx={{ minHeight: 44, fontSize: "0.82rem" }} />
        {goal.goalType === "Repetitive" && <Tab label="Habit" sx={{ minHeight: 44, fontSize: "0.82rem" }} />}
      </Tabs>

      {/* ── Tab content ── */}
      <Box sx={{ flex: 1, overflow: "auto", p: 4, maxWidth: 800 }}>

        {/* Tab 0 — Overview */}
        {tab === 0 && (
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" fontWeight={600}>Why it matters</Typography>
                {!editWhy && (
                  <IconButton size="small" onClick={() => { setEditWhy(true); setWhyValue(goal.whyItMatters ?? ""); }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Stack>
              {editWhy ? (
                <Stack spacing={1}>
                  <TextField
                    autoFocus multiline rows={3} fullWidth size="small"
                    value={whyValue}
                    onChange={(e) => setWhyValue(e.target.value)}
                    placeholder="Why does this goal matter to you?"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={saveWhy} sx={{ borderRadius: 2 }}>Save</Button>
                    <Button size="small" onClick={() => setEditWhy(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography
                  variant="body2"
                  color={goal.whyItMatters ? "text.primary" : "text.disabled"}
                  sx={{ whiteSpace: "pre-wrap", cursor: "pointer", lineHeight: 1.7 }}
                  onClick={() => { setEditWhy(true); setWhyValue(goal.whyItMatters ?? ""); }}
                >
                  {goal.whyItMatters ?? "Click to add why this goal matters to you…"}
                </Typography>
              )}
            </Box>

            {goal.alignedValueNames.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Aligned values</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {goal.alignedValueNames.map((v) => (
                    <Chip key={v} label={v} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}

        {/* Tab 1 — SMART + WOOP */}
        {tab === 1 && (
          <Stack spacing={3}>
            {/* SMART */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>SMART Goal</Typography>
                {!smartEdit ? (
                  <Button
                    size="small" startIcon={<EditIcon />}
                    onClick={() => setSmartEdit({
                      specific:   goal.smartGoal?.specific   ?? "",
                      measurable: goal.smartGoal?.measurable ?? "",
                      achievable: goal.smartGoal?.achievable ?? "",
                      relevant:   goal.smartGoal?.relevant   ?? "",
                      timeBound:  goal.smartGoal?.timeBound  ? goal.smartGoal.timeBound.slice(0, 10) : "",
                    })}
                  >Edit</Button>
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={saveSmart} sx={{ borderRadius: 2 }}>Save</Button>
                    <Button size="small" onClick={() => setSmartEdit(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
                  </Stack>
                )}
              </Stack>

              {smartFields.map(({ key, label, hint }) => (
                <Box key={key} mb={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                  {smartEdit ? (
                    <TextField
                      fullWidth size="small" multiline rows={2} placeholder={hint}
                      value={smartEdit[key as keyof typeof smartEdit]}
                      onChange={(e) => setSmartEdit({ ...smartEdit, [key]: e.target.value })}
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body2" color={goal.smartGoal?.[key as keyof typeof goal.smartGoal] ? "text.primary" : "text.disabled"} mt={0.5} sx={{ lineHeight: 1.7 }}>
                      {(goal.smartGoal?.[key as keyof typeof goal.smartGoal] as string) || hint}
                    </Typography>
                  )}
                </Box>
              ))}

              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>T — Time-bound</Typography>
                {smartEdit ? (
                  <TextField
                    fullWidth size="small" type="date"
                    value={smartEdit.timeBound}
                    onChange={(e) => setSmartEdit({ ...smartEdit, timeBound: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body2" color={goal.smartGoal?.timeBound ? "text.primary" : "text.disabled"} mt={0.5}>
                    {goal.smartGoal?.timeBound
                      ? new Date(goal.smartGoal.timeBound).toLocaleDateString()
                      : "Set a deadline"}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />

            {/* WOOP */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>WOOP Reflection</Typography>
                {!woopEdit ? (
                  <Button
                    size="small" startIcon={<EditIcon />}
                    onClick={() => setWoopEdit({
                      wish:     goal.woopReflection?.wish     ?? "",
                      outcome:  goal.woopReflection?.outcome  ?? "",
                      obstacle: goal.woopReflection?.obstacle ?? "",
                      plan:     goal.woopReflection?.plan     ?? "",
                    })}
                  >Edit</Button>
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={saveWoop} sx={{ borderRadius: 2 }}>Save</Button>
                    <Button size="small" onClick={() => setWoopEdit(null)} sx={{ borderRadius: 2 }}>Cancel</Button>
                  </Stack>
                )}
              </Stack>

              {woopFields.map(({ key, label, hint }) => (
                <Box key={key} mb={2}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                  {woopEdit ? (
                    <TextField
                      fullWidth size="small" multiline rows={2} placeholder={hint}
                      value={woopEdit[key as keyof typeof woopEdit]}
                      onChange={(e) => setWoopEdit({ ...woopEdit, [key]: e.target.value })}
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body2" color={goal.woopReflection?.[key as keyof typeof goal.woopReflection] ? "text.primary" : "text.disabled"} mt={0.5} sx={{ lineHeight: 1.7 }}>
                      {(goal.woopReflection?.[key as keyof typeof goal.woopReflection] as string) || hint}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Stack>
        )}

        {/* Tab 2 — Tasks & Milestones */}
        {tab === 2 && (
          <Stack spacing={3}>
            {goal.milestones.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No milestones yet. Create one from the Goals page.
              </Typography>
            )}
            {goal.milestones.map((ms) => (
              <Box key={ms.id}>
                {/* Milestone header */}
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}
                  sx={{ "&:hover .ms-actions": { visibility: "visible" } }}>
                  <Checkbox
                    checked={ms.isComplete} size="small"
                    onChange={() => toggleMilestoneComplete(ms)}
                  />
                  {editingMilestoneId === ms.id ? (
                    <TextField
                      autoFocus size="small" value={editingMilestoneTitle} sx={{ flex: 1 }}
                      onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveMilestoneTitle(ms.id); if (e.key === "Escape") setEditingMilestoneId(null); }}
                      onBlur={() => saveMilestoneTitle(ms.id)}
                    />
                  ) : (
                    <Typography
                      variant="subtitle2" fontWeight={600} flex={1}
                      sx={{ textDecoration: ms.isComplete ? "line-through" : "none", cursor: "pointer" }}
                      onClick={() => { setEditingMilestoneId(ms.id); setEditingMilestoneTitle(ms.title); }}
                    >
                      {ms.title}
                    </Typography>
                  )}
                  <Stack direction="row" className="ms-actions" sx={{ visibility: "hidden" }}>
                    <IconButton size="small" onClick={() => { setEditingMilestoneId(ms.id); setEditingMilestoneTitle(ms.title); }}>
                      <EditIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteMilestone(ms.id)}>
                      <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Stack>
                </Stack>

                {/* Tasks */}
                {ms.tasks.map((task) => (
                  <Stack key={task.id} direction="row" alignItems="center" spacing={1}
                    sx={{ pl: 4, py: 0.25, "&:hover .task-actions": { visibility: "visible" } }}>
                    <Checkbox
                      checked={task.status === "Done"} size="small"
                      onChange={() => toggleTask(task)}
                    />
                    {editingTaskId === task.id ? (
                      <TextField
                        autoFocus size="small" value={editingTaskTitle} sx={{ flex: 1 }}
                        onChange={(e) => setEditingTaskTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveTaskTitle(task.id); if (e.key === "Escape") setEditingTaskId(null); }}
                        onBlur={() => saveTaskTitle(task.id)}
                      />
                    ) : (
                      <Typography
                        variant="body2" flex={1}
                        sx={{ textDecoration: task.status === "Done" ? "line-through" : "none", cursor: "pointer", color: task.status === "Done" ? "text.disabled" : "text.primary" }}
                        onClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.title); }}
                      >
                        {task.title}
                      </Typography>
                    )}
                    <Stack direction="row" className="task-actions" sx={{ visibility: "hidden" }}>
                      <Tooltip title={task.isNextAction ? "Remove next action" : "Mark as next action"}>
                        <IconButton size="small" color={task.isNextAction ? "warning" : "default"} onClick={() => toggleNextAction(task)}>
                          <BoltIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" color="error" onClick={() => deleteTask(task.id)}>
                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}

                {/* Add task row */}
                {addingTaskTo === ms.id ? (
                  <Stack direction="row" spacing={1} sx={{ pl: 4, mt: 0.5 }}>
                    <TextField
                      autoFocus size="small" placeholder="Task title" value={newTaskTitle}
                      sx={{ flex: 1 }}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTask(ms.id);
                        if (e.key === "Escape") { setAddingTaskTo(null); setNewTaskTitle(""); }
                      }}
                    />
                    <Button size="small" variant="contained" onClick={() => addTask(ms.id)} sx={{ borderRadius: 2 }}>Add</Button>
                    <Button size="small" onClick={() => { setAddingTaskTo(null); setNewTaskTitle(""); }} sx={{ borderRadius: 2 }}>Cancel</Button>
                  </Stack>
                ) : (
                  <Button
                    size="small" startIcon={<AddIcon />}
                    onClick={() => { setAddingTaskTo(ms.id); setNewTaskTitle(""); }}
                    sx={{ pl: 3, mt: 0.25, borderRadius: 2, fontSize: "0.78rem" }}
                  >
                    Add task
                  </Button>
                )}

                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}
          </Stack>
        )}

        {/* Tab 3 — Habit (only for Repetitive goals) */}
        {tab === 3 && goal.goalType === "Repetitive" && (
          <Stack spacing={3}>
            {!habit ? (
              <Typography variant="body2" color="text.secondary">
                No habit set up for this goal yet.
              </Typography>
            ) : (
              <>
                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Current streak</Typography>
                    <Typography variant="h4" fontWeight={700}>{habit.currentStreak} 🔥</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Longest streak</Typography>
                    <Typography variant="h4" fontWeight={700}>{habit.longestStreak}</Typography>
                  </Box>
                </Stack>

                <Stack spacing={2}>
                  {([
                    { label: "Frequency",           value: habit.frequency },
                    { label: "Minimal viable dose",  value: habit.minimumViableDose },
                    { label: "Trigger",              value: habit.trigger ?? "—" },
                    { label: "Celebration ritual",   value: habit.celebrationRitual ?? "—" },
                  ] as const).map(({ label, value }) => (
                    <Box key={label}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">{label}</Typography>
                      <Typography variant="body2" mt={0.25}>{value}</Typography>
                    </Box>
                  ))}
                </Stack>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>Last 30 days</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {Array.from({ length: 30 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (29 - i));
                      const dateStr = d.toISOString().slice(0, 10);
                      const logged = habit.recentLogs.some((l) => l.loggedDate.slice(0, 10) === dateStr);
                      return (
                        <Tooltip key={dateStr} title={dateStr}>
                          <Box sx={{
                            width: 20, height: 20, borderRadius: 0.75,
                            bgcolor: logged ? "#0D6E6E" : "action.hover",
                          }} />
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Box>

                <Button
                  variant="contained"
                  onClick={async () => {
                    await habitApi.logHabit(habit.id).catch(() => {});
                    queryClient.invalidateQueries({ queryKey: ["habits", YEAR] });
                  }}
                  sx={{ alignSelf: "flex-start", borderRadius: 3 }}
                >
                  ✓ Log today
                </Button>
              </>
            )}
          </Stack>
        )}

      </Box>
    </Box>
  );
}
