import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { AudienceQuestionRecord, PresentationDatabase, SessionRecord } from "../types";

const PRESENTATION_DATABASE_PATH = path.resolve(__dirname, "../../data/presentations-db.json");

function ensureDatabaseDirectory() {
  fs.mkdirSync(path.dirname(PRESENTATION_DATABASE_PATH), { recursive: true });
}

function writeDatabase(database: PresentationDatabase) {
  ensureDatabaseDirectory();
  fs.writeFileSync(PRESENTATION_DATABASE_PATH, JSON.stringify(database, null, 2));
}

function readDatabase(): PresentationDatabase {
  ensureDatabaseDirectory();

  if (!fs.existsSync(PRESENTATION_DATABASE_PATH)) {
    const initialDatabase: PresentationDatabase = { presentations: [] };
    writeDatabase(initialDatabase);
    return initialDatabase;
  }

  const raw = fs.readFileSync(PRESENTATION_DATABASE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<PresentationDatabase>;
  return { presentations: Array.isArray(parsed.presentations) ? parsed.presentations : [] };
}

export function initializePresentationDatabase() {
  readDatabase();
}

export function saveSession(record: SessionRecord) {
  const database = readDatabase();
  database.presentations.push(record);
  writeDatabase(database);
  return record;
}

export function getSession(id: string) {
  const database = readDatabase();
  return database.presentations.find((presentation) => presentation.id === id);
}

export function listSessionsForOwner(ownerId: string) {
  const database = readDatabase();
  return database.presentations
    .filter((presentation) => presentation.ownerId === ownerId)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function updateSession(id: string, partial: Partial<SessionRecord>) {
  const database = readDatabase();
  const index = database.presentations.findIndex((presentation) => presentation.id === id);
  if (index === -1) return null;

  const existing = database.presentations[index];
  const merged: SessionRecord = {
    ...existing,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  database.presentations[index] = merged;
  writeDatabase(database);
  return merged;
}

export function getOwnedSession(id: string, ownerId: string) {
  const session = getSession(id);
  if (!session || session.ownerId !== ownerId) return null;
  return session;
}

export function recordQrScan(id: string, shareToken: string) {
  const session = getSession(id);
  if (!session || session.shareToken !== shareToken) return null;
  return updateSession(id, { qrScans: (session.qrScans || 0) + 1 });
}

function buildAudienceAnswer(session: SessionRecord, question: string) {
  const guidedAnswer = session.clarifications.find((item) => item.status !== "out-of-scope" && item.answerHint.trim().length > 0)?.answerHint;
  if (guidedAnswer) {
    return `${guidedAnswer} This reply is grounded in the presentation materials for this session.`;
  }

  return `Thanks for your question about "${question}". The speaker workspace has captured it and AutoQ&A will answer only from uploaded materials and approved clarifications.`;
}

export function addAudienceQuestion(id: string, shareToken: string, question: string, attendeeName?: string) {
  const session = getSession(id);
  if (!session || session.shareToken !== shareToken) return null;

  const audienceQuestion: AudienceQuestionRecord = {
    id: randomUUID(),
    question,
    attendeeName: attendeeName?.trim() || "Anonymous attendee",
    askedAt: new Date().toISOString(),
    status: "new",
    answerPreview: buildAudienceAnswer(session, question),
  };

  const updated = updateSession(id, { audienceQuestions: [...session.audienceQuestions, audienceQuestion] });
  return updated ? audienceQuestion : null;
}