import { Router } from "express";
import { getActivePlaylistRef, persistDb, querySongsWithRatings } from "../db.js";
import { recomputeRatings } from "../glicko.js";

const router = Router();

router.get("/", (req, res) => {
  try {
    const db = req.userDb!;
    const search = (req.query.search as string | undefined)?.toLowerCase();
    const playlistRef = getActivePlaylistRef(db);

    let songs = querySongsWithRatings(db, playlistRef);
    if (search) {
      songs = songs.filter(
        (s) =>
          s.title.toLowerCase().includes(search) ||
          s.artists.some((a) => a.toLowerCase().includes(search))
      );
    }

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

    const topSong = querySongsWithRatings(db, playlistRef)[0] ?? null;

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

router.delete("/:videoId", (req, res) => {
  try {
    const db = req.userDb!;
    const playlistRef = getActivePlaylistRef(db);
    const { videoId } = req.params;

    const existsResult = db.exec(
      "SELECT video_id FROM songs WHERE video_id = ? AND playlist_ref = ?",
      [videoId, playlistRef]
    );
    if (!existsResult.length || !existsResult[0].values.length) {
      res.status(404).json({ error: "Song not found" });
      return;
    }

    const matchCountResult = db.exec(
      "SELECT COUNT(*) FROM matches WHERE playlist_ref = ? AND (song1_id = ? OR song2_id = ?)",
      [playlistRef, videoId, videoId]
    );
    const removedMatches = matchCountResult.length
      ? (matchCountResult[0].values[0][0] as number)
      : 0;

    // Manual cascade — this schema has no real FK constraints.
    db.run(
      "DELETE FROM matches WHERE playlist_ref = ? AND (song1_id = ? OR song2_id = ?)",
      [playlistRef, videoId, videoId]
    );
    db.run("DELETE FROM ratings WHERE playlist_ref = ? AND video_id = ?", [
      playlistRef,
      videoId,
    ]);
    db.run("DELETE FROM songs WHERE playlist_ref = ? AND video_id = ?", [
      playlistRef,
      videoId,
    ]);

    // Removing the song's battles changes what everyone else's ratings should
    // be — replay the surviving history from scratch.
    recomputeRatings(db, playlistRef);

    persistDb(db, req.userDbPath!);

    res.json({ success: true, removedMatches });
  } catch (err) {
    console.error("Delete song error:", err);
    res.status(500).json({ error: "Failed to remove song" });
  }
});

export default router;
