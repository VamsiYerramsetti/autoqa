import { Router } from "express";
import { AuthenticatedRequest, clearAuthCookie, createSessionToken, revokeAuthSession, setAuthCookie } from "../auth/middleware";
import { authenticateUser, createAuthSession, createUserAccount } from "../store/auth-store";

export const authRouter = Router();

authRouter.get("/session", (req, res) => {
  const authRequest = req as AuthenticatedRequest;

  if (!authRequest.authUser) {
    res.json({ authenticated: false, user: null });
    return;
  }

  res.json({ authenticated: true, user: authRequest.authUser });
});

authRouter.post("/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  const authUser = authenticateUser(username, password);
  if (!authUser) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  const token = createSessionToken();
  createAuthSession(authUser.id, token);
  setAuthCookie(res, token);
  res.json({ authenticated: true, user: authUser });
});

authRouter.post("/logout", (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  revokeAuthSession(authRequest);
  clearAuthCookie(res);
  res.json({ authenticated: false, user: null });
});

authRouter.post("/register", (req, res) => {
  const { displayName, email, username, password, roleTitle, organization } = req.body as {
    displayName?: string;
    email?: string;
    username?: string;
    password?: string;
    roleTitle?: string;
    organization?: string;
  };

  if (!displayName || !email || !username || !password) {
    res.status(400).json({ error: "Display name, email, username, and password are required." });
    return;
  }

  try {
    const authUser = createUserAccount({ displayName, email, username, password, roleTitle, organization });
    const token = createSessionToken();
    createAuthSession(authUser.id, token);
    setAuthCookie(res, token);
    res.status(201).json({ authenticated: true, user: authUser });
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Unable to create the account." });
  }
});