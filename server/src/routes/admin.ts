import { Router } from "express";
import { getAllUsers, getUserById } from "../usersDb.js";
import { openUserDb } from "../db.js";
import { Database } from "sql.js";

const router = Router();

interface PlaylistStats {
  id: string;
  name: string;
  songCount: number;
  matchCount: number;
  percentComplete: number;
  topSong: { title: string; rating: number } | null;
}

function getPlaylistStats(db: Database, playlistRef: string): {
  totalSongs: number;
  totalMatches: number;
  totalPairs: number;
  uniquePairsBattled: number;
  percentComplete: number;
  topSong: { title: string; rating: number } | null;
} {
  const songCountResult = db.exec(
    "SELECT COUNT(*) FROM songs WHERE playlist_ref = ?",
    [playlistRef]
  );
  const totalSongs = songCountResult.length
    ? (songCountResult[0].values[0][0] as number)
    : 0;

  const matchCountResult = db.exec(
    "SELECT COUNT(*) FROM matches WHERE playlist_ref = ?",
    [playlistRef]
  );
  const totalMatches = matchCountResult.length
    ? (matchCountResult[0].values[0][0] as number)
    : 0;

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
  const uniquePairsBattled = uniquePairsResult.length
    ? (uniquePairsResult[0].values[0][0] as number)
    : 0;

  const percentComplete =
    totalPairs > 0
      ? Math.round((uniquePairsBattled / totalPairs) * 1000) / 10
      : 0;

  let topSong: { title: string; rating: number } | null = null;
  const topResult = db.exec(`
    SELECT s.title, r.rating
    FROM songs s
    JOIN ratings r ON s.video_id = r.video_id AND s.playlist_ref = r.playlist_ref
    WHERE s.playlist_ref = ?
    ORDER BY r.rating DESC
    LIMIT 1
  `, [playlistRef]);
  if (topResult.length && topResult[0].values.length) {
    const row = topResult[0].values[0];
    topSong = { title: row[0] as string, rating: row[1] as number };
  }

  return { totalSongs, totalMatches, totalPairs, uniquePairsBattled, percentComplete, topSong };
}

function getAllPlaylistsStats(db: Database): PlaylistStats[] {
  const playlistsResult = db.exec(
    "SELECT id, name FROM playlists ORDER BY created_at ASC"
  );
  if (!playlistsResult.length || !playlistsResult[0].values.length) return [];

  return playlistsResult[0].values.map((row: unknown[]) => {
    const id = row[0] as string;
    const name = row[1] as string;
    const stats = getPlaylistStats(db, id);
    return {
      id,
      name,
      songCount: stats.totalSongs,
      matchCount: stats.totalMatches,
      percentComplete: stats.percentComplete,
      topSong: stats.topSong,
    };
  });
}

router.get("/users", async (_req, res) => {
  try {
    const users = getAllUsers();
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let playlists: PlaylistStats[] = [];
        let aggregateStats = {
          totalSongs: 0,
          totalMatches: 0,
          totalPairs: 0,
          uniquePairsBattled: 0,
          percentComplete: 0,
          topSong: null as { title: string; rating: number } | null,
        };
        try {
          const db = await openUserDb(user.db_path);
          playlists = getAllPlaylistsStats(db);
          // Aggregate across all playlists
          aggregateStats.totalSongs = playlists.reduce((s, p) => s + p.songCount, 0);
          aggregateStats.totalMatches = playlists.reduce((s, p) => s + p.matchCount, 0);
          // Find best top song across all playlists
          const bestPlaylist = playlists.reduce(
            (best, p) =>
              !best || (p.topSong && (!best.topSong || p.topSong.rating > best.topSong.rating))
                ? p
                : best,
            null as PlaylistStats | null
          );
          aggregateStats.topSong = bestPlaylist?.topSong ?? null;
        } catch {
          // User DB might not exist or be corrupted
        }
        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          is_admin: user.is_admin,
          playlists,
          stats: aggregateStats,
        };
      })
    );

    const totalUsers = usersWithStats.length;
    const totalBattles = usersWithStats.reduce((sum, u) => sum + u.stats.totalMatches, 0);
    const totalSongs = usersWithStats.reduce((sum, u) => sum + u.stats.totalSongs, 0);
    const totalPlaylists = usersWithStats.reduce((sum, u) => sum + u.playlists.length, 0);

    res.json({
      summary: { totalUsers, totalBattles, totalSongs, totalPlaylists },
      users: usersWithStats,
    });
  } catch (err) {
    console.error("Admin get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/users/:id/stats", async (req, res) => {
  try {
    const user = getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const db = await openUserDb(user.db_path);

    // Get all playlists
    const allPlaylists = getAllPlaylistsStats(db);

    // Determine which playlist to scope to
    let playlistRef = req.query.playlistRef as string | undefined;
    if (!playlistRef || !allPlaylists.find((p) => p.id === playlistRef)) {
      // Default to first playlist
      playlistRef = allPlaylists[0]?.id ?? "default";
    }

    const stats = getPlaylistStats(db, playlistRef);

    const songsResult = db.exec(`
      SELECT s.video_id, s.title, s.artists, s.thumbnail, s.duration, s.playlist_id,
             r.rating, r.rd, r.vol, r.wins, r.losses, r.draws, s.source
      FROM songs s
      JOIN ratings r ON s.video_id = r.video_id AND s.playlist_ref = r.playlist_ref
      WHERE s.playlist_ref = ?
      ORDER BY r.rating DESC
    `, [playlistRef]);

    const songs =
      songsResult.length && songsResult[0].values.length
        ? songsResult[0].values.map((row: unknown[]) => ({
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
          }))
        : [];

    const recentMatchesResult = db.exec(`
      SELECT m.id, m.song1_id, m.song2_id, m.winner_id, m.created_at,
             s1.title AS song1_title, s2.title AS song2_title
      FROM matches m
      JOIN songs s1 ON m.song1_id = s1.video_id AND m.playlist_ref = s1.playlist_ref
      JOIN songs s2 ON m.song2_id = s2.video_id AND m.playlist_ref = s2.playlist_ref
      WHERE m.playlist_ref = ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [playlistRef]);

    const recentMatches =
      recentMatchesResult.length && recentMatchesResult[0].values.length
        ? recentMatchesResult[0].values.map((row: unknown[]) => ({
            id: row[0],
            song1_id: row[1],
            song2_id: row[2],
            winner_id: row[3],
            created_at: row[4],
            song1_title: row[5],
            song2_title: row[6],
          }))
        : [];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        is_admin: user.is_admin,
      },
      playlists: allPlaylists,
      activePlaylistRef: playlistRef,
      stats,
      songs,
      recentMatches,
    });
  } catch (err) {
    console.error("Admin get user stats error:", err);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

export default router;
