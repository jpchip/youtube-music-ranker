import crypto from "crypto";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { DATA_DIR, getSql, persistDb } from "./db.js";

const USERS_DB_PATH = path.join(DATA_DIR, "users.db");
const LEGACY_DB_PATH = path.join(DATA_DIR, "ranker.db");
const LEGACY_EMAIL = "jpchapiewsky@gmail.com";

import { Database } from "sql.js";
let usersDb: Database;

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  db_path: string;
  created_at: number;
  is_admin: boolean;
}

export interface Session {
  token: string;
  user_id: string;
  expires_at: number;
}

function persistUsers(): void {
  persistDb(usersDb, USERS_DB_PATH);
}

export async function initUsersDb(): Promise<void> {
  const sql = getSql();

  if (fs.existsSync(USERS_DB_PATH)) {
    const buffer = fs.readFileSync(USERS_DB_PATH);
    usersDb = new sql.Database(buffer);
  } else {
    usersDb = new sql.Database();
  }

  usersDb.run("PRAGMA journal_mode = WAL;");
  usersDb.run("PRAGMA foreign_keys = ON;");

  usersDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      db_path TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  usersDb.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    )
  `);

  usersDb.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  // Migration: add is_admin column if missing
  const cols = usersDb.exec("PRAGMA table_info(users)");
  const hasAdmin =
    cols.length > 0 &&
    cols[0].values.some((row: unknown[]) => row[1] === "is_admin");
  if (!hasAdmin) {
    usersDb.run(
      "ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0"
    );
  }

  // Clean up expired sessions
  usersDb.run("DELETE FROM sessions WHERE expires_at < unixepoch()");

  // Migration: create legacy user if not exists
  await migrateLegacyUser();

  // Seed admin users from ADMIN_EMAILS env var
  const adminEmails = process.env.ADMIN_EMAILS;
  if (adminEmails) {
    for (const email of adminEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)) {
      usersDb.run("UPDATE users SET is_admin = 1 WHERE email = ?", [email]);
    }
  }

  persistUsers();
}

async function migrateLegacyUser(): Promise<void> {
  if (!fs.existsSync(LEGACY_DB_PATH)) return;

  const existing = getUserByEmail(LEGACY_EMAIL);
  if (existing) return;

  console.log(`[migration] Creating user for ${LEGACY_EMAIL}...`);

  const userId = nanoid(21);
  const stmt = usersDb.prepare(
    `INSERT INTO users (id, email, password_hash, db_path) VALUES (?, ?, NULL, ?)`
  );
  stmt.bind([userId, LEGACY_EMAIL, LEGACY_DB_PATH]);
  stmt.step();
  stmt.free();

  // Migrate existing shares from ranker.db
  const sql = getSql();
  const legacyBuffer = fs.readFileSync(LEGACY_DB_PATH);
  const legacyDb = new sql.Database(legacyBuffer);

  // Check if shares table exists in legacy db
  const tableCheck = legacyDb.exec(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='shares'`
  );

  if (tableCheck.length && tableCheck[0].values.length) {
    const sharesResult = legacyDb.exec(
      `SELECT id, title, data, created_at FROM shares`
    );

    if (sharesResult.length && sharesResult[0].values.length) {
      const shareStmt = usersDb.prepare(
        `INSERT OR IGNORE INTO shares (id, user_id, title, data, created_at) VALUES (?, ?, ?, ?, ?)`
      );
      for (const row of sharesResult[0].values) {
        shareStmt.bind([row[0], userId, row[1], row[2], row[3]]);
        shareStmt.step();
        shareStmt.reset();
      }
      shareStmt.free();
      console.log(
        `[migration] Migrated ${sharesResult[0].values.length} shares`
      );
    }
  }

  legacyDb.close();
  console.log(`[migration] Done. ${LEGACY_EMAIL} linked to ${LEGACY_DB_PATH}`);
}

function rowToUser(row: unknown[]): User {
  return {
    id: row[0] as string,
    email: row[1] as string,
    password_hash: row[2] as string | null,
    db_path: row[3] as string,
    created_at: row[4] as number,
    is_admin: !!(row[5] as number),
  };
}

export function getUserByEmail(email: string): User | null {
  const result = usersDb.exec(
    `SELECT id, email, password_hash, db_path, created_at, is_admin FROM users WHERE email = ?`,
    [email]
  );
  if (!result.length || !result[0].values.length) return null;
  return rowToUser(result[0].values[0]);
}

export function getUserById(id: string): User | null {
  const result = usersDb.exec(
    `SELECT id, email, password_hash, db_path, created_at, is_admin FROM users WHERE id = ?`,
    [id]
  );
  if (!result.length || !result[0].values.length) return null;
  return rowToUser(result[0].values[0]);
}

export function getAllUsers(): User[] {
  const result = usersDb.exec(
    `SELECT id, email, password_hash, db_path, created_at, is_admin FROM users ORDER BY created_at DESC`
  );
  if (!result.length || !result[0].values.length) return [];
  return result[0].values.map(rowToUser);
}

export function createUser(
  email: string,
  passwordHash: string | null,
  dbPath: string
): User {
  const id = nanoid(21);
  const stmt = usersDb.prepare(
    `INSERT INTO users (id, email, password_hash, db_path) VALUES (?, ?, ?, ?)`
  );
  stmt.bind([id, email, passwordHash, dbPath]);
  stmt.step();
  stmt.free();
  persistUsers();
  return getUserById(id)!;
}

export function updatePasswordHash(userId: string, passwordHash: string): void {
  const stmt = usersDb.prepare(
    `UPDATE users SET password_hash = ? WHERE id = ?`
  );
  stmt.bind([passwordHash, userId]);
  stmt.step();
  stmt.free();
  persistUsers();
}

export function createSession(userId: string): Session {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt =
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const stmt = usersDb.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
  );
  stmt.bind([token, userId, expiresAt]);
  stmt.step();
  stmt.free();
  persistUsers();
  return { token, user_id: userId, expires_at: expiresAt };
}

export function getSession(token: string): Session | null {
  const now = Math.floor(Date.now() / 1000);
  const result = usersDb.exec(
    `SELECT token, user_id, expires_at FROM sessions WHERE token = ? AND expires_at > ?`,
    [token, now]
  );
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  return {
    token: row[0] as string,
    user_id: row[1] as string,
    expires_at: row[2] as number,
  };
}

export function deleteSession(token: string): void {
  const stmt = usersDb.prepare(`DELETE FROM sessions WHERE token = ?`);
  stmt.bind([token]);
  stmt.step();
  stmt.free();
  persistUsers();
}

export function getShare(
  id: string
): { id: string; title: string; data: string; created_at: number } | null {
  const result = usersDb.exec(
    `SELECT id, title, data, created_at FROM shares WHERE id = ?`,
    [id]
  );
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  return {
    id: row[0] as string,
    title: row[1] as string,
    data: row[2] as string,
    created_at: row[3] as number,
  };
}

export function createShare(
  userId: string,
  title: string,
  data: string
): string {
  const id = nanoid(10);
  const stmt = usersDb.prepare(
    `INSERT INTO shares (id, user_id, title, data) VALUES (?, ?, ?, ?)`
  );
  stmt.bind([id, userId, title, data]);
  stmt.step();
  stmt.free();
  persistUsers();
  return id;
}

function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const computed = (await scryptAsync(password, salt, 64)).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(hash, "hex")
  );
}
