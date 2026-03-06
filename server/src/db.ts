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

export function getActivePlaylistRef(db: Database): string {
  const result = db.exec(
    "SELECT value FROM settings WHERE key = 'active_playlist'"
  );
  if (result.length && result[0].values.length) {
    const id = result[0].values[0][0] as string;
    // Validate it still exists
    const check = db.exec("SELECT id FROM playlists WHERE id = ?", [id]);
    if (check.length && check[0].values.length) return id;
  }
  // Fallback to first playlist
  const first = db.exec("SELECT id FROM playlists ORDER BY created_at ASC LIMIT 1");
  if (first.length && first[0].values.length) {
    return first[0].values[0][0] as string;
  }
  return "default";
}

export function initUserSchema(db: Database): void {
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA foreign_keys = ON;");

  // Settings table must exist first
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Playlists table
  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  // Detect migration state: does songs table exist and does it have playlist_ref?
  const songsTableCheck = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='songs'"
  );
  const songsTableExists =
    songsTableCheck.length > 0 && songsTableCheck[0].values.length > 0;

  if (songsTableExists) {
    const songsCols = db.exec("PRAGMA table_info(songs)");
    const colNames = songsCols.length > 0
      ? songsCols[0].values.map((r: unknown[]) => r[1] as string)
      : [];
    const hasPlaylistRef = colNames.includes("playlist_ref");

    if (!hasPlaylistRef) {
      // ---- MIGRATION: existing single-playlist DB ----
      // First ensure source column exists on old songs table
      if (!colNames.includes("source")) {
        db.run(
          "ALTER TABLE songs ADD COLUMN source TEXT NOT NULL DEFAULT 'youtube'"
        );
      }

      // Insert default playlist
      db.run(
        "INSERT OR IGNORE INTO playlists (id, name) VALUES ('default', 'My Playlist')"
      );
      db.run(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('active_playlist', 'default')"
      );

      db.run("PRAGMA foreign_keys = OFF;");

      // Migrate songs
      db.run(`
        CREATE TABLE songs_v2 (
          video_id TEXT NOT NULL,
          playlist_ref TEXT NOT NULL,
          title TEXT NOT NULL,
          artists TEXT NOT NULL DEFAULT '[]',
          thumbnail TEXT NOT NULL DEFAULT '',
          duration TEXT NOT NULL DEFAULT '',
          playlist_id TEXT NOT NULL DEFAULT '',
          source TEXT NOT NULL DEFAULT 'youtube',
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          PRIMARY KEY (video_id, playlist_ref)
        )
      `);
      db.run(`
        INSERT INTO songs_v2
        SELECT video_id, 'default', title, artists, thumbnail, duration,
               playlist_id, source, created_at
        FROM songs
      `);
      db.run("DROP TABLE songs");
      db.run("ALTER TABLE songs_v2 RENAME TO songs");

      // Migrate ratings
      db.run(`
        CREATE TABLE ratings_v2 (
          video_id TEXT NOT NULL,
          playlist_ref TEXT NOT NULL,
          rating REAL NOT NULL DEFAULT 1500,
          rd REAL NOT NULL DEFAULT 350,
          vol REAL NOT NULL DEFAULT 0.06,
          wins INTEGER NOT NULL DEFAULT 0,
          losses INTEGER NOT NULL DEFAULT 0,
          draws INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (video_id, playlist_ref)
        )
      `);
      db.run(`
        INSERT INTO ratings_v2
        SELECT video_id, 'default', rating, rd, vol, wins, losses, draws
        FROM ratings
      `);
      db.run("DROP TABLE ratings");
      db.run("ALTER TABLE ratings_v2 RENAME TO ratings");

      // Migrate matches
      db.run(`
        CREATE TABLE matches_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playlist_ref TEXT NOT NULL,
          song1_id TEXT NOT NULL,
          song2_id TEXT NOT NULL,
          winner_id TEXT,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);
      db.run(`
        INSERT INTO matches_v2 (id, playlist_ref, song1_id, song2_id, winner_id, created_at)
        SELECT id, 'default', song1_id, song2_id, winner_id, created_at
        FROM matches
      `);
      db.run("DROP TABLE matches");
      db.run("ALTER TABLE matches_v2 RENAME TO matches");

      db.run("PRAGMA foreign_keys = ON;");
    }
  }

  // Create tables for brand new DBs (IF NOT EXISTS won't affect migrated ones)
  db.run(`
    CREATE TABLE IF NOT EXISTS songs (
      video_id TEXT NOT NULL,
      playlist_ref TEXT NOT NULL,
      title TEXT NOT NULL,
      artists TEXT NOT NULL DEFAULT '[]',
      thumbnail TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL DEFAULT '',
      playlist_id TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'youtube',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (video_id, playlist_ref)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      video_id TEXT NOT NULL,
      playlist_ref TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 1500,
      rd REAL NOT NULL DEFAULT 350,
      vol REAL NOT NULL DEFAULT 0.06,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (video_id, playlist_ref)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_ref TEXT NOT NULL,
      song1_id TEXT NOT NULL,
      song2_id TEXT NOT NULL,
      winner_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  // Ensure a default playlist and active setting exist for new DBs
  db.run(
    "INSERT OR IGNORE INTO playlists (id, name) VALUES ('default', 'My Playlist')"
  );
  db.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('active_playlist', 'default')"
  );
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
