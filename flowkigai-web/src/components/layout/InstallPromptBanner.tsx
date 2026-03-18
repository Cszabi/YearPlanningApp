import { useState, useEffect } from "react";
import { Box, Button, IconButton, Typography, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const DISMISS_KEY = "flowkigai-install-dismissed";
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  const stored = localStorage.getItem(DISMISS_KEY);
  if (!stored) return false;
  return Date.now() - Number(stored) < DISMISS_DAYS * 86400000;
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    if (isIos()) {
      setShowIos(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1500,
        bgcolor: "#0D6E6E",
        color: "white",
        px: { xs: 2, sm: 3 },
        py: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        {showIos ? (
          <Typography variant="body2" sx={{ flex: 1 }}>
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install Flowkigai
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ flex: 1 }}>
            Install Flowkigai for the best experience
          </Typography>
        )}

        <Stack direction="row" spacing={1} alignItems="center">
          {!showIos && (
            <Button
              size="small"
              variant="contained"
              onClick={install}
              sx={{ bgcolor: "white", color: "#0D6E6E", fontWeight: 600, "&:hover": { bgcolor: "#f0fafa" } }}
            >
              Install
            </Button>
          )}
          <IconButton size="small" onClick={dismiss} sx={{ color: "rgba(255,255,255,0.8)" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}
