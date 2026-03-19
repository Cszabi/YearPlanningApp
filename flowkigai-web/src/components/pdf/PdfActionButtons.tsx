import { useState } from "react";
import { Button, CircularProgress, Tooltip, Stack, Snackbar, Alert } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import EmailIcon from "@mui/icons-material/Email";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { exportApi } from "@/api/exportApi";

interface Props {
  /** The @react-pdf/renderer <Document> element to render */
  document: ReactElement<DocumentProps>;
  /** Used as filename (download) and email subject */
  filename: string;
  subject: string;
  size?: "small" | "medium";
}

export default function PdfActionButtons({ document: doc, filename, subject, size = "small" }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [emailing,    setEmailing]    = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  async function getBlob() {
    return pdf(doc).toBlob();
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await getBlob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), { href: url, download: `${filename}.pdf` });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setToast({ msg: "Failed to generate PDF", severity: "error" });
    } finally {
      setDownloading(false);
    }
  }

  async function handleEmail() {
    setEmailing(true);
    try {
      const blob = await getBlob();
      await exportApi.emailPdf(blob, subject);
      setToast({ msg: "PDF sent to your email 📬", severity: "success" });
    } catch {
      setToast({ msg: "Failed to send email", severity: "error" });
    } finally {
      setEmailing(false);
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Tooltip title="Download PDF">
          <span>
            <Button
              size={size}
              variant="outlined"
              startIcon={downloading ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={handleDownload}
              disabled={downloading || emailing}
            >
              PDF
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Send to my email">
          <span>
            <Button
              size={size}
              variant="outlined"
              color="secondary"
              startIcon={emailing ? <CircularProgress size={14} /> : <EmailIcon />}
              onClick={handleEmail}
              disabled={downloading || emailing}
            >
              Email
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)} variant="filled" sx={{ width: "100%" }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
