import { Database } from "sql.js";

interface SongRating {
  video_id: string;
  rating: number;
  rd: number;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Selects two songs for a head-to-head battle within a specific playlist.
 * Strategy:
 * 1. Track all played pairs — never repeat a pair until all are exhausted
 * 2. Among unplayed pairs, prioritize songs with highest RD (most uncertain)
 * 3. Prefer pairing within a similar rating band
 * 4. Avoid back-to-back rematches (last 5) even after all pairs exhausted
 */
export function getNextMatchup(
  db: Database,
  playlistRef: string
): { song1Id: string; song2Id: string } | null {
  const songs = db.exec(
    `SELECT r.video_id, r.rating, r.rd
     FROM ratings r
     WHERE r.playlist_ref = ?
     ORDER BY r.rd DESC, RANDOM()`,
    [playlistRef]
  );

  if (!songs.length || !songs[0].values.length || songs[0].values.length < 2) {
    return null;
  }

  const allSongs: SongRating[] = songs[0].values.map((row: unknown[]) => ({
    video_id: row[0] as string,
    rating: row[1] as number,
    rd: row[2] as number,
  }));

  // All pairs ever played in this playlist
  const allMatchesResult = db.exec(
    `SELECT song1_id, song2_id FROM matches WHERE playlist_ref = ?`,
    [playlistRef]
  );
  const playedPairs = new Set<string>();
  if (allMatchesResult.length && allMatchesResult[0].values.length) {
    for (const row of allMatchesResult[0].values) {
      playedPairs.add(pairKey(row[0] as string, row[1] as string));
    }
  }

  // Recent pairs to avoid back-to-back rematches
  const recentResult = db.exec(
    `SELECT song1_id, song2_id FROM matches WHERE playlist_ref = ? ORDER BY created_at DESC LIMIT 5`,
    [playlistRef]
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

  const ratingBand = 200;

  // Scan songs in RD order; return first unplayed pair found.
  // Prefer within rating band, but fall back to any unplayed partner.
  for (const song1 of allSongs) {
    const unplayedInBand = allSongs.filter(
      (s) =>
        s.video_id !== song1.video_id &&
        !recentPairs.has(`${song1.video_id}|${s.video_id}`) &&
        !playedPairs.has(pairKey(song1.video_id, s.video_id)) &&
        Math.abs(s.rating - song1.rating) <= ratingBand
    );
    if (unplayedInBand.length > 0) {
      const idx = Math.floor(Math.random() * unplayedInBand.length);
      return { song1Id: song1.video_id, song2Id: unplayedInBand[idx].video_id };
    }

    const unplayed = allSongs.filter(
      (s) =>
        s.video_id !== song1.video_id &&
        !recentPairs.has(`${song1.video_id}|${s.video_id}`) &&
        !playedPairs.has(pairKey(song1.video_id, s.video_id))
    );
    if (unplayed.length > 0) {
      const idx = Math.floor(Math.random() * unplayed.length);
      return { song1Id: song1.video_id, song2Id: unplayed[idx].video_id };
    }
  }

  // All pairs exhausted — allow reruns but avoid back-to-back
  const song1 = allSongs[0];
  const fallback = allSongs.filter(
    (s) =>
      s.video_id !== song1.video_id &&
      !recentPairs.has(`${song1.video_id}|${s.video_id}`)
  );
  if (fallback.length > 0) {
    const idx = Math.floor(Math.random() * fallback.length);
    return { song1Id: song1.video_id, song2Id: fallback[idx].video_id };
  }

  const other = allSongs.find((s) => s.video_id !== song1.video_id);
  if (!other) return null;
  return { song1Id: song1.video_id, song2Id: other.video_id };
}
