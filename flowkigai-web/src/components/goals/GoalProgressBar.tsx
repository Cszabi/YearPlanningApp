import { useState } from "react";
import {
  Box, Stack, Typography, Slider, TextField, IconButton,
  Button, Snackbar, Alert, Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { goalApi, GoalDto } from "@/api/goalApi";
import { useMutation } from "@tanstack/react-query";

interface GoalProgressBarProps {
  percent: number;
  goalId: string;
  editable?: boolean;
  size?: "sm" | "md";
  onUpdated?: (updated: GoalDto) => void;
}

const TRACK_COLOR = "#2A3146";
const FILL_COLOR = "#0D9E9E";

export default function GoalProgressBar({
  percent,
  goalId,
  editable = false,
  size = "sm",
  onUpdated,
}: GoalProgressBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(percent);
  const [snackbar, setSnackbar] = useState<{ open: boolean; severity: "success" | "info"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const barHeight = size === "md" ? 10 : 6;
  const labelVariant = size === "md" ? "body2" : "caption";

  const { mutate: save, isPending } = useMutation({
    mutationFn: (newPercent: number) => goalApi.updateProgress(goalId, newPercent),
    onSuccess: (updated) => {
      setEditing(false);
      onUpdated?.(updated);
      if (updated.progressPercent === 100 && percent < 100) {
        setSnackbar({ open: true, severity: "success", message: "Goal achieved! Marked as complete." });
      } else if (updated.progressPercent < 100 && percent === 100) {
        setSnackbar({ open: true, severity: "info", message: "Goal progress updated — back in progress." });
      } else {
        setSnackbar({ open: true, severity: "success", message: "Progress saved." });
      }
    },
  });

  function handleEdit() {
    setDraft(percent);
    setEditing(true);
  }

  function handleCancel() {
    setDraft(percent);
    setEditing(false);
  }

  function handleDraftChange(val: number) {
    setDraft(Math.max(0, Math.min(100, val)));
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography variant={labelVariant} color="text.disabled">Progress</Typography>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Typography variant={labelVariant} color="text.disabled" fontWeight={600}>
            {percent}%
          </Typography>
          {editable && !editing && (
            <Tooltip title="Update progress">
              <IconButton size="small" onClick={handleEdit} sx={{ p: 0.25 }}>
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Progress bar */}
      <Box
        sx={{
          height: barHeight,
          borderRadius: 99,
          bgcolor: TRACK_COLOR + "33",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${percent}%`,
            bgcolor: FILL_COLOR,
            borderRadius: 99,
            transition: "width 0.3s ease",
          }}
        />
      </Box>

      {/* Edit controls */}
      {editing && (
        <Box mt={1.5}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Slider
              value={draft}
              onChange={(_, val) => handleDraftChange(val as number)}
              min={0}
              max={100}
              step={5}
              size="small"
              sx={{ flex: 1, color: FILL_COLOR }}
            />
            <TextField
              value={draft}
              onChange={(e) => handleDraftChange(Number(e.target.value))}
              type="number"
              size="small"
              inputProps={{ min: 0, max: 100 }}
              sx={{ width: 70 }}
            />
          </Stack>
          <Stack direction="row" gap={1} mt={1}>
            <Button
              size="small"
              variant="contained"
              disabled={isPending}
              onClick={() => save(draft)}
              sx={{ bgcolor: FILL_COLOR, "&:hover": { bgcolor: "#0B8A8A" } }}
            >
              Save
            </Button>
            <Button size="small" variant="text" disabled={isPending} onClick={handleCancel}>
              Cancel
            </Button>
          </Stack>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
