import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import {
  Box, Typography, Stack, Paper, Chip, Button, Skeleton,
  Alert, Checkbox, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Tooltip,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import BoltIcon from "@mui/icons-material/Bolt";
import {
  dashboardApi,
  type DashboardDto,
  type DashboardTaskDto,
  type DashboardHabitDto,
  type IkigaiDistributionDto,
} from "@/api/dashboardApi";
import { goalApi } from "@/api/goalApi";
import { habitApi } from "@/api/habitApi";
import { useFlowTimerStore } from "@/stores/flowTimerStore";

const YEAR = new Date().getFullYear();

// ── Ikigai donut colors (brand palette — intentionally hardcoded) ─────────
const IKIGAI_COLORS: Record<string, string> = {
  love: "#F43F5E",
  goodAt: "#7C3AED",
  worldNeeds: "#0D6E6E",
  paidFor: "#F5A623",
  intersection: "#E8705A",
};

const IKIGAI_LABELS: Record<string, string> = {
  love: "Love",
  goodAt: "Good At",
  worldNeeds: "World Needs",
  paidFor: "Paid For",
  intersection: "Intersection",
};

// ── Section skeletons ─────────────────────────────────────────────────────
function SectionSkeleton({ height = 120 }: { height?: number }) {
  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: "divider", borderRadius: 3, p: 3 }}
    >
      <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2 }} />
    </Paper>
  );
}

// ── Ikigai Donut SVG ──────────────────────────────────────────────────────
function IkigaiDonut({ dist }: { dist: IkigaiDistributionDto }) {
  const entries = [
    { key: "love", count: dist.love },
    { key: "goodAt", count: dist.goodAt },
    { key: "worldNeeds", count: dist.worldNeeds },
    { key: "paidFor", count: dist.paidFor },
    { key: "intersection", count: dist.intersection },
  ];
  const total = entries.reduce((s, e) => s + e.count, 0);

  if (total === 0) {
    return (
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={34} fill="none" stroke="#ccc" strokeWidth={8} opacity={0.3} />
        <text x={40} y={44} textAnchor="middle" fontSize={12} fill="#999">0</text>
      </svg>
    );
  }

  const radius = 34;
  const cx = 40;
  const cy = 40;
  const strokeWidth = 8;
  const gapDeg = 2;
  const totalGap = gapDeg * entries.filter((e) => e.count > 0).length;
  const available = 360 - totalGap;

  let currentAngle = -90;
  const arcs = entries
    .filter((e) => e.count > 0)
    .map((e) => {
      const sweep = (e.count / total) * available;
      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = ((currentAngle + sweep) * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      const large = sweep > 180 ? 1 : 0;
      const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
      currentAngle += sweep + gapDeg;
      return { key: e.key, d, count: e.count };
    });

  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      {arcs.map((arc) => (
        <Tooltip key={arc.key} title={`${IKIGAI_LABELS[arc.key]}: ${arc.count}`} arrow>
          <path
            d={arc.d}
            fill="none"
            stroke={IKIGAI_COLORS[arc.key]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Tooltip>
      ))}
      <text x={40} y={44} textAnchor="middle" fontSize={13} fill="currentColor" opacity={0.5}>
        {total}
      </text>
    </svg>
  );
}

// ── Flow sparkline SVG ────────────────────────────────────────────────────
function FlowSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const barW = 8;
  const gap = 4;
  const h = 40;
  const w = data.length * (barW + gap) - gap;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((v, i) => {
        const barH = Math.max((v / max) * (h - 4), 2);
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={2}
            fill="#0D6E6E"
            opacity={v > 0 ? 0.8 : 0.2}
          />
        );
      })}
    </svg>
  );
}

