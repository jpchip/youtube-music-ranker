import { Router } from "express";
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

const router = Router();

router.post("/register", async (req, res) => {
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

    const passwordHash = hashPassword(password);
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

router.post("/login", async (req, res) => {
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
      res.status(403).json({ error: "PASSWORD_NOT_SET" });
      return;
    }

    if (!verifyPassword(password, user.password_hash)) {
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

router.post("/set-password", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (typeof password !== "string" || password.length < 6) {
      res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
      return;
    }

    const user = getUserByEmail(
      typeof email === "string" ? email.toLowerCase() : email
    );
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

    const passwordHash = hashPassword(password);
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
  res.json({ email: user.email });
});

export default router;
