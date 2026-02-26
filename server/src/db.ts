import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "ranker.db");

let db: Database;

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA foreign_keys = ON;");

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

  // Migration: add source column if missing (existing databases)
  const cols = db.exec("PRAGMA table_info(songs)");
  const hasSource = cols.length > 0 && cols[0].values.some((row: unknown[]) => row[1] === "source");
  if (!hasSource) {
    db.run("ALTER TABLE songs ADD COLUMN source TEXT NOT NULL DEFAULT 'youtube'");
  }

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

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song1_id TEXT NOT NULL REFERENCES songs(video_id) ON DELETE CASCADE,
      song2_id TEXT NOT NULL REFERENCES songs(video_id) ON DELETE CASCADE,
      winner_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  persist();
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

export function persist(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}
