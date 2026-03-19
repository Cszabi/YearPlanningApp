import { useQuery } from "@tanstack/react-query";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Stack, Paper, LinearProgress,
  Chip, Button, Skeleton,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import BoltIcon from "@mui/icons-material/Bolt";
import { ikigaiApi } from "@/api/ikigaiApi";
import { goalApi, type GoalDto } from "@/api/goalApi";
import { habitApi } from "@/api/habitApi";
import { flowSessionApi, type FlowInsightsDto } from "@/api/flowSessionApi";
import { useFlowTimerStore } from "@/stores/flowTimerStore";
import PdfActionButtons from "@/components/pdf/PdfActionButtons";
import FlowHistoryPdf from "@/components/pdf/FlowHistoryPdf";

const YEAR = new Date().getFullYear();

const LIFE_AREA_COLORS: Record<string, string> = {
  CareerWork: "#0EA5E9",         HealthBody: "#10B981",
  RelationshipsFamily: "#F43F5E", LearningGrowth: "#8B5CF6",
  Finance: "#F59E0B",            CreativityHobbies: "#F97316",
  EnvironmentLifestyle: "#06B6D4", ContributionPurpose: "#6366F1",
};

const ENERGY_COLORS: Record<string, "primary" | "warning" | "default"> = {
  Deep: "primary", Medium: "warning", Shallow: "default",
};

// ── Widget skeletons ─────────────────────────────────────────────────────────

function WidgetSkeleton() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
      <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
    </Paper>
  );
}

// ── 1. North Star Widget ─────────────────────────────────────────────────────

function NorthStarWidget() {
  const { data: journey, isLoading } = useQuery({
    queryKey: ["ikigai", YEAR],
    queryFn: () => ikigaiApi.getJourney(YEAR),
    retry: false,
  });

  if (isLoading) return <WidgetSkeleton />;
  if (!journey?.northStar) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3, p: 3,
        background: "linear-gradient(135deg, rgba(13,110,110,0.06) 0%, transparent 100%)",
        borderColor: "primary.main",
      }}
    >
      <Typography
        variant="caption"
        color="primary.main"
        fontWeight={700}
        sx={{ textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1.5 }}
      >
        ✦ North Star
      </Typography>
      <Typography
        variant="h6"
        fontWeight={400}
        sx={{ fontFamily: "Georgia, serif", lineHeight: 1.6, color: "text.primary" }}
      >
        "{journey.northStar.statement}"
      </Typography>
    </Paper>
  );
}

// ── 2. Goal Progress Widget ──────────────────────────────────────────────────

