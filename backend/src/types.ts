export type ClarificationStatus = "approved" | "edited" | "out-of-scope";
export type PresentationStatus = "draft" | "live";
export type AudienceQuestionStatus = "new" | "reviewed" | "answered";

export interface UploadedAsset { name: string; size: number; type: string; }
export interface ClarificationItem { id: string; question: string; answerHint: string; status: ClarificationStatus; note?: string; }
export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  roleTitle?: string;
  organization?: string;
  createdAt: string;
}
export interface AuthUserRecord extends AuthenticatedUser { passwordSalt: string; passwordHash: string; }
export interface AuthSessionRecord { token: string; userId: string; createdAt: string; expiresAt: string; }
export interface AuthDatabase { users: AuthUserRecord[]; sessions: AuthSessionRecord[]; }
export interface RegisterUserInput {
  displayName: string;
  email: string;
  username: string;
  password: string;
  roleTitle?: string;
  organization?: string;
}
export interface AudienceQuestionRecord {
  id: string;
  question: string;
  attendeeName: string;
  askedAt: string;
  status: AudienceQuestionStatus;
  answerPreview: string;
}
export interface SessionRecord {
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
export interface PresentationDatabase { presentations: SessionRecord[]; }