// ── Relative time helper ──────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — IDENTITY ANCHOR
// ═══════════════════════════════════════════════════════════════════════════
function IdentityAnchor({ data }: { data: DashboardDto }) {
  const navigate = useNavigate();

  const distTotal =
    data.ikigaiDistribution.love +
    data.ikigaiDistribution.goodAt +
    data.ikigaiDistribution.worldNeeds +
    data.ikigaiDistribution.paidFor +
    data.ikigaiDistribution.intersection;

  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3, p: 3 }}>
      {/* North Star */}
      <Box mb={3}>
        {data.northStar ? (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1 }}
            >
              NORTH STAR
            </Typography>
            <Typography
              sx={{
                fontFamily: "Georgia, serif",
                fontSize: { xs: 20, md: 24 },
                fontStyle: "italic",
                color: "text.primary",
                lineHeight: 1.4,
              }}
            >
              &ldquo;{data.northStar}&rdquo;
            </Typography>
          </>
        ) : (
          <Typography
            sx={{
              fontFamily: "Georgia, serif",
              fontSize: 16,
              fontStyle: "italic",
              color: "text.secondary",
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
            }}
            onClick={() => navigate("/ikigai")}
          >
            Your North Star awaits &rarr;
          </Typography>
        )}
      </Box>

      {/* Values chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={3}>
        {data.topValues.length > 0 ? (
          data.topValues.map((v) => (
            <Chip
              key={v}
              label={v}
              size="small"
              variant="outlined"
              onClick={() => navigate("/ikigai")}
              sx={{
                borderColor: "primary.main",
                color: "primary.main",
                cursor: "pointer",
              }}
            />
          ))
        ) : (
          <Chip
            label="Clarify your values →"
            size="small"
            variant="outlined"
            onClick={() => navigate("/ikigai")}
            sx={{
              borderColor: "text.secondary",
              color: "text.secondary",
              cursor: "pointer",
            }}
          />
        )}
      </Stack>

      {/* Ikigai donut + daily question */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Box sx={{ flexShrink: 0 }}>
          {distTotal === 0 ? (
            <Box
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/map")}
            >
              <IkigaiDonut dist={data.ikigaiDistribution} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", textAlign: "center", mt: 0.5, fontSize: 10 }}
              >
                Map what matters &rarr;
              </Typography>
            </Box>
          ) : (
            <IkigaiDonut dist={data.ikigaiDistribution} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "text.secondary",
              fontSize: 18,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.dailyQuestion}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — TODAY
// ═══════════════════════════════════════════════════════════════════════════
function TodaySection({ data }: { data: DashboardDto }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startSetup = useFlowTimerStore((s) => s.startSetup);
  const today = new Date().toISOString().slice(0, 10);

  async function completeTask(task: DashboardTaskDto) {
    try {
      await goalApi.updateTaskStatus(task.id, "Done");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["goals", YEAR] });
    } catch { /* ignore */ }
  }

  async function logHabit(habit: DashboardHabitDto) {
    try {
      await habitApi.logHabit(habit.habitId);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["habits", YEAR] });
    } catch { /* ignore */ }
  }

  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3, p: 3 }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        TODAY
      </Typography>

      {/* Next Action */}
      {data.nextAction ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
          <Checkbox
            size="small"
            onChange={() => completeTask(data.nextAction!)}
            sx={{ mt: -0.5 }}
          />
          <BoltIcon fontSize="small" sx={{ color: "warning.main", mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
              {data.nextAction.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.nextAction.goalTitle}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Paper
          sx={{ bgcolor: "background.default", p: 2, mb: 2, borderRadius: 2, cursor: "pointer" }}
          onClick={() => navigate("/goals")}
        >
          <Typography variant="body2" color="text.secondary">
            Pick today&apos;s focus &rarr;
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Mark a task with &#9889; to anchor your day
          </Typography>
        </Paper>
      )}

      {/* Today's tasks */}
      {data.todaysTasks.length > 0 ? (
        <List dense disablePadding sx={{ mb: 2 }}>
          {data.todaysTasks.map((t) => {
            const overdue = t.dueDate && t.dueDate.slice(0, 10) < today;
            return (
              <ListItem
                key={t.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/goals/${t.goalId}`)}
                    sx={{ opacity: 0.5 }}
                  >
                    <BoltIcon
                      fontSize="small"
                      sx={{ color: t.isNextAction ? "warning.main" : "action.disabled" }}
                    />
                  </IconButton>
                }
              >
                <ListItemButton
                  dense
                  onClick={() => navigate(`/goals/${t.goalId}`)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Checkbox
                      size="small"
                      edge="start"
                      onClick={(e) => { e.stopPropagation(); completeTask(t); }}
                      sx={{ p: 0 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.title}
                    primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  />
                  {overdue && (
                    <Box
                      sx={{
                        width: 8, height: 8, borderRadius: "50%",
                        bgcolor: "error.main", flexShrink: 0, ml: 1,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography variant="body2" fontStyle="italic" color="text.secondary" mb={2}>
          Nothing due today &mdash; breathe.
        </Typography>
      )}

      {/* Habits row */}
      {data.todaysHabits.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ overflowX: "auto", pb: 1, mb: 2 }}
        >
          {data.todaysHabits.map((h) => (
            <Chip
              key={h.habitId}
              label={`${h.title} · ${h.currentStreak}🔥`}
              size="small"
              variant={h.loggedToday ? "outlined" : "filled"}
              color={h.loggedToday ? "default" : "primary"}
              onClick={h.loggedToday ? undefined : () => logHabit(h)}
              sx={{
                flexShrink: 0,
                opacity: h.loggedToday ? 0.6 : 1,
                cursor: h.loggedToday ? "default" : "pointer",
              }}
            />
          ))}
        </Stack>
      )}

      {/* Flow quick-start */}
      <Button
        fullWidth
        variant="outlined"
        startIcon={<PlayArrowIcon />}
        onClick={() => {
          startSetup();
          navigate("/flow");
        }}
        sx={{ borderRadius: 2 }}
      >
        Start 25-min flow session
      </Button>
    </Paper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — PROGRESS
// ═══════════════════════════════════════════════════════════════════════════
function ProgressSection({ data }: { data: DashboardDto }) {
  const navigate = useNavigate();

  const totalWeekMin = data.weeklyFlowMinutes.reduce((s, v) => s + v, 0);

  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3, p: 3 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        {/* Active goals */}
        <Box
          sx={{ cursor: "pointer", "&:hover": { opacity: 0.7 } }}
          onClick={() => navigate("/goals")}
        >
          <Typography variant="h3" fontWeight={700}>{data.activeGoalCount}</Typography>
          <Typography variant="caption" color="text.secondary">Active goals</Typography>
        </Box>

        {/* Nearest deadline */}
        <Box
          sx={{ cursor: data.nearestDeadline ? "pointer" : "default" }}
          onClick={() => data.nearestDeadline && navigate(`/goals/${data.nearestDeadline.goalId}`)}
        >
          {data.nearestDeadline ? (
            <>
              <Typography variant="body2" noWrap>{data.nearestDeadline.title}</Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  color: data.nearestDeadline.daysRemaining < 3
                    ? "error.main"
                    : data.nearestDeadline.daysRemaining < 7
                      ? "warning.main"
                      : "success.main",
                }}
              >
                in {data.nearestDeadline.daysRemaining} days
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No upcoming deadlines
            </Typography>
          )}
        </Box>

        {/* Review status */}
        <Box>
          <Chip
            label={
              data.reviewStatus === "Done"
                ? "Review: Done"
                : data.reviewStatus === "Pending"
                  ? "Review pending"
                  : "Review overdue"
            }
            color={
              data.reviewStatus === "Done"
                ? "success"
                : data.reviewStatus === "Pending"
                  ? "warning"
                  : "error"
            }
            size="small"
            onClick={() => navigate("/reviews")}
            sx={{ cursor: "pointer" }}
          />
        </Box>

        {/* Streak risk */}
        {data.habitStreakRiskCount > 0 && (
          <Box>
            <Chip
              label={`🔥 ${data.habitStreakRiskCount} streak(s) at risk`}
              color={data.habitStreakRiskCount > 2 ? "error" : "warning"}
              size="small"
            />
          </Box>
        )}

        {/* Flow insights — full width */}
        <Box
          sx={{
            gridColumn: "1 / -1",
            cursor: "pointer",
            "&:hover": { opacity: 0.7 },
          }}
          onClick={() => navigate("/flow")}
        >
          <FlowSparkline data={data.weeklyFlowMinutes} />
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {totalWeekMin} min this week
          </Typography>
          {data.flowInsight?.bestDayOfWeek && data.flowInsight?.bestHourOfDay != null && (
            <Typography variant="caption" color="text.disabled">
              Best day: {data.flowInsight.bestDayOfWeek} &middot; Best hour: {data.flowInsight.bestHourOfDay}:00
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — REFLECT STRIP
// ═══════════════════════════════════════════════════════════════════════════
function ReflectStrip({ data }: { data: DashboardDto }) {
  const navigate = useNavigate();

  return (
    <Paper elevation={0} sx={{ bgcolor: "background.default", borderRadius: 3, p: 3 }}>
      {data.lastReflection ? (
        <>
          <Typography
            sx={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "text.primary",
              mb: 1,
            }}
          >
            &ldquo;{data.lastReflection.content}&rdquo;
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {relativeTime(data.lastReflection.createdAt)}
          </Typography>
          <Typography
            variant="body2"
            color="primary.main"
            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            onClick={() => navigate("/reviews")}
          >
            Continue reflecting &rarr;
          </Typography>
        </>
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ cursor: "pointer", "&:hover": { color: "primary.main" } }}
          onClick={() => navigate("/reviews")}
        >
          Your first weekly review waits. &rarr;
        </Typography>
      )}
    </Paper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  usePageAnalytics("dashboard");

  const { data, isLoading, isError, refetch } = useQuery<DashboardDto>({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.getDashboard,
    staleTime: 60_000,
  });

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        bgcolor: "background.default",
        "@keyframes fadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          maxWidth: 640,
          mx: "auto",
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          animation: "fadeIn 150ms ease-out",
        }}
      >
        <Stack direction="column" spacing={3}>
          {isLoading ? (
            <>
              <SectionSkeleton height={160} />
              <SectionSkeleton height={200} />
              <SectionSkeleton />
              <SectionSkeleton height={60} />
            </>
          ) : isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            >
              Failed to load dashboard. Please try again.
            </Alert>
          ) : data ? (
            <>
              <IdentityAnchor data={data} />
              <TodaySection data={data} />
              <ProgressSection data={data} />
              <ReflectStrip data={data} />
            </>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
