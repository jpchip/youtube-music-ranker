import Glicko2 from "glicko2";
import { Database } from "sql.js";

const { Glicko2: Glicko2System } = Glicko2;

// Schema defaults for a fresh rating row — kept in sync with the `ratings`
// table definition in db.ts. Note the RD default here is 350, matching the
// table, not the 200 the Glicko2System below is configured with.
export const DEFAULT_RATING = 1500;
export const DEFAULT_RD = 350;
export const DEFAULT_VOL = 0.06;

interface RatingData {
  rating: number;
  rd: number;
  vol: number;
}

interface UpdatedRatings {
  player1: RatingData;
  player2: RatingData;
}

/**
 * Processes a single match between two players and returns updated ratings.
 * outcome: 1 = player1 wins, 0 = player2 wins, 0.5 = draw
 */
export function processMatch(
  p1: RatingData,
  p2: RatingData,
  outcome: number
): UpdatedRatings {
  const ranking = new Glicko2System({
    tau: 0.5,
    rating: 1500,
    rd: 200,
    vol: 0.06,
  });

  const player1 = ranking.makePlayer(p1.rating, p1.rd, p1.vol);
  const player2 = ranking.makePlayer(p2.rating, p2.rd, p2.vol);

  ranking.updateRatings([[player1, player2, outcome]]);

  return {
    player1: {
      rating: player1.getRating(),
      rd: player1.getRd(),
      vol: player1.getVol(),
    },
    player2: {
      rating: player2.getRating(),
      rd: player2.getRd(),
      vol: player2.getVol(),
    },
  };
}

interface SongRatingState {
  rating: number;
  rd: number;
  vol: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Recomputes every song's rating and W/L/D record for a playlist from scratch
 * by replaying its full match history through processMatch.
 *
 * Ratings are stored incrementally (see battle.ts POST /result), so removing a
 * song leaves its influence baked into every opponent. This resets all surviving
 * songs to the schema defaults and replays the remaining matches in insertion
 * order — the exact same arithmetic battle.ts performed, in the same sequence —
 * producing the state as if the removed song had never existed.
 *
 * Does NOT call persistDb; the caller owns persistence.
 */
export function recomputeRatings(db: Database, playlistRef: string): void {
  const states = new Map<string, SongRatingState>();

  const songsResult = db.exec(
    "SELECT video_id FROM ratings WHERE playlist_ref = ?",
    [playlistRef]
  );
  if (songsResult.length && songsResult[0].values.length) {
    for (const row of songsResult[0].values) {
      states.set(row[0] as string, {
        rating: DEFAULT_RATING,
        rd: DEFAULT_RD,
        vol: DEFAULT_VOL,
        wins: 0,
        losses: 0,
        draws: 0,
      });
    }
  }

  // Order by id (AUTOINCREMENT) — the true insertion order. created_at is only
  // second-resolution and ties on rapid battles.
  const matchesResult = db.exec(
    "SELECT song1_id, song2_id, winner_id FROM matches WHERE playlist_ref = ? ORDER BY id ASC",
    [playlistRef]
  );
  if (matchesResult.length && matchesResult[0].values.length) {
    for (const row of matchesResult[0].values) {
      const song1Id = row[0] as string;
      const song2Id = row[1] as string;
      const winnerId = row[2] as string | null;

      const s1 = states.get(song1Id);
      const s2 = states.get(song2Id);
      if (!s1 || !s2) continue; // defensive: match references a removed song

      let outcome: number;
      if (winnerId === song1Id) outcome = 1;
      else if (winnerId === song2Id) outcome = 0;
      else outcome = 0.5;

      const updated = processMatch(
        { rating: s1.rating, rd: s1.rd, vol: s1.vol },
        { rating: s2.rating, rd: s2.rd, vol: s2.vol },
        outcome
      );

      s1.rating = updated.player1.rating;
      s1.rd = updated.player1.rd;
      s1.vol = updated.player1.vol;
      s2.rating = updated.player2.rating;
      s2.rd = updated.player2.rd;
      s2.vol = updated.player2.vol;

      if (outcome === 1) {
        s1.wins++;
        s2.losses++;
      } else if (outcome === 0) {
        s1.losses++;
        s2.wins++;
      } else {
        s1.draws++;
        s2.draws++;
      }
    }
  }

  const update = db.prepare(
    `UPDATE ratings SET rating = ?, rd = ?, vol = ?, wins = ?, losses = ?, draws = ?
     WHERE video_id = ? AND playlist_ref = ?`
  );
  for (const [videoId, s] of states) {
    update.bind([s.rating, s.rd, s.vol, s.wins, s.losses, s.draws, videoId, playlistRef]);
    update.step();
    update.reset();
  }
  update.free();
}
