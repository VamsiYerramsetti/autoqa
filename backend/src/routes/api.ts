import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import { AuthenticatedRequest, requireAuth } from "../auth/middleware";
import { addAudienceQuestion, getOwnedSession, getSession, listSessionsForOwner, recordQrScan, saveSession, updateSession } from "../store/presentation-store";
import { ClarificationItem, SessionRecord, UploadedAsset } from "../types";
import { generateClarificationQuestions } from "../utils/generate-clarifications";

const upload = multer({ storage: multer.memoryStorage() });
export const apiRouter = Router();

apiRouter.post("/upload", requireAuth, upload.array("files"), (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!uploadedFiles.length) return res.status(400).json({ error: "No files received." });
  if (!authRequest.authUser) return res.status(401).json({ error: "Login required before using AutoQ&A." });
  const assets: UploadedAsset[] = uploadedFiles.map((file) => ({ name: file.originalname, size: file.size, type: file.mimetype || "application/octet-stream" }));
  const requestedTitle = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const title = requestedTitle || `Presentation ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const extractedContext = [
    "Only answer from uploaded content and approved speaker clarifications.",
    "If the material does not support an answer, abstain clearly instead of guessing.",
    `Detected ${assets.length} source file${assets.length > 1 ? "s" : ""} for this session.`
  ];
  const createdAt = new Date().toISOString();
  const sessionId = randomUUID();
  const record: SessionRecord = {
    id: sessionId,
    ownerId: authRequest.authUser.id,
    title,
    createdAt,
    updatedAt: createdAt,
    status: "draft",
    assets,
    extractedContext,
    clarifications: generateClarificationQuestions(assets.map((asset) => asset.name)),
    audienceQuestions: [],
    qrScans: 0,
  };
  saveSession(record);
  return res.json({ sessionId, title: record.title, status: record.status, assets: record.assets, extractedContext: record.extractedContext, clarifications: record.clarifications });
});

apiRouter.post("/clarifications", requireAuth, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  const body = req.body as { sessionId?: string; clarifications?: ClarificationItem[] };
  if (!body.sessionId || !body.clarifications) return res.status(400).json({ error: "Missing sessionId or clarifications." });
  if (!authRequest.authUser) return res.status(401).json({ error: "Login required before using AutoQ&A." });
  const session = getOwnedSession(body.sessionId, authRequest.authUser.id);
  if (!session) return res.status(404).json({ error: "Session not found." });
  const updated = updateSession(body.sessionId, { clarifications: body.clarifications });
  return res.json({ ok: true, clarifications: updated?.clarifications ?? [] });
});

apiRouter.get("/session/:id", requireAuth, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!authRequest.authUser) return res.status(401).json({ error: "Login required before using AutoQ&A." });
  const session = getOwnedSession(sessionId, authRequest.authUser.id);
  if (!session) return res.status(404).json({ error: "Session not found." });
  return res.json(session);
});

apiRouter.get("/presentations", requireAuth, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  if (!authRequest.authUser) return res.status(401).json({ error: "Login required before using AutoQ&A." });
  return res.json({ presentations: listSessionsForOwner(authRequest.authUser.id) });
});

apiRouter.post("/qr", requireAuth, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId." });
  if (!authRequest.authUser) return res.status(401).json({ error: "Login required before using AutoQ&A." });
  const session = getOwnedSession(sessionId, authRequest.authUser.id);
  if (!session) return res.status(404).json({ error: "Session not found." });
  const frontendAppUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000";
  const shareToken = session.shareToken ?? randomUUID().slice(0, 8).toUpperCase();
  const shareUrl = `${frontendAppUrl}/audience/${sessionId}?token=${shareToken}`;
  updateSession(sessionId, { shareToken, shareUrl, status: "live" });
  return res.json({ shareToken, shareUrl });
});

apiRouter.get("/public/presentations/:id", (req, res) => {
  const presentationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) return res.status(400).json({ error: "Missing token." });

  const session = recordQrScan(presentationId, token);
  if (!session) return res.status(404).json({ error: "Presentation not found." });

  return res.json({
    id: session.id,
    title: session.title,
    shareToken: session.shareToken,
    qrScans: session.qrScans,
    extractedContext: session.extractedContext,
  });
});

apiRouter.post("/public/presentations/:id/questions", (req, res) => {
  const presentationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { token, question, attendeeName } = req.body as { token?: string; question?: string; attendeeName?: string };
  if (!token || !question?.trim()) return res.status(400).json({ error: "Token and question are required." });

  const audienceQuestion = addAudienceQuestion(presentationId, token, question.trim(), attendeeName);
  if (!audienceQuestion) return res.status(404).json({ error: "Presentation not found." });

  return res.status(201).json({ question: audienceQuestion });
});
