import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert, Divider,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DATA_ITEMS = [
  "Ikigai journeys, values & North Star",
  "Goals, milestones & tasks",
  "Habits & habit logs",
  "Flow sessions",
  "Mind maps",
  "Weekly reviews",
];

export default function DeleteAccountDialog({ open, onClose }: Props) {
  const logout = useAuthStore((s) => s.logout);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    if (loading) return;
    setPassword("");
    setError(null);
    onClose();
  }

  async function handleDelete() {
    if (!password) {
      setError("Please enter your password to confirm.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await axios.delete("/api/v1/auth/account", {
        data: { passwordConfirmation: password },
      });
      logout();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error?.message;
        setError(msg ?? "Could not delete account. Please try again.");
      } else {
        setError("An unexpected error occurred.");
      }
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <WarningAmberIcon color="error" />
        Delete your account
      </DialogTitle>

      <DialogContent>
        {/* GDPR disclosure */}
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            This action is permanent and cannot be undone.
          </Typography>
          <Typography variant="body2">
            Deleting your account will immediately and permanently erase all your
            personal data from our servers, in accordance with your right to erasure
            under GDPR (Article 17) and similar data protection laws.
          </Typography>
        </Alert>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          The following data will be permanently deleted:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 2 }}>
          {DATA_ITEMS.map((item) => (
            <Typography key={item} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {item}
            </Typography>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          We do not sell your data. Before deleting, you can export your calendar
          events as an .ics file from the Calendar page.
        </Typography>

        <TextField
          label="Enter your password to confirm"
          type="password"
          fullWidth
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDelete()}
          disabled={loading}
          error={!!error}
          helperText={error ?? undefined}
          autoComplete="current-password"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          disabled={loading || !password}
          variant="contained"
          color="error"
        >
          {loading ? "Deleting…" : "Permanently delete account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
