export type ClarificationStatus = "approved" | "edited" | "out-of-scope";
export type PresentationStatus = "draft" | "live";
export type AudienceQuestionStatus = "new" | "reviewed" | "answered";

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  roleTitle?: string;
  organization?: string;
  createdAt: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthenticatedUser | null;
}

export interface RegisterAccountInput {
  displayName: string;
  email: string;
  username: string;
  password: string;
  roleTitle?: string;
  organization?: string;
}

export interface UploadedAsset {
  name: string;
  size: number;
  type: string;
}

export interface ClarificationItem {
  id: string;
  question: string;
  answerHint: string;
  status: ClarificationStatus;
  note?: string;
}

export interface UploadResponse {
  sessionId: string;
  title: string;
  status: PresentationStatus;
  assets: UploadedAsset[];
  extractedContext: string[];
  clarifications: ClarificationItem[];
}

export interface AudienceQuestionRecord {
  id: string;
  question: string;
  attendeeName: string;
  askedAt: string;
  status: AudienceQuestionStatus;
  answerPreview: string;
}

export interface PresentationRecord {
  id: string;
  ownerId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: PresentationStatus;
  assets: UploadedAsset[];
  extractedContext: string[];
  clarifications: ClarificationItem[];
  audienceQuestions: AudienceQuestionRecord[];
  qrScans: number;
  shareToken?: string;
  shareUrl?: string;
}

export interface PresentationListResponse {
  presentations: PresentationRecord[];
}

export interface PublicPresentationResponse {
  id: string;
  title: string;
  shareToken?: string;
  qrScans: number;
  extractedContext: string[];
}
