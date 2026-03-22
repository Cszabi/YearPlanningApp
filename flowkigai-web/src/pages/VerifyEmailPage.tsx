import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { authApi } from "@/api/authApi";
import FlowkigaiLogo from "@/components/layout/FlowkigaiLogo";
import { useAuthStore } from "@/stores/authStore";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const setEmailVerified = useAuthStore((s) => s.setEmailVerified);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => {
        setEmailVerified(true);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [token, setEmailVerified]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        gap: 3,
        px: 4,
        textAlign: "center",
      }}
    >
      <Box sx={{ mb: 2, color: "primary.main" }}>
        <FlowkigaiLogo size="sm" />
      </Box>

      {status === "loading" && (
        <>
          <CircularProgress size={40} />
          <Typography color="text.secondary">Verifying your email…</Typography>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "success.main" }} />
          <Typography variant="h6">Email verified!</Typography>
          <Typography color="text.secondary" maxWidth={360}>
            Your email address has been confirmed. You're all set.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/ikigai")}>
            Continue to app →
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <ErrorOutlineIcon sx={{ fontSize: 56, color: "error.main" }} />
          <Typography variant="h6">Verification failed</Typography>
          <Typography color="text.secondary" maxWidth={360}>
            This link may have expired or already been used. You can request a
            new verification email from inside the app.
          </Typography>
          <Button variant="outlined" onClick={() => navigate("/")}>
            Go to app
          </Button>
        </>
      )}
    </Box>
  );
}
