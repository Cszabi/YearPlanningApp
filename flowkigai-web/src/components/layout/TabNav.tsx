import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import {
  Box, Typography, Tooltip, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Divider,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LogoutIcon from "@mui/icons-material/Logout";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/context/ThemeContext";
import DeleteAccountDialog from "./DeleteAccountDialog";

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

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: SIDEBAR_W,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        {/* Brand */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" fontWeight={700} color="primary">
            Flowkigai
          </Typography>
          <Typography variant="caption" color="text.disabled" noWrap>
            {user.displayName}
          </Typography>
        </Box>

        {/* Nav items */}
        <List dense disablePadding sx={{ flex: 1, pt: 1 }}>
          {tabs.map((tab) => {
            const active = location.pathname.startsWith(tab.path);
            return (
              <ListItemButton
                key={tab.path}
                component={NavLink}
                to={tab.path}
                sx={{
                  mx: 1,
                  mb: 0.25,
                  borderRadius: 2,
                  "&.active": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                    "& .MuiListItemText-primary": { color: "primary.contrastText", fontWeight: 600 },
                  },
                  "&:not(.active):hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, fontSize: 16 }}>
                  {tab.icon}
                </ListItemIcon>
                <ListItemText
                  primary={tab.label}
                  primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}
                />
              </ListItemButton>
            );
          })}
        </List>

        {/* Bottom actions */}
        <Divider />
        <Box sx={{ px: 1.5, py: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={theme === "light" ? "Dark mode" : "Light mode"}>
            <IconButton size="small" onClick={toggleTheme}>
              {theme === "light" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Delete account (GDPR)">
            <IconButton size="small" onClick={() => setDeleteOpen(true)} sx={{ color: "error.main", opacity: 0.6, "&:hover": { opacity: 1 } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={logout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />

      {/* ── Page content ──────────────────────────────────────────────────────── */}
      <Box component="main" sx={{ flex: 1, overflow: "auto", position: "relative", minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
