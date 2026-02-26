import { Router } from "express";
import YTMusic from "ytmusic-api";
import { getDb, persist } from "../db.js";

const router = Router();
let ytmusic: YTMusic | null = null;

async function getYTMusic(): Promise<YTMusic> {
  if (!ytmusic) {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
  }
  return ytmusic;
}

router.post("/import", async (req, res) => {
  try {
    let { playlistId } = req.body;
    if (!playlistId || typeof playlistId !== "string") {
      res.status(400).json({ error: "playlistId is required" });
      return;
    }

    playlistId = playlistId.trim();

    // Extract playlist ID from full URL if provided
    if (playlistId.includes("list=")) {
      const url = new URL(playlistId);
      playlistId = url.searchParams.get("list") || playlistId;
    }

    const yt = await getYTMusic();
    const videos = await yt.getPlaylistVideos(playlistId);

    if (!videos || videos.length === 0) {
      res.status(404).json({ error: "No songs found in playlist" });
      return;
    }

    const db = getDb();
    const insertSong = db.prepare(
      `INSERT OR IGNORE INTO songs (video_id, title, artists, thumbnail, duration, playlist_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertRating = db.prepare(
      `INSERT OR IGNORE INTO ratings (video_id) VALUES (?)`
    );

    let imported = 0;
    for (const video of videos) {
      if (!video.videoId) continue;

      const artists = video.artist ? [video.artist.name] : [];
      const thumbnail =
        video.thumbnails?.[video.thumbnails.length - 1]?.url ?? "";

      insertSong.bind([
        video.videoId,
        video.name || "Unknown",
        JSON.stringify(artists),
        thumbnail,
        video.duration?.toString() ?? "",
        playlistId,
      ]);
      insertSong.step();
      insertSong.reset();

      insertRating.bind([video.videoId]);
      insertRating.step();
      insertRating.reset();

      imported++;
    }

    insertSong.free();
    insertRating.free();
    persist();

    const songsResult = db.exec(
      `SELECT video_id, title, artists, thumbnail, duration, playlist_id
       FROM songs WHERE playlist_id = ?`,
      [playlistId]
    );

    const songs =
      songsResult.length && songsResult[0].values
        ? songsResult[0].values.map((row: unknown[]) => ({
            video_id: row[0],
            title: row[1],
            artists: JSON.parse(row[2] as string),
            thumbnail: row[3],
            duration: row[4],
            playlist_id: row[5],
          }))
        : [];

    res.json({ imported, songs });
  } catch (err: unknown) {
    console.error("Playlist import error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to import playlist: ${message}` });
  }
});

export default router;
