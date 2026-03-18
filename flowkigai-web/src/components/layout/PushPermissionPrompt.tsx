import { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Stack, Button,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "push-prompt-dismissed-until";
const DISMISS_DAYS = 7;

export default function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const { isPushSupported, isPushEnabled, subscribeToPush } = usePushNotifications();

  useEffect(() => {
    if (!isPushSupported) return;
    if (isPushEnabled) return;
    if (Notification.permission !== "default") return;

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const timer = setTimeout(() => setVisible(true), 30_000);
    return () => clearTimeout(timer);
  }, [isPushSupported, isPushEnabled]);

  if (!visible) return null;

  const handleEnable = async () => {
    setVisible(false);
    await subscribeToPush();
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + DISMISS_DAYS * 86_400_000)
    );
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1400,
        width: { xs: "calc(100vw - 32px)", sm: 420 },
      }}
    >
      <Paper elevation={6} sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <NotificationsActiveIcon color="primary" sx={{ mt: 0.25 }} />
          <Box flex={1}>
            <Typography fontWeight={600} mb={0.5}>
              Stay on track with reminders
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Get reminders for your weekly review and habit streaks.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" onClick={handleEnable}>
                Enable notifications
              </Button>
              <Button variant="text" size="small" onClick={handleDismiss}>
                Maybe later
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
