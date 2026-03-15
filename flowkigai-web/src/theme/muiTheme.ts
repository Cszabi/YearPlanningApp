import { createTheme } from "@mui/material/styles";

const BRAND = {
  teal:   "#0D6E6E",
  tealDark: "#0A5555",
  tealLight: "#E0F2F2",
  amber:  "#F59E0B",
  rose:   "#F43F5E",
  violet: "#8B5CF6",
};

// ── Shared overrides ──────────────────────────────────────────────────────────
const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 24,
        textTransform: "none" as const,
        fontWeight: 500,
        boxShadow: "none",
        "&:hover": { boxShadow: "none" },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 8, fontSize: "0.75rem" },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: { borderRadius: 4, height: 6 },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: "none" as const,
        minHeight: 52,
        fontSize: "0.75rem",
        fontWeight: 500,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 20 },
    },
  },
  MuiTextField: {
    defaultProps: { size: "small" as const, variant: "outlined" as const },
    styleOverrides: {
      root: { "& .MuiOutlinedInput-root": { borderRadius: 10 } },
    },
  },
  MuiSelect: {
    styleOverrides: {
      root: { borderRadius: 10 },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: { boxShadow: "0 1px 4px rgba(0,0,0,0.12)" },
    },
  },
};

// ── Light theme ───────────────────────────────────────────────────────────────
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: BRAND.teal, dark: BRAND.tealDark, light: "#1A9090", contrastText: "#fff" },
    secondary: { main: BRAND.amber, contrastText: "#fff" },
    error:     { main: BRAND.rose },
    background: { default: "#FAFAF8", paper: "#FFFFFF" },
    text: {
      primary:   "#1A1A2E",
      secondary: "#374151",
      disabled:  "#9CA3AF",
    },
    divider: "#E5E7EB",
  },
  typography: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 500 },
  },
  shape: { borderRadius: 10 },
  components: sharedComponents,
});

// ── Dark theme ────────────────────────────────────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary:   { main: "#2DD4D4", dark: "#1AAFAF", light: "#5EE0E0", contrastText: "#0F172A" },
    secondary: { main: BRAND.amber, contrastText: "#0F172A" },
    error:     { main: BRAND.rose },
    background: { default: "#0F172A", paper: "#1E293B" },
    text: {
      primary:   "#F1F5F9",
      secondary: "#CBD5E1",
      disabled:  "#64748B",
    },
    divider: "#334155",
  },
  typography: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 500 },
  },
  shape: { borderRadius: 10 },
  components: {
    ...sharedComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
          backgroundImage: "none",
        },
      },
    },
  },
});
