import type { AuthSessionResponse, ClarificationItem, PresentationListResponse, PresentationRecord, PublicPresentationResponse, RegisterAccountInput, UploadResponse } from "@/lib/types";

type RequestOptions = RequestInit & { fallbackError: string };

async function apiRequest<T>(input: string, { fallbackError, headers, ...init }: RequestOptions): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers,
    ...init,
  });

  if (!response.ok) {
    let message = fallbackError;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep the fallback error if the payload is not JSON.
    }

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function getAuthSession(): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/api/auth/session", {
    method: "GET",
    fallbackError: "Couldn't load your AutoQ&A session.",
  });
}

export function loginWithPassword(username: string, password: string): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    fallbackError: "Login failed.",
  });
}

export function registerAccount(input: RegisterAccountInput): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    fallbackError: "Couldn't create the account.",
  });
}

export function logoutFromSession(): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>("/api/auth/logout", {
    method: "POST",
    fallbackError: "Logout failed.",
  });
}

export async function uploadFiles(files: File[], title?: string): Promise<UploadResponse> {
  const formData = new FormData();
  if (title?.trim()) formData.append("title", title.trim());
  files.forEach((file) => formData.append("files", file));
  return apiRequest<UploadResponse>("/api/upload", {
    method: "POST",
    body: formData,
    fallbackError: "We couldn't process the upload.",
  });
}

export async function saveClarifications(sessionId: string, clarifications: ClarificationItem[]) {
  return apiRequest<{ ok: true; clarifications: ClarificationItem[] }>("/api/clarifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, clarifications }),
    fallbackError: "Couldn't save clarifications.",
  });
}

export async function generateQr(sessionId: string): Promise<{ shareToken: string; shareUrl: string }> {
  return apiRequest<{ shareToken: string; shareUrl: string }>("/api/qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
    fallbackError: "Couldn't generate the QR code.",
  });
}

export function listPresentations(): Promise<PresentationListResponse> {
  return apiRequest<PresentationListResponse>("/api/presentations", {
    method: "GET",
    fallbackError: "Couldn't load your presentations.",
  });
}

export function getPresentation(sessionId: string): Promise<PresentationRecord> {
  return apiRequest<PresentationRecord>(`/api/session/${sessionId}`, {
    method: "GET",
    fallbackError: "Couldn't load that presentation.",
  });
}

export function getPublicPresentation(sessionId: string, token: string): Promise<PublicPresentationResponse> {
  return apiRequest<PublicPresentationResponse>(`/api/public/presentations/${sessionId}?token=${encodeURIComponent(token)}`, {
    method: "GET",
    fallbackError: "Couldn't load this audience session.",
  });
}

export function submitAudienceQuestion(sessionId: string, token: string, question: string, attendeeName?: string) {
  return apiRequest<{ question: import("@/lib/types").AudienceQuestionRecord }>(`/api/public/presentations/${sessionId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, question, attendeeName }),
    fallbackError: "Couldn't send the question.",
  });
}
