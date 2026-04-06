export type ClarificationStatus = "approved" | "edited" | "out-of-scope";

export interface UploadedAsset { name: string; size: number; type: string; }
export interface ClarificationItem { id: string; question: string; answerHint: string; status: ClarificationStatus; note?: string; }
export interface SessionRecord {
  id: string;
  createdAt: string;
  assets: UploadedAsset[];
  extractedContext: string[];
  clarifications: ClarificationItem[];
  shareToken?: string;
  shareUrl?: string;
}
