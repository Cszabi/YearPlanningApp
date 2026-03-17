import { Navigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useAuthStore } from "@/stores/authStore";
import content from "@/docs/philosophy.md?raw";

// ── Markdown renderer ─────────────────────────────────────────────────────────
const mdComponents: Components = {
  h1: ({ children }) => (
    <Typography variant="h4" component="h1" fontFamily="Georgia, serif" fontWeight={700} mb={2} mt={1}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" component="h2" fontWeight={700} mt={5} mb={1.5}
      sx={{ pl: 1.5, borderLeft: "3px solid", borderColor: "primary.main", color: "text.primary" }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" component="h3" fontWeight={600} mt={3} mb={1}>{children}</Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" component="p" lineHeight={1.8} mb={1.5} color="text.primary">
      {children}
    </Typography>
  ),
  blockquote: ({ children }) => (
    <Paper elevation={0} sx={{ borderLeft: "3px solid", borderColor: "primary.main", pl: 2, pr: 1, py: 1, my: 2, bgcolor: "action.hover", fontStyle: "italic" }}>
      {children}
    </Paper>
  ),
  table: ({ children }) => (
    <TableContainer component={Paper} elevation={0} sx={{ my: 2, border: 1, borderColor: "divider" }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead sx={{ bgcolor: "action.selected" }}>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{children}</TableCell>,
  td: ({ children }) => <TableCell sx={{ fontSize: "0.875rem", verticalAlign: "top" }}>{children}</TableCell>,
  strong: ({ children }) => <Box component="strong" sx={{ fontWeight: 700 }}>{children}</Box>,
  em: ({ children }) => <Box component="em" sx={{ fontStyle: "italic" }}>{children}</Box>,
  hr: () => <Box component="hr" sx={{ border: "none", borderTop: 1, borderColor: "divider", my: 3 }} />,
  code: ({ children }) => (
    <Box component="code" sx={{ fontFamily: "monospace", fontSize: "0.85rem", bgcolor: "action.hover", px: 0.5, py: 0.25, borderRadius: 0.5 }}>
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Paper elevation={0} component="pre" sx={{ p: 2, my: 2, overflow: "auto", bgcolor: "action.hover", border: 1, borderColor: "divider", borderRadius: 1, fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1.6 }}>
      {children}
    </Paper>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body1" lineHeight={1.8} sx={{ mb: 0.5 }}>{children}</Typography>
  ),
  img: ({ src, alt }) => (
    <Box component="img" src={src} alt={alt} sx={{ display: "block", width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 3, my: 3, boxShadow: 2 }} />
  ),
};

// ── Landing page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", fontFamily: "Inter, sans-serif" }}>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "#FAFAF8", borderBottom: "1px solid #E8EEEE" }}
      >
        <span className="text-xl font-bold" style={{ color: "#0D6E6E" }}>Flowkigai</span>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium hover:underline"
            style={{ color: "#0D6E6E" }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold text-white px-4 py-2 rounded-full transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0D6E6E" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="text-center px-6 py-20">
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1
            className="text-5xl font-bold mb-4"
            style={{ fontFamily: "Georgia, serif", color: "#1A1A2E", lineHeight: 1.2 }}
          >
            Flowkigai
          </h1>
          <p className="text-lg mb-8" style={{ color: "#4B5563", lineHeight: 1.75 }}>
            A year planning system that starts with meaning and ends with momentum.
            Built on Ikigai, Deep Work, and the science of flow.
          </p>

          {/* CTA buttons — row on desktop, stacked on mobile */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3 rounded-full text-white text-sm font-semibold text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0D6E6E" }}
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3 rounded-full text-sm font-semibold text-center border-2 transition-colors hover:bg-[#0D6E6E0d]"
              style={{ color: "#0D6E6E", borderColor: "#0D6E6E" }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Philosophy content ───────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "0 24px 80px",
          borderTop: "1px solid #E8EEEE",
        }}
      >
        <Box pt={5}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </Box>
      </div>

    </div>
  );
}
