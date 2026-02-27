#!/usr/bin/env node
/**
 * Searches YouTube Music for real video IDs for all placeholder songs.
 * Run: node scripts/enrich-uploads.js
 *
 * Songs with local: IDs are searched by title+artist. When a match is found,
 * the placeholder is replaced with the real video ID and metadata.
 * Saves progress as it goes so it can be safely interrupted and restarted.
 */

import initSqlJs from "sql.js";
import YTMusic from "ytmusic-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "server", "data", "ranker.db");
const SAVE_INTERVAL = 50; // persist DB every N songs

if (!fs.existsSync(DB_PATH)) {
  console.error("Database not found. Run import-uploads.js first.");
  process.exit(1);
}

const SQL = await initSqlJs();
let db = new SQL.Database(fs.readFileSync(DB_PATH));

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// Find all songs still needing enrichment
const pending = db.exec(`
  SELECT video_id, title, artists FROM songs WHERE video_id LIKE 'local:%'
`);

if (!pending.length || !pending[0].values.length) {
  console.log("No placeholder songs found. All songs already enriched.");
  db.close();
  process.exit(0);
}

const rows = pending[0].values;
console.log(`Found ${rows.length} songs to enrich. This will take a while...`);

const ytmusic = new YTMusic();
await ytmusic.initialize();

let enriched = 0;
let notFound = 0;

for (let i = 0; i < rows.length; i++) {
  const [localId, title, artistsJson] = rows[i];
  const artists = JSON.parse(artistsJson);
  const artist = artists[0] || "";
  const query = artist ? `${title} ${artist}` : title;

  try {
    const results = await ytmusic.searchSongs(query);
    if (results.length > 0) {
      const match = results[0];
      const newId = match.videoId;
      const newTitle = match.name ?? title;
      const newArtists = match.artist ? [match.artist.name] : artists;
      const thumbnail = match.thumbnails?.[match.thumbnails.length - 1]?.url ?? "";
      const duration = match.duration?.toString() ?? "";

      // Preserve rating values before deleting old record
      const ratingRows = db.exec(
        `SELECT rating, rd, vol, wins, losses, draws FROM ratings WHERE video_id = ?`,
        [localId]
      );
      const rating = ratingRows[0]?.values[0] ?? [1500, 350, 0.06, 0, 0, 0];

      // Skip if this video ID already exists (another song already claimed it)
      const exists = db.exec(`SELECT 1 FROM songs WHERE video_id = ?`, [newId]);
      if (exists.length && exists[0].values.length) {
        // Just delete the placeholder
        db.run(`DELETE FROM songs WHERE video_id = ?`, [localId]);
        notFound++;
      } else {
        db.run(`DELETE FROM songs WHERE video_id = ?`, [localId]);
        db.run(
          `INSERT INTO songs (video_id, title, artists, thumbnail, duration, playlist_id, source)
           VALUES (?, ?, ?, ?, ?, 'uploads', 'youtube')`,
          [newId, newTitle, JSON.stringify(newArtists), thumbnail, duration]
        );
        db.run(
          `INSERT INTO ratings (video_id, rating, rd, vol, wins, losses, draws)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newId, ...rating]
        );
        enriched++;
      }
    } else {
      notFound++;
    }
  } catch (err) {
    // Rate limited or network error — wait and retry once
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const results = await ytmusic.searchSongs(query);
      if (results.length > 0) {
        const match = results[0];
        const newId = match.videoId;
        const newTitle = match.name ?? title;
        const newArtists = match.artist ? [match.artist.name] : artists;
        const thumbnail = match.thumbnails?.[match.thumbnails.length - 1]?.url ?? "";
        const duration = match.duration?.toString() ?? "";

        const ratingRows = db.exec(
          `SELECT rating, rd, vol, wins, losses, draws FROM ratings WHERE video_id = ?`,
          [localId]
        );
        const rating = ratingRows[0]?.values[0] ?? [1500, 350, 0.06, 0, 0, 0];

        const exists = db.exec(`SELECT 1 FROM songs WHERE video_id = ?`, [newId]);
        if (exists.length && exists[0].values.length) {
          db.run(`DELETE FROM songs WHERE video_id = ?`, [localId]);
          notFound++;
        } else {
          db.run(`DELETE FROM songs WHERE video_id = ?`, [localId]);
          db.run(
            `INSERT INTO songs (video_id, title, artists, thumbnail, duration, playlist_id, source)
             VALUES (?, ?, ?, ?, ?, 'uploads', 'youtube')`,
            [newId, newTitle, JSON.stringify(newArtists), thumbnail, duration]
          );
          db.run(
            `INSERT INTO ratings (video_id, rating, rd, vol, wins, losses, draws)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newId, ...rating]
          );
          enriched++;
        }
      } else {
        notFound++;
      }
    } catch {
      console.warn(`  Failed: "${query}" — skipping`);
      notFound++;
    }
  }

  // Progress + periodic save
  if ((i + 1) % SAVE_INTERVAL === 0) {
    persist();
    console.log(`  ${i + 1}/${rows.length} — enriched: ${enriched}, not found: ${notFound}`);
  }

  // Small delay to avoid hammering the API
  await new Promise((r) => setTimeout(r, 300));
}

persist();
console.log(`\nDone! Enriched: ${enriched}, not found/duplicate: ${notFound}`);
db.close();
