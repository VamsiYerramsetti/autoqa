import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { deleteAuthSession, getAuthenticatedUserForToken, sessionDurationMs } from "../store/auth-store";
import { AuthenticatedUser } from "../types";

const DEFAULT_COOKIE_NAME = "autoqa_auth";

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
  authSessionToken?: string;
}

export const authCookieName = process.env.AUTOQA_AUTH_COOKIE_NAME || DEFAULT_COOKIE_NAME;

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {} as Record<string, string>;

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, cookiePair) => {
    const separatorIndex = cookiePair.indexOf("=");
    if (separatorIndex === -1) return cookies;

    const rawKey = cookiePair.slice(0, separatorIndex).trim();
    const rawValue = cookiePair.slice(separatorIndex + 1).trim();
    if (!rawKey) return cookies;

    cookies[rawKey] = decodeURIComponent(rawValue);
    return cookies;
  }, {});
}

export function createSessionToken() {
  return `${randomUUID()}-${randomUUID().replace(/-/g, "")}`;
}

export function applyAuthContext(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[authCookieName];

  if (!token) {
    next();
    return;
  }

  const authUser = getAuthenticatedUserForToken(token);
  if (authUser) {
    req.authUser = authUser;
    req.authSessionToken = token;
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ error: "Login required before using AutoQ&A." });
    return;
  }

  next();
}

export function setAuthCookie(res: Response, token: string) {
  const cookieParts = [
    `${authCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(sessionDurationMs / 1000)}`,
  ];

  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

export function clearAuthCookie(res: Response) {
  const cookieParts = [
    `${authCookieName}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

export function revokeAuthSession(req: AuthenticatedRequest) {
  if (req.authSessionToken) {
    deleteAuthSession(req.authSessionToken);
  }
}