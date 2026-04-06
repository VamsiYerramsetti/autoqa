import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import { getSession, saveSession, updateSession } from "../store/memory-store";
import { ClarificationItem, SessionRecord, UploadedAsset } from "../types";
import { generateClarificationQuestions } from "../utils/generate-clarifications";

const upload = multer({ storage: multer.memoryStorage() });
export const apiRouter = Router();

apiRouter.post("/upload", upload.array("files"), (req, res) => {
  const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!uploadedFiles.length) return res.status(400).json({ error: "No files received." });
  const assets: UploadedAsset[] = uploadedFiles.map((file) => ({ name: file.originalname, size: file.size, type: file.mimetype || "application/octet-stream" }));
  const extractedContext = [
    "Only answer from uploaded content and approved speaker clarifications.",
    "If the material does not support an answer, abstain clearly instead of guessing.",
    `Detected ${assets.length} source file${assets.length > 1 ? "s" : ""} for this session.`
  ];
  const sessionId = randomUUID();
  const record: SessionRecord = { id: sessionId, createdAt: new Date().toISOString(), assets, extractedContext, clarifications: generateClarificationQuestions(assets.map((asset) => asset.name)) };
  saveSession(record);
  return res.json({ sessionId, assets: record.assets, extractedContext: record.extractedContext, clarifications: record.clarifications });
});

apiRouter.post("/clarifications", (req, res) => {
  const body = req.body as { sessionId?: string; clarifications?: ClarificationItem[] };
  if (!body.sessionId || !body.clarifications) return res.status(400).json({ error: "Missing sessionId or clarifications." });
  const session = getSession(body.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
  const updated = updateSession(body.sessionId, { clarifications: body.clarifications });
  return res.json({ ok: true, clarifications: updated?.clarifications ?? [] });
});

apiRouter.get("/session/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found." });
  return res.json(session);
});

apiRouter.post("/qr", (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId." });
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });
  const frontendAppUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000";
  const shareToken = session.shareToken ?? randomUUID().slice(0, 8).toUpperCase();
  const shareUrl = `${frontendAppUrl}/audience/${sessionId}?token=${shareToken}`;
  updateSession(sessionId, { shareToken, shareUrl });
  return res.json({ shareToken, shareUrl });
});
