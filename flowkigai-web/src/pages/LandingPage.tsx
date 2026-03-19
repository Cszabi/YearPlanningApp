import { Navigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useAuthStore } from "@/stores/authStore";
import FlowkigaiLogo from "@/components/layout/FlowkigaiLogo";
import content from "@/docs/philosophy.md?raw";

// ── Dark theme tokens ─────────────────────────────────────────────────────────
const C = {
  bg:     "#0F1117",
  bgAlt:  "#161B27",
  card:   "#1E2433",
  border: "#2A3146",
  text:   "#F0F0EC",
  muted:  "#9BA3B8",
  accent: "#0D9E9E",
} as const;

// ── Markdown renderer (dark-themed, no MUI dependency) ────────────────────────
const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "1.875rem", color: C.text, marginBottom: 8, marginTop: 4 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontWeight: 700, fontSize: "1.375rem", color: C.text, marginTop: 40, marginBottom: 12, paddingLeft: 12, borderLeft: `3px solid ${C.accent}` }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontWeight: 600, fontSize: "1.1rem", color: C.text, marginTop: 24, marginBottom: 8 }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ lineHeight: 1.8, marginBottom: 12, color: C.text, fontSize: "0.95rem" }}>
      {children}
    </p>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 16, paddingRight: 8, paddingTop: 8, paddingBottom: 8, margin: "16px 0", background: C.card, fontStyle: "italic", color: C.muted, borderRadius: "0 4px 4px 0" }}>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "16px 0", border: `1px solid ${C.border}`, borderRadius: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: C.card }}>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr style={{ borderBottom: `1px solid ${C.border}` }}>{children}</tr>,
  th: ({ children }) => (
    <th style={{ fontWeight: 700, fontSize: "0.85rem", padding: "8px 12px", color: C.text, textAlign: "left" }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ fontSize: "0.875rem", padding: "8px 12px", color: C.muted, verticalAlign: "top" }}>
      {children}
    </td>
  ),
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: C.text }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
  hr: () => <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "24px 0" }} />,
  code: ({ children }) => (
    <code style={{ fontFamily: "monospace", fontSize: "0.85rem", background: C.card, padding: "2px 4px", borderRadius: 4, color: C.accent }}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre style={{ padding: 16, margin: "16px 0", overflowX: "auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1.6, color: C.text }}>
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul style={{ paddingLeft: 24, marginBottom: 16 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 24, marginBottom: 16 }}>{children}</ol>,
  li: ({ children }) => (
    <li style={{ lineHeight: 1.8, marginBottom: 4, color: C.text, fontSize: "0.95rem" }}>
      {children}
    </li>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt} style={{ display: "block", width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 12, margin: "24px 0", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }} />
  ),
};

// ── Landing page ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, sans-serif" }}>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
      >
        <span style={{ color: C.text }}>
          <FlowkigaiLogo size="md" />
        </span>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium transition-colors hover:text-[#F0F0EC]"
            style={{ color: C.muted }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold text-white px-4 py-2 rounded-full transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.accent }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px 48px" }}>
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

          {/* Left column — hero image */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <img
              src="/images/ikigaiToMindMap.png"
              alt="Ikigai compass transforming into a mind map"
              style={{
                width: "100%",
                objectFit: "cover",
                maxHeight: "600px",
                borderRadius: 16,
              }}
              className="max-h-[280px] md:max-h-[600px]"
            />
          </div>

          {/* Right column — copy + CTAs */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <div className="mb-6" style={{ color: C.text }}>
              <FlowkigaiLogo size="lg" showWordmark={true} />
            </div>
            <p className="text-lg mb-8" style={{ color: C.muted, lineHeight: 1.75 }}>
              A year planning system that starts with meaning and ends with momentum.
              Built on Ikigai, Deep Work, and the science of flow.
            </p>

            {/* CTA buttons — row on desktop, stacked on mobile */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3 rounded-full text-white text-sm font-semibold text-center transition-opacity hover:opacity-90"
                style={{ backgroundColor: C.accent }}
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3 rounded-full text-sm font-semibold text-center border-2 transition-colors hover:bg-[#0D9E9E22]"
                style={{ color: C.accent, borderColor: C.accent }}
              >
                Sign In
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── Philosophy content ───────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "40px 24px 80px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {content}
        </ReactMarkdown>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <span style={{ color: C.text }}>
            <FlowkigaiLogo size="sm" />
          </span>
          <p style={{ color: C.muted, fontSize: "0.8rem", marginTop: 8 }}>
            © {new Date().getFullYear()} Flowkigai. A year planning system built on meaning.
          </p>
        </div>
      </footer>

    </div>
  );
}
