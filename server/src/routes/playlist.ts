import { Router } from "express";
import YTMusic from "ytmusic-api";
import { getDb, persist } from "../db.js";
import {
  extractSpotifyPlaylistId,
  getSpotifyPlaylistTracks,
} from "../spotify.js";

const router = Router();
let ytmusic: YTMusic | null = null;

async function getYTMusic(): Promise<YTMusic> {
  if (!ytmusic) {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
  }
  return ytmusic;
}

type Source = "youtube" | "spotify";

function detectSource(input: string): Source | null {
  if (
    input.includes("youtube.com") ||
    input.includes("youtu.be") ||
    input.includes("list=")
  ) {
    return "youtube";
  }
  if (input.includes("open.spotify.com/playlist/")) {
    return "spotify";
  }
  return null;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

router.post("/import", async (req, res) => {
  try {
    let { playlistId, source } = req.body as {
      playlistId?: string;
      source?: Source;
    };

    if (!playlistId || typeof playlistId !== "string") {
      res.status(400).json({ error: "playlistId is required" });
      return;
    }

    playlistId = playlistId.trim();

    if (!source) {
      source = detectSource(playlistId) ?? "youtube";
    }

    if (source === "spotify") {
      await importSpotify(playlistId, res);
    } else {
      await importYouTube(playlistId, res);
    }
  } catch (err: unknown) {
    console.error("Playlist import error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to import playlist: ${message}` });
  }
});

async function importYouTube(
  playlistId: string,
  res: import("express").Response
) {
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
    `INSERT OR IGNORE INTO songs (video_id, title, artists, thumbnail, duration, playlist_id, source)
     VALUES (?, ?, ?, ?, ?, ?, 'youtube')`
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

  const songs = querySongsByPlaylist(db, playlistId);
  res.json({ imported, songs });
}

async function importSpotify(
  input: string,
  res: import("express").Response
) {
  const playlistId = extractSpotifyPlaylistId(input);
  if (!playlistId) {
    res.status(400).json({
      error: "Invalid Spotify playlist URL. Expected: https://open.spotify.com/playlist/...",
    });
    return;
  }

  const tracks = await getSpotifyPlaylistTracks(playlistId);

  if (tracks.length === 0) {
    res.status(404).json({ error: "No tracks found in Spotify playlist" });
    return;
  }

  const db = getDb();
  const insertSong = db.prepare(
    `INSERT OR IGNORE INTO songs (video_id, title, artists, thumbnail, duration, playlist_id, source)
     VALUES (?, ?, ?, ?, ?, ?, 'spotify')`
  );
  const insertRating = db.prepare(
    `INSERT OR IGNORE INTO ratings (video_id) VALUES (?)`
  );

  let imported = 0;
  for (const track of tracks) {
    const videoId = `sp:${track.id}`;

    insertSong.bind([
      videoId,
      track.name,
      JSON.stringify(track.artists),
      track.thumbnail,
      formatDuration(track.durationMs),
      `sp:${playlistId}`,
    ]);
    insertSong.step();
    insertSong.reset();

    insertRating.bind([videoId]);
    insertRating.step();
    insertRating.reset();

    imported++;
  }

  insertSong.free();
  insertRating.free();
  persist();

  const songs = querySongsByPlaylist(db, `sp:${playlistId}`);
  res.json({ imported, songs });
}

function querySongsByPlaylist(db: ReturnType<typeof getDb>, playlistId: string) {
  const result = db.exec(
    `SELECT video_id, title, artists, thumbnail, duration, playlist_id, source
     FROM songs WHERE playlist_id = ?`,
    [playlistId]
  );

  if (!result.length || !result[0].values) return [];

  return result[0].values.map((row: unknown[]) => ({
    video_id: row[0],
    title: row[1],
    artists: JSON.parse(row[2] as string),
    thumbnail: row[3],
    duration: row[4],
    playlist_id: row[5],
    source: row[6],
  }));
}

export default router;
