import { Request, Response, NextFunction } from "express";
import { getSession, getUserById } from "../usersDb.js";
import { openUserDb } from "../db.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const user = getUserById(session.user_id);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.userId = user.id;
  req.userDbPath = user.db_path;
  req.userDb = await openUserDb(user.db_path);
  next();
}
