import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

// IP-based (for public auth routes)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Too many accounts created. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: "Too many login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// User-based (applied after authMiddleware sets req.userId)
const userKey = (req: Request) =>
  (req as any).userId ?? ipKeyGenerator(req.ip ?? "unknown");

export const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: userKey,
  message: { error: "Import limit reached. Try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const shareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: userKey,
  message: { error: "Share limit reached. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const battleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  keyGenerator: userKey,
  message: { error: "Slow down! Too many battles submitted." },
  standardHeaders: true,
  legacyHeaders: false,
});
