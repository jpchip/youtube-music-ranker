import { Router } from "express";
import { Database } from "sql.js";
import { persistDb } from "../db.js";
import { processMatch } from "../glicko.js";
import { getNextMatchup } from "../matchmaker.js";

const router = Router();

function getSongWithRating(db: Database, videoId: string) {
  const result = db.exec(
    `SELECT s.video_id, s.title, s.artists, s.thumbnail, s.duration, s.playlist_id,
            r.rating, r.rd, r.vol, r.wins, r.losses, r.draws, s.source
     FROM songs s
     JOIN ratings r ON s.video_id = r.video_id
     WHERE s.video_id = ?`,
    [videoId]
  );

  if (!result.length || !result[0].values.length) return null;

  const row = result[0].values[0];
  return {
    video_id: row[0] as string,
    title: row[1] as string,
    artists: JSON.parse(row[2] as string),
    thumbnail: row[3] as string,
    duration: row[4] as string,
    playlist_id: row[5] as string,
    rating: row[6] as number,
    rd: row[7] as number,
    vol: row[8] as number,
    wins: row[9] as number,
    losses: row[10] as number,
    draws: row[11] as number,
    source: (row[12] as string) || "youtube",
  };
}

router.get("/next", (_req, res) => {
  try {
    const db = _req.userDb!;
    let song1 = null,
      song2 = null;
    let attempts = 0;

    while ((!song1 || !song2) && attempts < 10) {
      const matchup = getNextMatchup(db);
      if (!matchup) {
        res.status(404).json({
          error: "Not enough songs for a battle. Import a playlist first.",
        });
        return;
      }
      song1 = getSongWithRating(db, matchup.song1Id);
      song2 = getSongWithRating(db, matchup.song2Id);
      attempts++;
    }

    if (!song1 || !song2) {
      res.status(500).json({ error: "Failed to load song data" });
      return;
    }

    res.json({ song1, song2 });
  } catch (err) {
    console.error("Get next battle error:", err);
    res.status(500).json({ error: "Failed to get next battle" });
  }
});

router.post("/result", (req, res) => {
  try {
    const db = req.userDb!;
    const { song1Id, song2Id, winnerId } = req.body;

    if (!song1Id || !song2Id) {
      res.status(400).json({ error: "song1Id and song2Id are required" });
      return;
    }

    if (winnerId && winnerId !== song1Id && winnerId !== song2Id) {
      res
        .status(400)
        .json({ error: "winnerId must be one of the two songs or null" });
      return;
    }

    const song1 = getSongWithRating(db, song1Id);
    const song2 = getSongWithRating(db, song2Id);

    if (!song1 || !song2) {
      res.status(404).json({ error: "One or both songs not found" });
      return;
    }

    let outcome: number;
    if (winnerId === song1Id) outcome = 1;
    else if (winnerId === song2Id) outcome = 0;
    else outcome = 0.5;

    const updated = processMatch(
      { rating: song1.rating, rd: song1.rd, vol: song1.vol },
      { rating: song2.rating, rd: song2.rd, vol: song2.vol },
      outcome
    );

    // Record match
    const insertMatch = db.prepare(
      `INSERT INTO matches (song1_id, song2_id, winner_id) VALUES (?, ?, ?)`
    );
    insertMatch.bind([song1Id, song2Id, winnerId]);
    insertMatch.step();
    insertMatch.free();

    // Update song1 ratings
    const winsAdd1 = winnerId === song1Id ? 1 : 0;
    const lossesAdd1 = winnerId === song2Id ? 1 : 0;
    const drawsAdd1 = winnerId === null ? 1 : 0;

    const update1 = db.prepare(
      `UPDATE ratings SET rating = ?, rd = ?, vol = ?,
       wins = wins + ?, losses = losses + ?, draws = draws + ?
       WHERE video_id = ?`
    );
    update1.bind([
      updated.player1.rating,
      updated.player1.rd,
      updated.player1.vol,
      winsAdd1,
      lossesAdd1,
      drawsAdd1,
      song1Id,
    ]);
    update1.step();
    update1.free();

    // Update song2 ratings
    const winsAdd2 = winnerId === song2Id ? 1 : 0;
    const lossesAdd2 = winnerId === song1Id ? 1 : 0;
    const drawsAdd2 = winnerId === null ? 1 : 0;

    const update2 = db.prepare(
      `UPDATE ratings SET rating = ?, rd = ?, vol = ?,
       wins = wins + ?, losses = losses + ?, draws = draws + ?
       WHERE video_id = ?`
    );
    update2.bind([
      updated.player2.rating,
      updated.player2.rd,
      updated.player2.vol,
      winsAdd2,
      lossesAdd2,
      drawsAdd2,
      song2Id,
    ]);
    update2.step();
    update2.free();

    persistDb(db, req.userDbPath!);

    // Check if all unique pairs have now been played
    const totalSongsRes = db.exec("SELECT COUNT(*) FROM songs");
    const totalSongs = (totalSongsRes[0]?.values[0][0] as number) ?? 0;
    const totalPairs = totalSongs > 1 ? (totalSongs * (totalSongs - 1)) / 2 : 0;
    const uniquePlayedRes = db.exec(
      `SELECT COUNT(*) FROM (
         SELECT DISTINCT
           CASE WHEN song1_id < song2_id THEN song1_id ELSE song2_id END AS a,
           CASE WHEN song1_id < song2_id THEN song2_id ELSE song1_id END AS b
         FROM matches
       )`
    );
    const uniquePlayed = (uniquePlayedRes[0]?.values[0][0] as number) ?? 0;
    const allPairsComplete = totalPairs > 0 && uniquePlayed >= totalPairs;

    let topSong = null;
    if (allPairsComplete) {
      const topRes = db.exec(
        `SELECT s.video_id, s.title, s.artists, s.thumbnail, s.duration, s.playlist_id,
                r.rating, r.rd, r.vol, r.wins, r.losses, r.draws, s.source
         FROM songs s
         JOIN ratings r ON s.video_id = r.video_id
         ORDER BY r.rating DESC LIMIT 1`
      );
      if (topRes.length && topRes[0].values.length) {
        const r = topRes[0].values[0];
        topSong = {
          video_id: r[0],
          title: r[1],
          artists: JSON.parse(r[2] as string),
          thumbnail: r[3],
          duration: r[4],
          playlist_id: r[5],
          rating: r[6],
          rd: r[7],
          vol: r[8],
          wins: r[9],
          losses: r[10],
          draws: r[11],
          source: (r[12] as string) || "youtube",
        };
      }
    }

    res.json({
      song1: getSongWithRating(db, song1Id),
      song2: getSongWithRating(db, song2Id),
      allPairsComplete,
      topSong,
    });
  } catch (err) {
    console.error("Battle result error:", err);
    res.status(500).json({ error: "Failed to record battle result" });
  }
});

export default router;
