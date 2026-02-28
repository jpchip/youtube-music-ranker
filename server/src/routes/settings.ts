import { Router } from "express";
import { persistDb } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const db = req.userDb!;
  const rows = db.exec(
    "SELECT key, value FROM settings WHERE key IN ('spotify_client_id', 'spotify_client_secret')"
  );
  const credMap: Record<string, string> = {};
  if (rows.length > 0) {
    for (const row of rows[0].values) {
      credMap[row[0] as string] = row[1] as string;
    }
  }
  res.json({
    clientId: credMap["spotify_client_id"] ?? null,
    hasSecret: !!credMap["spotify_client_secret"],
  });
});

router.post("/", (req, res) => {
  const db = req.userDb!;
  const dbPath = req.userDbPath!;
  const { clientId, clientSecret } = req.body as {
    clientId?: unknown;
    clientSecret?: unknown;
  };

  if (
    typeof clientId !== "string" ||
    typeof clientSecret !== "string" ||
    !clientId.trim() ||
    !clientSecret.trim()
  ) {
    res.status(400).json({ error: "clientId and clientSecret are required" });
    return;
  }

  db.run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('spotify_client_id', ?)",
    [clientId.trim()]
  );
  db.run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('spotify_client_secret', ?)",
    [clientSecret.trim()]
  );
  persistDb(db, dbPath);
  res.json({ ok: true });
});

router.delete("/", (req, res) => {
  const db = req.userDb!;
  const dbPath = req.userDbPath!;
  db.run(
    "DELETE FROM settings WHERE key IN ('spotify_client_id', 'spotify_client_secret')"
  );
  persistDb(db, dbPath);
  res.json({ ok: true });
});

export default router;
