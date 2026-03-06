import { Router } from "express";
import { nanoid } from "nanoid";
import { persistDb, getActivePlaylistRef } from "../db.js";

const router = Router();

const MAX_PLAYLISTS = 10;

router.get("/", (req, res) => {
  try {
    const db = req.userDb!;

    const result = db.exec(`
      SELECT p.id, p.name, p.created_at,
             COUNT(DISTINCT s.video_id) AS song_count
      FROM playlists p
      LEFT JOIN songs s ON s.playlist_ref = p.id
      GROUP BY p.id, p.name, p.created_at
      ORDER BY p.created_at ASC
    `);

    const playlists =
      result.length && result[0].values.length
        ? result[0].values.map((row: unknown[]) => ({
            id: row[0] as string,
            name: row[1] as string,
            created_at: row[2] as number,
            songCount: row[3] as number,
          }))
        : [];

    const activeId = getActivePlaylistRef(db);

    res.json({ playlists, activeId });
  } catch (err) {
    console.error("Get playlists error:", err);
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

router.post("/", (req, res) => {
  try {
    const db = req.userDb!;
    const dbPath = req.userDbPath!;
    const { name } = req.body as { name?: string };

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Playlist name is required" });
      return;
    }

    const countResult = db.exec("SELECT COUNT(*) FROM playlists");
    const count = (countResult[0]?.values[0][0] as number) ?? 0;
    if (count >= MAX_PLAYLISTS) {
      res.status(400).json({
        error: `You can only have up to ${MAX_PLAYLISTS} playlists.`,
      });
      return;
    }

    const id = nanoid(10);
    const stmt = db.prepare(
      "INSERT INTO playlists (id, name) VALUES (?, ?)"
    );
    stmt.bind([id, name.trim()]);
    stmt.step();
    stmt.free();

    persistDb(db, dbPath);

    const newResult = db.exec(
      "SELECT id, name, created_at FROM playlists WHERE id = ?",
      [id]
    );
    const row = newResult[0].values[0];
    res.json({ id: row[0], name: row[1], created_at: row[2], songCount: 0 });
  } catch (err) {
    console.error("Create playlist error:", err);
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const db = req.userDb!;
    const dbPath = req.userDbPath!;
    const { id } = req.params;

    // Must have at least one playlist remaining
    const countResult = db.exec("SELECT COUNT(*) FROM playlists");
    const count = (countResult[0]?.values[0][0] as number) ?? 0;
    if (count <= 1) {
      res
        .status(400)
        .json({ error: "Cannot delete your only playlist." });
      return;
    }

    const existsResult = db.exec("SELECT id FROM playlists WHERE id = ?", [id]);
    if (!existsResult.length || !existsResult[0].values.length) {
      res.status(404).json({ error: "Playlist not found" });
      return;
    }

    // Manually cascade delete since sql.js FK enforcement can be tricky
    db.run("DELETE FROM matches WHERE playlist_ref = ?", [id]);
    db.run("DELETE FROM ratings WHERE playlist_ref = ?", [id]);
    db.run("DELETE FROM songs WHERE playlist_ref = ?", [id]);
    db.run("DELETE FROM playlists WHERE id = ?", [id]);

    // If deleted playlist was active, switch to first remaining
    const activeId = getActivePlaylistRef(db);
    const activeCheck = db.exec("SELECT id FROM playlists WHERE id = ?", [activeId]);
    const newActive =
      activeCheck.length && activeCheck[0].values.length
        ? activeId
        : (() => {
            const first = db.exec(
              "SELECT id FROM playlists ORDER BY created_at ASC LIMIT 1"
            );
            return first.length && first[0].values.length
              ? (first[0].values[0][0] as string)
              : null;
          })();

    if (newActive) {
      db.run(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_playlist', ?)",
        [newActive]
      );
    }

    persistDb(db, dbPath);
    res.json({ success: true, activeId: newActive });
  } catch (err) {
    console.error("Delete playlist error:", err);
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});

router.put("/active", (req, res) => {
  try {
    const db = req.userDb!;
    const dbPath = req.userDbPath!;
    const { id } = req.body as { id?: string };

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const existsResult = db.exec("SELECT id FROM playlists WHERE id = ?", [id]);
    if (!existsResult.length || !existsResult[0].values.length) {
      res.status(404).json({ error: "Playlist not found" });
      return;
    }

    db.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_playlist', ?)",
      [id]
    );
    persistDb(db, dbPath);
    res.json({ activeId: id });
  } catch (err) {
    console.error("Set active playlist error:", err);
    res.status(500).json({ error: "Failed to set active playlist" });
  }
});

export default router;
