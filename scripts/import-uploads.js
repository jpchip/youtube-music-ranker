#!/usr/bin/env node
/**
 * Directly imports uploads.json into the database with placeholder IDs.
 * Run: node scripts/import-uploads.js
 *
 * After importing, run enrich-uploads.js to search for real YouTube video IDs.
 */

import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_JSON = path.join(__dirname, "uploads.json");
const DB_PATH = path.join(__dirname, "..", "server", "data", "ranker.db");

const songs = JSON.parse(fs.readFileSync(UPLOADS_JSON, "utf8"));
console.log(`Loaded ${songs.length} songs from uploads.json`);

const SQL = await initSqlJs();

let db;
if (fs.existsSync(DB_PATH)) {
  db = new SQL.Database(fs.readFileSync(DB_PATH));
  console.log("Opened existing database");
} else {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new SQL.Database();
  console.log("Created new database");
}

db.run(`
  CREATE TABLE IF NOT EXISTS songs (
    video_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artists TEXT NOT NULL DEFAULT '[]',
    thumbnail TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    playlist_id TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'youtube',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS ratings (
    video_id TEXT PRIMARY KEY REFERENCES songs(video_id) ON DELETE CASCADE,
    rating REAL NOT NULL DEFAULT 1500,
    rd REAL NOT NULL DEFAULT 350,
    vol REAL NOT NULL DEFAULT 0.06,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0
  )
`);

const insertSong = db.prepare(`
  INSERT OR IGNORE INTO songs (video_id, title, artists, thumbnail, duration, playlist_id, source)
  VALUES (?, ?, ?, '', '', 'uploads', 'youtube')
`);
const insertRating = db.prepare(`
  INSERT OR IGNORE INTO ratings (video_id) VALUES (?)
`);

let imported = 0;
let skipped = 0;

for (const song of songs) {
  const { title, artist } = song;
  if (!title) { skipped++; continue; }

  // Deterministic placeholder ID based on title+artist
  const hash = crypto.createHash("sha1").update(`${title}|${artist}`).digest("hex").slice(0, 16);
  const videoId = `local:${hash}`;

  const artists = artist ? [artist] : [];

  insertSong.bind([videoId, title, JSON.stringify(artists)]);
  insertSong.step();
  insertSong.reset();

  insertRating.bind([videoId]);
  insertRating.step();
  insertRating.reset();

  imported++;
  if (imported % 500 === 0) console.log(`  ${imported}/${songs.length}...`);
}

insertSong.free();
insertRating.free();

fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
console.log(`\nDone! Imported ${imported} songs, skipped ${skipped}.`);
console.log(`Run node scripts/enrich-uploads.js to find real YouTube video IDs.`);
db.close();