function GoalProgressWidget({ goals }: { goals: GoalDto[] }) {
  const navigate = useNavigate();
  const active = goals.filter((g) => g.status === "Active");

  if (active.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" gap={1}>
          <TrendingUpIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>Active Goals</Typography>
        </Stack>
        <Chip label={`${active.length} active`} size="small" color="primary" variant="outlined" />
      </Stack>

      <Stack gap={2}>
        {active.map((g) => {
          const color = LIFE_AREA_COLORS[g.lifeArea] ?? "#0D6E6E";
          return (
            <Box
              key={g.id}
              sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
              onClick={() => navigate("/goals")}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>{g.title}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
                  <Chip
                    label={g.energyLevel}
                    size="small"
                    color={ENERGY_COLORS[g.energyLevel] ?? "default"}
                    variant="outlined"
                    sx={{ fontSize: "0.65rem" }}
                  />
                  <Typography variant="caption" color="text.disabled" sx={{ minWidth: 32, textAlign: "right" }}>
                    {g.progress}%
                  </Typography>
                </Stack>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={g.progress}
                sx={{
                  height: 5, borderRadius: 3,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

// ── 3. Habit Streak Widget ───────────────────────────────────────────────────

function HabitStreakWidget() {
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ["habits", YEAR],
    queryFn: () => habitApi.getHabits(YEAR),
    retry: false,
  });

  if (isLoading) return <WidgetSkeleton />;
  if (habits.length === 0) return null;

  const sorted = [...habits].sort((a, b) => b.currentStreak - a.currentStreak);
  const top = sorted[0];

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <LocalFireDepartmentIcon fontSize="small" sx={{ color: "#F97316" }} />
        <Typography variant="subtitle2" fontWeight={700}>Habit Streaks</Typography>
      </Stack>

      {/* Featured top streak */}
      {top.currentStreak > 0 && (
        <Paper
          sx={{
            borderRadius: 2, p: 1.5, mb: 2,
            bgcolor: "rgba(249,115,22,0.06)",
            border: "1px solid rgba(249,115,22,0.3)",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" fontWeight={600}>{top.title}</Typography>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Typography variant="h6" fontWeight={700} sx={{ color: "#F97316" }}>
                {top.currentStreak}
              </Typography>
              <Typography variant="caption" color="text.disabled">days 🔥</Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Stack gap={1}>
        {sorted.slice(top.currentStreak > 0 ? 1 : 0).map((h) => (
          <Stack key={h.id} direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">{h.title}</Typography>
            <Chip
              label={`${h.currentStreak} day${h.currentStreak !== 1 ? "s" : ""}`}
              size="small"
              variant="outlined"
              color={h.currentStreak >= 7 ? "success" : h.currentStreak >= 3 ? "warning" : "default"}
              sx={{ fontSize: "0.7rem" }}
            />
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

// ── 4. Flow Insights Widget ──────────────────────────────────────────────────

function FlowInsightsWidget() {
  const navigate = useNavigate();
  const startSetup = useFlowTimerStore((s) => s.startSetup);

  const { data: insights, isLoading, isError } = useQuery<FlowInsightsDto>({
    queryKey: ["flow-insights"],
    queryFn: () => flowSessionApi.getInsights(),
    retry: 1,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["flow-sessions", YEAR],
    queryFn: () => flowSessionApi.getSessions(YEAR),
    retry: 1,
  });

  if (isLoading) return <WidgetSkeleton />;

  const hours = insights
    ? Math.round(insights.weekTotalMinutes / 60 * 10) / 10
    : 0;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" gap={1}>
          <BoltIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>Flow This Week</Typography>
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          {sessions.length > 0 && (
            <PdfActionButtons
              document={<FlowHistoryPdf sessions={sessions} year={YEAR} />}
              filename={`Flow_History_${YEAR}`}
              subject={`Flow Session History ${YEAR}`}
            />
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            onClick={() => { startSetup(); navigate("/flow"); }}
            sx={{ borderRadius: 4 }}
          >
            Start session
          </Button>
        </Stack>
      </Stack>

      {isError || !insights ? (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body2" color="text.disabled">No session data yet this week</Typography>
          <Typography variant="caption" color="text.disabled">Complete a flow session to see insights</Typography>
        </Box>
      ) : (
        <Stack gap={2}>
          <Stack direction="row" gap={2}>
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, flex: 1, textAlign: "center" }}>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {insights.weekSessionCount}
              </Typography>
              <Typography variant="caption" color="text.disabled">sessions</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, flex: 1, textAlign: "center" }}>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {hours}h
              </Typography>
              <Typography variant="caption" color="text.disabled">deep work</Typography>
            </Paper>
            {insights.weekAvgFlowQuality && (
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, flex: 1, textAlign: "center" }}>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {insights.weekAvgFlowQuality.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.disabled">avg quality</Typography>
              </Paper>
            )}
          </Stack>

          {insights.bestHour !== null && (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              ⏰ Your peak time:{" "}
              <Typography component="span" fontWeight={600} color="text.primary">
                {insights.bestHour < 12
                  ? `${insights.bestHour || 12} AM`
                  : `${insights.bestHour === 12 ? 12 : insights.bestHour - 12} PM`}
              </Typography>
            </Typography>
          )}
        </Stack>
      )}
    </Paper>
  );
}

// ── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  usePageAnalytics("/dashboard");
  const navigate = useNavigate();
  const startSetup = useFlowTimerStore((s) => s.startSetup);

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ["goals", YEAR],
    queryFn: () => goalApi.getGoals(YEAR),
  });

  const activeGoals = goals.filter((g) => g.status === "Active");

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default" }}>

      {/* Header */}
      <Box sx={{
        position: "sticky", top: 0, zIndex: 10,
        bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
        px: 3, py: 1.5,
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={700}>Dashboard</Typography>
            <Typography variant="caption" color="text.disabled">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => { startSetup(); navigate("/flow"); }}
            sx={{ borderRadius: 6 }}
          >
            Start flow session
          </Button>
        </Stack>
      </Box>

      <Box sx={{ px: 3, py: 3, maxWidth: 900, mx: "auto" }}>

        {/* North Star — full width */}
        <Box mb={2.5}>
          <NorthStarWidget />
        </Box>

        {/* 2-column grid for widgets */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2.5,
          }}
        >
          {/* Goal Progress */}
          {loadingGoals ? (
            <WidgetSkeleton />
          ) : (
            <GoalProgressWidget goals={goals} />
          )}

          {/* Habit Streaks */}
          <HabitStreakWidget />

          {/* Flow Insights — spans full width on md+ when goals are present */}
          <Box sx={{ gridColumn: { xs: "1", md: activeGoals.length > 0 ? "1 / -1" : "1" } }}>
            <FlowInsightsWidget />
          </Box>
        </Box>

        {/* Empty state: no active goals */}
        {!loadingGoals && activeGoals.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h2" mb={2}>🎯</Typography>
            <Typography variant="body1" color="text.secondary" mb={1}>
              No active goals yet
            </Typography>
            <Typography variant="body2" color="text.disabled" mb={3}>
              Set your goals to start tracking progress here
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate("/goals")}
              sx={{ borderRadius: 6 }}
            >
              Set goals →
            </Button>
          </Box>
        )}

        {/* Quick links */}
        <Box mt={4}>
          <Typography variant="caption" color="text.disabled"
            sx={{ textTransform: "uppercase", letterSpacing: 1, display: "block", mb: 1.5 }}>
            Quick links
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {[
              { label: "✅ Today's tasks", path: "/tasks" },
              { label: "🌸 Ikigai", path: "/ikigai" },
              { label: "🗺️ Mind map", path: "/map" },
              { label: "🔄 Weekly review", path: "/reviews" },
              { label: "📅 Calendar", path: "/calendar" },
            ].map((l) => (
              <Button
                key={l.path}
                size="small"
                variant="outlined"
                onClick={() => navigate(l.path)}
                sx={{ borderRadius: 4, fontSize: "0.8rem" }}
              >
                {l.label}
              </Button>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
