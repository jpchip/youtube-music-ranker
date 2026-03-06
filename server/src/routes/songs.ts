import { Router } from "express";
import { getActivePlaylistRef } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  try {
    const db = req.userDb!;
    const search = req.query.search as string | undefined;
    const playlistRef = getActivePlaylistRef(db);

    let query = `
      SELECT s.video_id, s.title, s.artists, s.thumbnail, s.duration, s.playlist_id,
             r.rating, r.rd, r.vol, r.wins, r.losses, r.draws, s.source
      FROM songs s
      JOIN ratings r ON s.video_id = r.video_id AND s.playlist_ref = r.playlist_ref
      WHERE s.playlist_ref = ?
    `;

    const params: (string | number)[] = [playlistRef];
    if (search) {
      query += ` AND (s.title LIKE ? OR s.artists LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY r.rating DESC`;

    const result = db.exec(query, params);

    if (!result.length || !result[0].values.length) {
      res.json([]);
      return;
    }

    const songs = result[0].values.map((row: unknown[]) => ({
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

    res.json(songs);
  } catch (err) {
    console.error("Get songs error:", err);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

router.get("/stats", (_req, res) => {
  try {
    const db = _req.userDb!;
    const playlistRef = getActivePlaylistRef(db);

    const songCountResult = db.exec(
      "SELECT COUNT(*) FROM songs WHERE playlist_ref = ?",
      [playlistRef]
    );
    const totalSongs =
      songCountResult.length ? (songCountResult[0].values[0][0] as number) : 0;

    const matchCountResult = db.exec(
      "SELECT COUNT(*) FROM matches WHERE playlist_ref = ?",
      [playlistRef]
    );
    const totalMatches =
      matchCountResult.length
        ? (matchCountResult[0].values[0][0] as number)
        : 0;

    const topResult = db.exec(`
      SELECT s.video_id, s.title, s.artists, s.thumbnail, s.duration, s.playlist_id,
             r.rating, r.rd, r.vol, r.wins, r.losses, r.draws, s.source
      FROM songs s
      JOIN ratings r ON s.video_id = r.video_id AND s.playlist_ref = r.playlist_ref
      WHERE s.playlist_ref = ?
      ORDER BY r.rating DESC
      LIMIT 1
    `, [playlistRef]);

    let topSong = null;
    if (topResult.length && topResult[0].values.length) {
      const row = topResult[0].values[0];
      topSong = {
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
      };
    }

    const totalPairs = totalSongs > 1 ? (totalSongs * (totalSongs - 1)) / 2 : 0;

    const uniquePairsResult = db.exec(
      `SELECT COUNT(*) FROM (
         SELECT DISTINCT
           CASE WHEN song1_id < song2_id THEN song1_id ELSE song2_id END AS a,
           CASE WHEN song1_id < song2_id THEN song2_id ELSE song1_id END AS b
         FROM matches
         WHERE playlist_ref = ?
       )`,
      [playlistRef]
    );
    const uniquePairsBattled =
      uniquePairsResult.length
        ? (uniquePairsResult[0].values[0][0] as number)
        : 0;

    const percentComplete =
      totalPairs > 0
        ? Math.round((uniquePairsBattled / totalPairs) * 1000) / 10
        : 0;

    // Get playlist name
    const playlistResult = db.exec(
      "SELECT name FROM playlists WHERE id = ?",
      [playlistRef]
    );
    const playlistName =
      playlistResult.length && playlistResult[0].values.length
        ? (playlistResult[0].values[0][0] as string)
        : "My Playlist";

    res.json({
      totalSongs,
      totalMatches,
      totalPairs,
      uniquePairsBattled,
      percentComplete,
      topSong,
      playlistName,
      playlistRef,
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
