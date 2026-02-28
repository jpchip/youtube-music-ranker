import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, "..", "data");

let SQL: SqlJsStatic;
const dbCache = new Map<string, Database>();

export async function initSql(): Promise<void> {
  SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getSql(): SqlJsStatic {
  if (!SQL) throw new Error("SQL not initialized. Call initSql() first.");
  return SQL;
}

export function initUserSchema(db: Database): void {
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
  const hasSource =
    cols.length > 0 &&
    cols[0].values.some((row: unknown[]) => row[1] === "source");
  if (!hasSource) {
    db.run(
      "ALTER TABLE songs ADD COLUMN source TEXT NOT NULL DEFAULT 'youtube'"
    );
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
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export async function openUserDb(dbPath: string): Promise<Database> {
  if (dbCache.has(dbPath)) {
    return dbCache.get(dbPath)!;
  }

  const sql = getSql();
  let db: Database;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new sql.Database(buffer);
  } else {
    db = new sql.Database();
  }

  initUserSchema(db);
  persistDb(db, dbPath);
  dbCache.set(dbPath, db);
  return db;
}

export function persistDb(db: Database, dbPath: string): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}
