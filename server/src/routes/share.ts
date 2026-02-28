import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getShare, createShare } from "../usersDb.js";

const router = Router();

// Protected: create share
router.post("/", authMiddleware, (req, res) => {
  try {
    const { title } = req.body;
    const db = req.userDb!;

    const songsResult = db.exec(`
      SELECT s.video_id, s.title, s.artists, s.thumbnail, s.duration, s.playlist_id,
             r.rating, r.rd, r.vol, r.wins, r.losses, r.draws, s.source
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
      source: (row[12] as string) || "youtube",
    }));

    const id = createShare(req.userId!, title || "My Rankings", JSON.stringify(songs));
    res.json({ id, url: `/shared/${id}` });
  } catch (err) {
    console.error("Create share error:", err);
    res.status(500).json({ error: "Failed to create share" });
  }
});

// Public: get share
router.get("/:id", (req, res) => {
  try {
    const share = getShare(req.params.id);
    if (!share) {
      res.status(404).json({ error: "Share not found" });
      return;
    }
    res.json({
      id: share.id,
      title: share.title,
      songs: JSON.parse(share.data),
      created_at: share.created_at,
    });
  } catch (err) {
    console.error("Get share error:", err);
    res.status(500).json({ error: "Failed to fetch share" });
  }
});

export default router;
