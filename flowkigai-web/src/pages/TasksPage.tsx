import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Chip, CircularProgress, Checkbox,
  Divider, IconButton, Tooltip, Button, Paper, Alert,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { goalApi, type GoalDto, type TaskDto } from "@/api/goalApi";
import { useFlowTimerStore } from "@/stores/flowTimerStore";

const YEAR = new Date().getFullYear();

const LIFE_AREA_COLORS: Record<string, string> = {
  CareerWork: "#0EA5E9",          HealthBody: "#10B981",
  RelationshipsFamily: "#F43F5E", LearningGrowth: "#8B5CF6",
  Finance: "#F59E0B",             CreativityHobbies: "#F97316",
  EnvironmentLifestyle: "#06B6D4", ContributionPurpose: "#6366F1",
};

const ENERGY_COLOR: Record<string, "primary" | "warning" | "default"> = {
  Deep: "primary", Medium: "warning", Shallow: "default",
};

interface FlatTask extends TaskDto {
  goalTitle: string;
  goalId: string;
  lifeArea: string;
  goalEnergyLevel: string;
  milestoneTitle: string;
}

function flattenAllTasks(goals: GoalDto[]): FlatTask[] {
  const result: FlatTask[] = [];
  for (const g of goals) {
    if (g.status !== "Active") continue;
    for (const ms of g.milestones) {
      for (const t of ms.tasks) {
        if (t.status !== "Done") {
          result.push({
            ...t,
            goalTitle: g.title,
            goalId: g.id,
            lifeArea: g.lifeArea,
            goalEnergyLevel: g.energyLevel,
            milestoneTitle: ms.title,
          });
        }
      }
    }
  }
  return result;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function TasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startSetup = useFlowTimerStore((s) => s.startSetup);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [nextActionOverrides, setNextActionOverrides] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "Deep" | "Medium" | "Shallow">("all");

  const { data: goals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["goals", YEAR],
    queryFn: () => goalApi.getGoals(YEAR),
  });

  const allTasks = useMemo(() => flattenAllTasks(goals), [goals]);

  const filtered = useMemo(() =>
    filter === "all" ? allTasks : allTasks.filter((t) => t.goalEnergyLevel === filter),
    [allTasks, filter]
  );

  const nextActionCount = useMemo(
    () => allTasks.filter((t) => nextActionOverrides[t.id] ?? t.isNextAction).length,
    [allTasks, nextActionOverrides]
  );

  // Group by goalId, next actions first within each group
  const grouped = useMemo(() => {
    const map = new Map<string, FlatTask[]>();
    for (const t of filtered) {
      const arr = map.get(t.goalId) ?? [];
      arr.push(t);
      map.set(t.goalId, arr);
    }
    // Sort within each group: next actions first
    for (const [id, tasks] of map) {
      map.set(id, [...tasks].sort((a, b) => {
        const aNA = nextActionOverrides[a.id] ?? a.isNextAction;
        const bNA = nextActionOverrides[b.id] ?? b.isNextAction;
        return (bNA ? 1 : 0) - (aNA ? 1 : 0);
      }));
    }
    return map;
  }, [filtered, nextActionOverrides]);

  async function toggleDone(task: FlatTask) {
    const cur = statusOverrides[task.id] ?? task.status;
    const next = cur === "Done" ? "NotStarted" : "Done";
    setStatusOverrides((p) => ({ ...p, [task.id]: next }));
    try {
      await goalApi.updateTaskStatus(task.id, next);
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    } catch {
      setStatusOverrides((p) => ({ ...p, [task.id]: cur }));
    }
  }

  async function toggleNextAction(task: FlatTask) {
    const cur = nextActionOverrides[task.id] ?? task.isNextAction;
    const next = !cur;
    setNextActionOverrides((p) => ({ ...p, [task.id]: next }));
    try {
      await goalApi.setNextAction(task.id, next);
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    } catch {
      setNextActionOverrides((p) => ({ ...p, [task.id]: cur }));
    }
  }

  function startFlow(_task: FlatTask) {
    startSetup();
    navigate("/flow");
  }

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default" }}>

      {/* Header */}
      <Box sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", px: 3, py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Tasks</Typography>
            <Typography variant="caption" color="text.disabled">
              {allTasks.length} open · {nextActionCount} next action{nextActionCount !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Stack>
        {/* Energy filter */}
        <Stack direction="row" gap={1}>
          {(["all", "Deep", "Medium", "Shallow"] as const).map((f) => (
            <Chip
              key={f}
              label={f === "all" ? "All" : f === "Deep" ? "🔵 Deep" : f === "Medium" ? "🟡 Medium" : "⚪ Shallow"}
              size="small"
              variant={filter === f ? "filled" : "outlined"}
              color={filter === f ? "primary" : "default"}
              onClick={() => setFilter(f)}
              sx={{ cursor: "pointer" }}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ px: 3, py: 3, maxWidth: 680, mx: "auto" }}>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        )}

        {isError && !isLoading && (
          <Alert severity="error" sx={{ mb: 3 }}
            action={<Button size="small" onClick={() => refetch()}>Retry</Button>}
          >
            Failed to load tasks. Check your connection.
          </Alert>
        )}

        {!isLoading && filtered.length === 0 && !isError && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography variant="h2" mb={2}>✅</Typography>
            <Typography variant="body1" color="text.secondary" mb={1}>
              {allTasks.length === 0 ? "No tasks yet" : "No tasks match this filter"}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {allTasks.length === 0
                ? "Add tasks to your goals to see them here"
                : "Try a different energy filter"}
            </Typography>
          </Box>
        )}

        {!isLoading && [...grouped.entries()].map(([, tasks]) => {
          const first = tasks[0];
          const color = LIFE_AREA_COLORS[first.lifeArea] ?? "#0D6E6E";
          return (
            <Box key={first.goalId} mb={3}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {first.goalTitle}
                </Typography>
                <Chip label={first.goalEnergyLevel} size="small"
                  color={ENERGY_COLOR[first.goalEnergyLevel] ?? "default"} variant="outlined"
                  sx={{ fontSize: "0.65rem" }} />
              </Stack>

              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                {tasks.map((task, idx) => {
                  const status = statusOverrides[task.id] ?? task.status;
                  const isDone = status === "Done";
                  const isNA = nextActionOverrides[task.id] ?? task.isNextAction;
                  const overdue = isOverdue(task.dueDate);

                  return (
                    <Box key={task.id}>
                      {idx > 0 && <Divider />}
                      <Stack
                        direction="row" alignItems="center" gap={1}
                        sx={{
                          px: 1.5, py: 1,
                          bgcolor: isNA ? "primary.main" + "08" : "transparent",
                          "&:hover": { bgcolor: isNA ? "primary.main" + "12" : "action.hover" },
                        }}
                      >
                        <Checkbox size="small" checked={isDone}
                          onChange={() => toggleDone(task)} sx={{ p: 0.5 }} />

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{
                            textDecoration: isDone ? "line-through" : "none",
                            color: isDone ? "text.disabled" : "text.primary",
                          }}>
                            {task.title}
                          </Typography>
                          <Stack direction="row" gap={0.75} mt={0.25} flexWrap="wrap" alignItems="center">
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                              {task.milestoneTitle}
                            </Typography>
                            {task.dueDate && (
                              <Chip
                                label={overdue
                                  ? `Overdue · ${new Date(task.dueDate).toLocaleDateString()}`
                                  : new Date(task.dueDate).toLocaleDateString()}
                                size="small" variant="outlined"
                                color={overdue ? "error" : "default"}
                                sx={{ fontSize: "0.65rem" }}
                              />
                            )}
                            {task.estimatedMinutes && (
                              <Chip label={`${task.estimatedMinutes}m`} size="small"
                                variant="outlined" sx={{ fontSize: "0.65rem" }} />
                            )}
                          </Stack>
                        </Box>

                        {/* ⚡ Next action toggle */}
                        <Tooltip title={isNA ? "Remove from next actions" : "Mark as next action"}>
                          <IconButton
                            size="small"
                            onClick={() => toggleNextAction(task)}
                            sx={{ color: isNA ? "warning.main" : "action.disabled", p: 0.5 }}
                          >
                            <BoltIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* ▶ Start flow */}
                        <Tooltip title="Start flow session">
                          <IconButton size="small" color="primary"
                            onClick={() => startFlow(task)} sx={{ p: 0.5 }}>
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  );
                })}
              </Paper>
            </Box>
          );
        })}

        {!isLoading && allTasks.length > 0 && (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Button variant="contained" startIcon={<PlayArrowIcon />}
              onClick={() => { startSetup(); navigate("/flow"); }}
              sx={{ borderRadius: 6 }}>
              Start a flow session
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
