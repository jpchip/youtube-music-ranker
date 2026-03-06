import { Router } from "express";
import crypto from "crypto";
import path from "path";
import { nanoid } from "nanoid";
import {
  getUserByEmail,
  getUserById,
  createUser,
  createSession,
  deleteSession,
  hashPassword,
  verifyPassword,
  updatePasswordHash,
} from "../usersDb.js";
import { DATA_DIR, openUserDb } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { registerLimiter, loginLimiter } from "../middleware/rateLimit.js";

const router = Router();

const setPasswordTokens = new Map<string, { userId: string; expiresAt: number }>();
const SET_PW_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (password.length < 6) {
      res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = getUserByEmail(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const dbPath = path.join(DATA_DIR, `user_${nanoid(10)}.db`);
    const user = createUser(email.toLowerCase(), passwordHash, dbPath);

    // Initialize fresh DB for new user
    await openUserDb(dbPath);

    const session = createSession(user.id);
    res.json({ token: session.token, email: user.email });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = getUserByEmail(
      typeof email === "string" ? email.toLowerCase() : email
    );
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.password_hash === null) {
      const spToken = crypto.randomBytes(32).toString("hex");
      setPasswordTokens.set(spToken, {
        userId: user.id,
        expiresAt: Date.now() + SET_PW_TOKEN_TTL,
      });
      res.status(403).json({ error: "PASSWORD_NOT_SET", setPasswordToken: spToken });
      return;
    }

    if (!(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const session = createSession(user.id);
    res.json({ token: session.token, email: user.email });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    deleteSession(token);
  }
  res.status(204).send();
});

router.post("/set-password", loginLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token is required" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
      return;
    }

    const entry = setPasswordTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      setPasswordTokens.delete(token);
      res.status(401).json({ error: "Invalid or expired token. Please try logging in again." });
      return;
    }
    setPasswordTokens.delete(token);

    const user = getUserById(entry.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.password_hash !== null) {
      res
        .status(403)
        .json({ error: "Password already set. Use login instead." });
      return;
    }

    const passwordHash = await hashPassword(password);
    updatePasswordHash(user.id, passwordHash);
    res.json({ success: true });
  } catch (err) {
    console.error("Set password error:", err);
    res.status(500).json({ error: "Failed to set password" });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  const user = getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ email: user.email, isAdmin: user.is_admin });
});

export default router;
