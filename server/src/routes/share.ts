import { Router } from "express";
import { nanoid } from "nanoid";
import { getDb, persist } from "../db.js";

const router = Router();

router.post("/", (req, res) => {
  try {
    const { title } = req.body;
    const db = getDb();

    const songsResult = db.exec(`
      SELECT s.video_id, s.title, s.artists, s.thumbnail, s.duration, s.playlist_id,
             r.rating, r.rd, r.vol, r.wins, r.losses, r.draws
      FROM songs s
      JOIN ratings r ON s.video_id = r.video_id
      ORDER BY r.rating DESC
    `);

    if (!songsResult.length || !songsResult[0].values.length) {
      res.status(400).json({ error: "No songs to share" });
      return;
    }

    const songs = songsResult[0].values.map((row: unknown[]) => ({
      video_id: row[0],
      title: row[1],
      artists: JSON.parse(row[2] as string),
      thumbnail: row[3],
      duration: row[4],
      playlist_id: row[5],
      rating: row[6],
      rd: row[7],
      vol: row[8],
      wins: row[9],
      losses: row[10],
      draws: row[11],
    }));

    const id = nanoid(10);
    const stmt = db.prepare(
      `INSERT INTO shares (id, title, data) VALUES (?, ?, ?)`
    );
    stmt.bind([id, title || "My Rankings", JSON.stringify(songs)]);
    stmt.step();
    stmt.free();

    persist();

    res.json({ id, url: `/shared/${id}` });
  } catch (err) {
    console.error("Create share error:", err);
    res.status(500).json({ error: "Failed to create share" });
  }
});

router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const result = db.exec(
      `SELECT id, title, data, created_at FROM shares WHERE id = ?`,
      [req.params.id]
    );

    if (!result.length || !result[0].values.length) {
      res.status(404).json({ error: "Share not found" });
      return;
    }

    const row = result[0].values[0];
    res.json({
      id: row[0],
      title: row[1],
      songs: JSON.parse(row[2] as string),
      created_at: row[3],
    });
  } catch (err) {
    console.error("Get share error:", err);
    res.status(500).json({ error: "Failed to fetch share" });
  }
});

export default router;
