import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import {
  Box, Typography, Tooltip, IconButton, Button,
  List, ListItemButton, ListItemIcon, ListItemText, Divider,
  Drawer, useMediaQuery,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LogoutIcon from "@mui/icons-material/Logout";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/api/authApi";
import DeleteAccountDialog from "./DeleteAccountDialog";
import FlowkigaiLogo from "./FlowkigaiLogo";

const SIDEBAR_W = 200;

const tabs = [
  { path: "/ikigai",    label: "Ikigai",     icon: "🌸" },
  { path: "/map",       label: "Map",         icon: "🗺️" },
  { path: "/goals",     label: "Goals",       icon: "🎯" },
  { path: "/calendar",  label: "Calendar",    icon: "📅" },
  { path: "/flow",      label: "Flow",        icon: "🌊" },
  { path: "/tasks",     label: "Tasks",       icon: "✅" },
  { path: "/reviews",   label: "Reviews",     icon: "🔄" },
  { path: "/dashboard", label: "Dashboard",   icon: "📊" },
];

export default function TabNav() {
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const isMobile = useMediaQuery("(max-width: 600px)");

  async function handleResend() {
    setResending(true);
    try {
      await authApi.resendVerification();
    } finally {
      setResending(false);
    }
  }

  if (!user) return <Navigate to="/" replace />;

  // ── Shared nav content (desktop sidebar + mobile Drawer) ─────────────────
  const navList = (
    <>
      <List dense disablePadding sx={{ flex: 1, pt: 1 }}>
        {tabs.map((tab) => {
          const active = location.pathname.startsWith(tab.path);
          return (
            <ListItemButton
              key={tab.path}
              component={NavLink}
              to={tab.path}
              onClick={() => setDrawerOpen(false)}
              sx={{
                mx: 1, mb: 0.25, borderRadius: 2,
                "&.active": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                  "& .MuiListItemText-primary": { color: "primary.contrastText", fontWeight: 600 },
                },
                "&:not(.active):hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, fontSize: 16 }}>{tab.icon}</ListItemIcon>
              <ListItemText
                primary={tab.label}
                primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}
              />
            </ListItemButton>
          );
        })}
        {user.role === "Admin" && (
          <>
            <ListItemButton
              component={NavLink}
              to="/admin"
              onClick={() => setDrawerOpen(false)}
              end
              sx={{
                mx: 1, mb: 0.25, borderRadius: 2,
                "&.active": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                  "& .MuiListItemText-primary": { color: "primary.contrastText", fontWeight: 600 },
                },
                "&:not(.active):hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, fontSize: 16 }}>⚙️</ListItemIcon>
              <ListItemText primary="Admin" primaryTypographyProps={{ fontSize: "0.875rem" }} />
            </ListItemButton>
            <ListItemButton
              component={NavLink}
              to="/admin/analytics"
              onClick={() => setDrawerOpen(false)}
              sx={{
                mx: 1, mb: 0.25, borderRadius: 2,
                "&.active": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                  "& .MuiListItemText-primary": { color: "primary.contrastText", fontWeight: 600 },
                },
                "&:not(.active):hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, fontSize: 16 }}>📈</ListItemIcon>
              <ListItemText primary="Analytics" primaryTypographyProps={{ fontSize: "0.875rem" }} />
            </ListItemButton>
          </>
        )}
      </List>

      <Divider />
      <Box sx={{ px: 1.5, py: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}>
        <Tooltip title="Notification settings">
          <IconButton size="small" component={NavLink} to="/settings" onClick={() => setDrawerOpen(false)}>
            <NotificationsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={theme === "light" ? "Dark mode" : "Light mode"}>
          <IconButton size="small" onClick={toggleTheme}>
            {theme === "light" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Delete account (GDPR)">
          <IconButton size="small" onClick={() => { setDrawerOpen(false); setDeleteOpen(true); }}
            sx={{ color: "error.main", opacity: 0.6, "&:hover": { opacity: 1 } }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={logout}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      {!isMobile && (
        <Box sx={{
          width: SIDEBAR_W, flexShrink: 0,
          display: "flex", flexDirection: "column",
          bgcolor: "background.paper", borderRight: 1, borderColor: "divider",
        }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
            <Box sx={{ color: "primary.main", mb: 0.25 }}>
              <FlowkigaiLogo size="sm" />
            </Box>
            <Typography variant="caption" color="text.disabled" noWrap>
              {user.displayName}
            </Typography>
          </Box>
          {navList}
        </Box>
      )}

      {/* ── Mobile: floating hamburger ────────────────────────────────────────── */}
      {isMobile && (
        <IconButton
          onClick={() => setDrawerOpen(true)}
          size="small"
          sx={{
            position: "fixed", top: 10, left: 10, zIndex: 1100,
            bgcolor: "background.paper", boxShadow: 2, borderRadius: 2,
            width: 36, height: 36,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>
      )}

      {/* ── Mobile: Drawer ───────────────────────────────────────────────────── */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 240, display: "flex", flexDirection: "column" } }}
      >
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ color: "primary.main" }}>
            <FlowkigaiLogo size="sm" />
          </Box>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ px: 2.5, pt: 1 }}>
          {user.displayName}
        </Typography>
        {navList}
      </Drawer>

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", minWidth: 0 }}>
        {/* Unverified email banner */}
        {!user.isEmailVerified && !bannerDismissed && (
          <Box
            sx={{
              px: 2, py: 1, flexShrink: 0,
              bgcolor: "warning.light",
              display: "flex", alignItems: "center", gap: 1,
              borderBottom: 1, borderColor: "divider",
            }}
          >
            <Typography variant="caption" sx={{ flex: 1, color: "warning.dark" }}>
              Please verify your email address. Check your inbox for a link from Flowkigai.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              disabled={resending}
              onClick={handleResend}
              sx={{ flexShrink: 0, fontSize: "0.7rem" }}
            >
              {resending ? "Sending…" : "Resend"}
            </Button>
            <Tooltip title="Dismiss">
              <IconButton size="small" onClick={() => setBannerDismissed(true)} sx={{ color: "warning.dark" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
