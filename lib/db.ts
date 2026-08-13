import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || './data/survey.db'
const resolved = path.resolve(process.cwd(), DB_PATH)

// Ensure data directory exists
fs.mkdirSync(path.dirname(resolved), { recursive: true })

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  _db = new Database(resolved)
  _db.pragma('journal_mode = WAL')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      q1          TEXT, q2  TEXT, q3  TEXT, q4  TEXT,
      q5          TEXT, q6  TEXT, q7  TEXT, q8  TEXT,
      q9          TEXT, q10 TEXT, q11 TEXT,
      q12         TEXT, q13 TEXT, q14 TEXT,
      q15         TEXT
    );
  `)

  return _db
}
