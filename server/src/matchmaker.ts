import { getDb } from "./db.js";

interface SongRating {
  video_id: string;
  rating: number;
  rd: number;
}

/**
 * Selects two songs for a head-to-head battle.
 * Strategy:
 * 1. Prioritize songs with highest RD (most uncertain)
 * 2. Avoid recently matched pairs (last 20 matches)
 * 3. Try to pair songs within a similar rating band
 */
export function getNextMatchup(): { song1Id: string; song2Id: string } | null {
  const db = getDb();

  const songs = db.exec(
    `SELECT r.video_id, r.rating, r.rd
     FROM ratings r
     ORDER BY r.rd DESC, RANDOM()`
  );

  if (!songs.length || !songs[0].values.length || songs[0].values.length < 2) {
    return null;
  }

  const allSongs: SongRating[] = songs[0].values.map((row: unknown[]) => ({
    video_id: row[0] as string,
    rating: row[1] as number,
    rd: row[2] as number,
  }));

  const recentResult = db.exec(
    `SELECT song1_id, song2_id FROM matches
     ORDER BY created_at DESC LIMIT 20`
  );

  const recentPairs = new Set<string>();
  if (recentResult.length && recentResult[0].values.length) {
    for (const row of recentResult[0].values) {
      const a = row[0] as string;
      const b = row[1] as string;
      recentPairs.add(`${a}|${b}`);
      recentPairs.add(`${b}|${a}`);
    }
  }

  const song1 = allSongs[0];

  const ratingBand = 200;
  const preferred = allSongs.filter(
    (s) =>
      s.video_id !== song1.video_id &&
      !recentPairs.has(`${song1.video_id}|${s.video_id}`) &&
      Math.abs(s.rating - song1.rating) <= ratingBand
  );

  if (preferred.length > 0) {
    const idx = Math.floor(Math.random() * preferred.length);
    return { song1Id: song1.video_id, song2Id: preferred[idx].video_id };
  }

  const fallback = allSongs.filter(
    (s) =>
      s.video_id !== song1.video_id &&
      !recentPairs.has(`${song1.video_id}|${s.video_id}`)
  );

  if (fallback.length > 0) {
    const idx = Math.floor(Math.random() * fallback.length);
    return { song1Id: song1.video_id, song2Id: fallback[idx].video_id };
  }

  // All pairs have been recently matched; just pick any two different songs
  const other = allSongs.find((s) => s.video_id !== song1.video_id);
  if (!other) return null;

  return { song1Id: song1.video_id, song2Id: other.video_id };
}
