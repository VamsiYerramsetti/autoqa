import type { ClarificationItem, UploadResponse } from "@/lib/types";

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await fetch(`/api/upload`, { method: "POST", body: formData });
  if (!response.ok) throw new Error("We couldn't process the upload.");
  return response.json();
}

export async function saveClarifications(sessionId: string, clarifications: ClarificationItem[]) {
  const response = await fetch(`/api/clarifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, clarifications }),
  });
  if (!response.ok) throw new Error("Couldn't save clarifications.");
  return response.json();
}

export async function generateQr(sessionId: string): Promise<{ shareToken: string; shareUrl: string }> {
  const response = await fetch(`/api/qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) throw new Error("Couldn't generate the QR code.");
  return response.json();
}
