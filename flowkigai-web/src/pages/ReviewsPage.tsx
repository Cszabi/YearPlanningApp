import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box, Typography, Stack, Button, Paper, Chip, CircularProgress, Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import { reviewApi, type ReviewDto } from "@/api/reviewApi";
import WeeklyReview from "@/components/reviews/WeeklyReview";

const YEAR = new Date().getFullYear();
const ENERGY_LABELS = ["", "Drained", "Low", "Neutral", "Good", "Energised"];

function getMonday(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(periodStart: string): string {
  const start = new Date(periodStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function ReviewCard({ review, onEdit }: { review: ReviewDto; onEdit: () => void }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, "&:hover": { bgcolor: "action.hover" } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="body2" fontWeight={600}>
            Week of {formatWeekRange(review.periodStart)}
          </Typography>
          <Stack direction="row" gap={1} mt={0.5} alignItems="center">
            {review.isComplete ? (
              <Chip icon={<CheckCircleIcon />} label="Complete" color="success" size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
            ) : (
              <Chip label="Draft" size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
            )}
            {review.energyRating && (
              <Typography variant="caption" color="text.disabled">
                Energy: {ENERGY_LABELS[review.energyRating]} ({review.energyRating}/5)
              </Typography>
            )}
          </Stack>
        </Box>
        <Button
          size="small"
          startIcon={review.isComplete ? undefined : <EditIcon />}
          onClick={onEdit}
          variant={review.isComplete ? "text" : "outlined"}
        >
          {review.isComplete ? "View" : "Continue"}
        </Button>
      </Stack>
    </Paper>
  );
}

export default function ReviewsPage() {
  const [activeWeek, setActiveWeek] = useState<string | null>(null);

  const { data: reviews = [], isLoading, isError, refetch } = useQuery<ReviewDto[]>({
    queryKey: ["reviews", "Weekly", YEAR],
    queryFn: () => reviewApi.getReviews("Weekly", YEAR),
    enabled: !activeWeek,
    retry: 1,
  });

  const thisWeek = getMonday();

  if (activeWeek) {
    return <WeeklyReview weekStartDate={activeWeek} onBack={() => setActiveWeek(null)} />;
  }

  const thisWeekReview = reviews.find((r) => r.periodStart.slice(0, 10) === thisWeek);

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
            <Typography variant="h6" fontWeight={700}>Weekly Reviews</Typography>
            <Typography variant="caption" color="text.disabled">
              Reflect, reset, re-commit
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setActiveWeek(thisWeek)}
            sx={{ borderRadius: 6 }}
          >
            {thisWeekReview ? "Continue this week" : "Start this week's review"}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ px: 3, py: 3, maxWidth: 680, mx: "auto" }}>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert
            severity="error"
            action={<Button size="small" onClick={() => refetch()}>Retry</Button>}
            sx={{ mb: 2 }}
          >
            Failed to load reviews.
          </Alert>
        )}

        {!isLoading && reviews.length === 0 && (
          <Box sx={{ textAlign: "center", py: 12 }}>
            <Typography variant="h2" mb={2}>🔄</Typography>
            <Typography variant="body1" color="text.secondary" mb={1}>
              No reviews yet
            </Typography>
            <Typography variant="body2" color="text.disabled" mb={4}>
              A weekly review keeps you aligned with your goals and values.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => setActiveWeek(thisWeek)}
              sx={{ borderRadius: 6 }}
            >
              Start your first review →
            </Button>
          </Box>
        )}

        {!isLoading && reviews.length > 0 && (
          <Stack gap={1.5}>
            {[...reviews]
              .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
              .map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  onEdit={() => setActiveWeek(r.periodStart.slice(0, 10))}
                />
              ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
