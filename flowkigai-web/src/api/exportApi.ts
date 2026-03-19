import client from "./client";

export const exportApi = {
  emailPdf: async (pdfBlob: Blob, subject: string): Promise<void> => {
    const form = new FormData();
    form.append("pdf", pdfBlob, `${subject.replace(/\s+/g, "_")}.pdf`);
    form.append("subject", subject);
    await client.post("/export/email-pdf", form);
  },
};
