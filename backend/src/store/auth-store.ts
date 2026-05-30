import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import { AuthDatabase, AuthSessionRecord, AuthenticatedUser, AuthUserRecord, RegisterUserInput } from "../types";

const AUTH_DATABASE_PATH = path.resolve(__dirname, "../../data/auth-db.json");
const DEFAULT_SESSION_TTL_HOURS = 72;

export const sessionDurationMs = Number(process.env.AUTOQA_SESSION_TTL_HOURS || DEFAULT_SESSION_TTL_HOURS) * 60 * 60 * 1000;

function getConfiguredLocalCredential() {
  const username = process.env.AUTOQA_LOCAL_USERNAME?.trim();
  const password = process.env.AUTOQA_LOCAL_PASSWORD?.trim();
  const displayName = process.env.AUTOQA_LOCAL_DISPLAY_NAME?.trim() || "Local User";

  if (!username || !password) {
    return null;
  }

  return { username, password, displayName };
}

function normalizeStoredUser(candidate: Partial<AuthUserRecord>): AuthUserRecord | null {
  if (!candidate.id || !candidate.username || !candidate.displayName || !candidate.passwordSalt || !candidate.passwordHash || !candidate.createdAt) {
    return null;
  }

  const email = typeof candidate.email === "string" && candidate.email.trim() ? candidate.email : `${candidate.username}@local.autoqa`;

  return {
    id: candidate.id,
    username: candidate.username,
    displayName: candidate.displayName,
    email,
    roleTitle: typeof candidate.roleTitle === "string" ? candidate.roleTitle : undefined,
    organization: typeof candidate.organization === "string" ? candidate.organization : undefined,
    passwordSalt: candidate.passwordSalt,
    passwordHash: candidate.passwordHash,
    createdAt: candidate.createdAt,
  };
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function buildUserRecord(username: string, password: string, displayName: string): AuthUserRecord {
  const salt = randomBytes(16).toString("hex");
  return {
    id: randomUUID(),
    username,
    displayName,
    email: `${username}@local.autoqa`,
    roleTitle: undefined,
    organization: undefined,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
}

function buildRegisteredUserRecord(input: RegisterUserInput): AuthUserRecord {
  const salt = randomBytes(16).toString("hex");
  return {
    id: randomUUID(),
    username: input.username.trim(),
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    roleTitle: input.roleTitle?.trim() || undefined,
    organization: input.organization?.trim() || undefined,
    passwordSalt: salt,
    passwordHash: hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  };
}

function seedDatabase(): AuthDatabase {
  const configuredCredential = getConfiguredLocalCredential();

  return {
    users: configuredCredential ? [buildUserRecord(configuredCredential.username, configuredCredential.password, configuredCredential.displayName)] : [],
    sessions: [],
  };
}

function ensureDatabaseDirectory() {
  fs.mkdirSync(path.dirname(AUTH_DATABASE_PATH), { recursive: true });
}

function writeDatabase(database: AuthDatabase) {
  ensureDatabaseDirectory();
  fs.writeFileSync(AUTH_DATABASE_PATH, JSON.stringify(database, null, 2));
}

function readDatabase(): AuthDatabase {
  ensureDatabaseDirectory();

  if (!fs.existsSync(AUTH_DATABASE_PATH)) {
    const initialDatabase = seedDatabase();
    writeDatabase(initialDatabase);
    return initialDatabase;
  }

  const raw = fs.readFileSync(AUTH_DATABASE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<AuthDatabase>;
  const database: AuthDatabase = {
    users: Array.isArray(parsed.users) ? parsed.users.map(normalizeStoredUser).filter((user): user is AuthUserRecord => Boolean(user)) : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
  };

  if (!database.users.length) {
    database.users = seedDatabase().users;
    writeDatabase(database);
  }

  return database;
}

function isSessionExpired(session: AuthSessionRecord) {
  return Date.parse(session.expiresAt) <= Date.now();
}

function pruneExpiredSessions(database: AuthDatabase) {
  const nextSessions = database.sessions.filter((session) => !isSessionExpired(session));
  if (nextSessions.length !== database.sessions.length) {
    database.sessions = nextSessions;
    writeDatabase(database);
  }
}

function toPublicUser(user: AuthUserRecord): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    roleTitle: user.roleTitle,
    organization: user.organization,
    createdAt: user.createdAt,
  };
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function initializeAuthDatabase() {
  const database = readDatabase();
  pruneExpiredSessions(database);
}

export function authenticateUser(username: string, password: string): AuthenticatedUser | null {
  const database = readDatabase();
  const normalizedUsername = normalizeUsername(username);
  const user = database.users.find((candidate) => normalizeUsername(candidate.username) === normalizedUsername);
  if (!user) return null;

  const expectedHash = Buffer.from(user.passwordHash, "hex");
  const attemptedHash = Buffer.from(hashPassword(password, user.passwordSalt), "hex");

  if (expectedHash.length !== attemptedHash.length || !timingSafeEqual(expectedHash, attemptedHash)) {
    return null;
  }

  return toPublicUser(user);
}

export function createAuthSession(userId: string, token: string) {
  const database = readDatabase();
  const createdAt = new Date();
  const session: AuthSessionRecord = {
    token,
    userId,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + sessionDurationMs).toISOString(),
  };

  database.sessions = database.sessions.filter((existingSession) => existingSession.userId !== userId && !isSessionExpired(existingSession));
  database.sessions.push(session);
  writeDatabase(database);
  return session;
}

export function createUserAccount(input: RegisterUserInput): AuthenticatedUser {
  const database = readDatabase();
  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = normalizeEmail(input.email);

  if (database.users.some((candidate) => normalizeUsername(candidate.username) === normalizedUsername)) {
    throw new Error("That username is already in use.");
  }

  if (database.users.some((candidate) => normalizeEmail(candidate.email) === normalizedEmail)) {
    throw new Error("That email is already in use.");
  }

  const userRecord = buildRegisteredUserRecord(input);
  database.users.push(userRecord);
  writeDatabase(database);
  return toPublicUser(userRecord);
}

export function getAuthenticatedUserForToken(token: string): AuthenticatedUser | null {
  const database = readDatabase();
  pruneExpiredSessions(database);

  const session = database.sessions.find((candidate) => candidate.token === token);
  if (!session || isSessionExpired(session)) {
    return null;
  }

  const user = database.users.find((candidate) => candidate.id === session.userId);
  return user ? toPublicUser(user) : null;
}

export function deleteAuthSession(token: string) {
  const database = readDatabase();
  const nextSessions = database.sessions.filter((session) => session.token !== token);
  if (nextSessions.length !== database.sessions.length) {
    database.sessions = nextSessions;
    writeDatabase(database);
  }
}