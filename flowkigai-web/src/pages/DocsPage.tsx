import content from "@/docs/philosophy.md?raw";
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

const mdComponents: Components = {
  h1: ({ children }) => (
    <Typography
      variant="h4"
      component="h1"
      fontFamily="Georgia, serif"
      fontWeight={700}
      mb={2}
      mt={1}
    >
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography
      variant="h5"
      component="h2"
      fontWeight={700}
      mt={5}
      mb={1.5}
      sx={{
        pl: 1.5,
        borderLeft: "3px solid",
        borderColor: "primary.main",
        color: "text.primary",
      }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" component="h3" fontWeight={600} mt={3} mb={1}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography
      variant="body1"
      component="p"
      lineHeight={1.8}
      mb={1.5}
      color="text.primary"
    >
      {children}
    </Typography>
  ),
  blockquote: ({ children }) => (
    <Paper
      elevation={0}
      sx={{
        borderLeft: "3px solid",
        borderColor: "primary.main",
        pl: 2,
        pr: 1,
        py: 1,
        my: 2,
        bgcolor: "action.hover",
        fontStyle: "italic",
      }}
    >
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
  th: ({ children }) => (
    <TableCell sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{children}</TableCell>
  ),
  td: ({ children }) => (
    <TableCell sx={{ fontSize: "0.875rem", verticalAlign: "top" }}>{children}</TableCell>
  ),
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 700 }}>
      {children}
    </Box>
  ),
  em: ({ children }) => (
    <Box component="em" sx={{ fontStyle: "italic" }}>
      {children}
    </Box>
  ),
  hr: () => <Box component="hr" sx={{ border: "none", borderTop: 1, borderColor: "divider", my: 3 }} />,
  code: ({ children }) => (
    <Box
      component="code"
      sx={{
        fontFamily: "monospace",
        fontSize: "0.85rem",
        bgcolor: "action.hover",
        px: 0.5,
        py: 0.25,
        borderRadius: 0.5,
      }}
    >
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Paper
      elevation={0}
      component="pre"
      sx={{
        p: 2,
        my: 2,
        overflow: "auto",
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        fontFamily: "monospace",
        fontSize: "0.85rem",
        lineHeight: 1.6,
      }}
    >
      {children}
    </Paper>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body1" lineHeight={1.8} sx={{ mb: 0.5 }}>
      {children}
    </Typography>
  ),
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        display: "block",
        width: "100%",
        maxHeight: 340,
        objectFit: "cover",
        borderRadius: 3,
        my: 3,
        boxShadow: 2,
      }}
    />
  ),
};

export default function DocsPage() {
  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default" }}>
      {/* Sticky header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          px: 3,
          py: 1.5,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Philosophy & Guide
        </Typography>
        <Typography variant="caption" color="text.disabled">
          What Flowkigai is and why it works
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ px: { xs: 3, md: 6 }, py: 4, maxWidth: 760, mx: "auto" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {content}
        </ReactMarkdown>
      </Box>
    </Box>
  );
}
