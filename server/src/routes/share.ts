import { Router } from "express";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middleware/auth.js";
import {
  getShare,
  createShare,
  getUserById,
  type Share,
} from "../usersDb.js";
import { shareLimiter } from "../middleware/rateLimit.js";
import {
  getActivePlaylistRef,
  openUserDb,
  persistDb,
  querySongsWithRatings,
  type SongWithRating,
} from "../db.js";
import { MAX_PLAYLISTS } from "./playlists.js";

const router = Router();

/**
 * Resolve the songs for a share. Prefers a live read of the owner's current
 * playlist (so the shared rankings stay fresh); falls back to the frozen JSON
 * snapshot for legacy shares or when the owner/playlist no longer exists.
 */
async function resolveShareSongs(share: Share): Promise<SongWithRating[]> {
  if (share.playlist_ref) {
    try {
      const owner = getUserById(share.user_id);
      if (owner) {
        const ownerDb = await openUserDb(owner.db_path);
        const exists = ownerDb.exec("SELECT id FROM playlists WHERE id = ?", [
          share.playlist_ref,
        ]);
        if (exists.length && exists[0].values.length) {
          return querySongsWithRatings(ownerDb, share.playlist_ref);
        }
      }
    } catch (err) {
      console.error("Live share resolve failed, falling back to snapshot:", err);
    }
  }

  try {
    const parsed = JSON.parse(share.data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Protected: create share
router.post("/", authMiddleware, shareLimiter, (req, res) => {
  try {
    const { title } = req.body;
    const db = req.userDb!;
    const playlistRef = getActivePlaylistRef(db);

    // Get playlist name for the share title
    const playlistResult = db.exec(
      "SELECT name FROM playlists WHERE id = ?",
      [playlistRef]
    );
    const playlistName =
      playlistResult.length && playlistResult[0].values.length
        ? (playlistResult[0].values[0][0] as string)
        : "My Playlist";

    const songs = querySongsWithRatings(db, playlistRef);

    if (!songs.length) {
      res.status(400).json({ error: "No songs to share" });
      return;
    }

    const shareTitle = title || `${playlistName} Rankings`;
    const id = createShare(
      req.userId!,
      shareTitle,
      JSON.stringify(songs),
      playlistRef
    );
    res.json({ id, url: `/shared/${id}` });
  } catch (err) {
    console.error("Create share error:", err);
    res.status(500).json({ error: "Failed to create share" });
  }
});

// Public: get share
router.get("/:id", async (req, res) => {
  try {
    const share = getShare(req.params.id);
    if (!share) {
      res.status(404).json({ error: "Share not found" });
      return;
    }
    const songs = await resolveShareSongs(share);
    res.json({
      id: share.id,
      title: share.title,
      songs,
      created_at: share.created_at,
    });
  } catch (err) {
    console.error("Get share error:", err);
    res.status(500).json({ error: "Failed to fetch share" });
  }
});

// Protected: copy a shared playlist into the caller's account
router.post("/:id/copy", authMiddleware, shareLimiter, async (req, res) => {
  try {
    const share = getShare(String(req.params.id));
    if (!share) {
      res.status(404).json({ error: "Share not found" });
      return;
    }

    const songs = await resolveShareSongs(share);
    if (!songs.length) {
      res.status(400).json({ error: "This shared playlist has no songs" });
      return;
    }

    const db = req.userDb!;

    const countResult = db.exec("SELECT COUNT(*) FROM playlists");
    const count = (countResult[0]?.values[0][0] as number) ?? 0;
    if (count >= MAX_PLAYLISTS) {
      res.status(400).json({
        error: `You can only have up to ${MAX_PLAYLISTS} playlists.`,
      });
      return;
    }

    const rawName =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const name = rawName || share.title || "Copied Playlist";
    const playlistId = nanoid(10);

    const insertPlaylist = db.prepare(
      `INSERT INTO playlists (id, name, source_share_id, source_share_title)
       VALUES (?, ?, ?, ?)`
    );
    insertPlaylist.bind([playlistId, name, share.id, share.title]);
    insertPlaylist.step();
    insertPlaylist.free();

    const insertSong = db.prepare(
      `INSERT OR IGNORE INTO songs
        (video_id, playlist_ref, title, artists, thumbnail, duration, playlist_id, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertRating = db.prepare(
      `INSERT OR IGNORE INTO ratings (video_id, playlist_ref) VALUES (?, ?)`
    );

    let songCount = 0;
    for (const song of songs) {
      if (!song.video_id) continue;
      insertSong.bind([
        song.video_id,
        playlistId,
        song.title ?? "Unknown",
        JSON.stringify(
          Array.isArray(song.artists) ? song.artists : []
        ),
        song.thumbnail ?? "",
        song.duration ?? "",
        song.playlist_id ?? "",
        song.source === "spotify" ? "spotify" : "youtube",
      ]);
      insertSong.step();
      insertSong.reset();

      insertRating.bind([song.video_id, playlistId]);
      insertRating.step();
      insertRating.reset();

      songCount++;
    }
    insertSong.free();
    insertRating.free();

    db.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_playlist', ?)",
      [playlistId]
    );

    persistDb(db, req.userDbPath!);

    res.json({ playlistId, name, songCount });
  } catch (err) {
    console.error("Copy share error:", err);
    res.status(500).json({ error: "Failed to copy shared playlist" });
  }
});

export default router;
