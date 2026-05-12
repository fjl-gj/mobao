import type { IStorageProvider } from './types';

const SQL_CREATE = [
  `CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS novels (
    id TEXT PRIMARY KEY, series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    title TEXT NOT NULL, root_path TEXT NOT NULL,
    structure_mode TEXT NOT NULL DEFAULT 'flat', prologue_path TEXT,
    cover_path TEXT, description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    name TEXT NOT NULL, alias TEXT DEFAULT '', age TEXT DEFAULT '', gender TEXT DEFAULT '',
    occupation TEXT DEFAULT '', appearance TEXT DEFAULT '', personality TEXT DEFAULT '',
    background TEXT DEFAULT '', avatar_path TEXT DEFAULT '', tags TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS character_relations (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    char_a_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    char_b_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    relation TEXT NOT NULL, description TEXT DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS world_entries (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    category TEXT NOT NULL, name TEXT NOT NULL, content TEXT DEFAULT '',
    tags TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    timeline_id TEXT DEFAULT 'main', title TEXT NOT NULL,
    era TEXT DEFAULT '', time_value INTEGER, description TEXT DEFAULT '',
    chapter_rel_path TEXT DEFAULT '', character_ids TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS plot_threads (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    title TEXT NOT NULL, type TEXT DEFAULT 'main', description TEXT DEFAULT '',
    start_chapter TEXT DEFAULT '', end_chapter TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS plot_chapter_links (
    id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    chapter_rel_path TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chapter_notes (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_rel_path TEXT NOT NULL UNIQUE, note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  )`,
];

export class SqliteProvider implements IStorageProvider {
  readonly type = 'sqlite';
  readonly mode = 'persistent' as const;
  private db: any = null;

  async init(): Promise<void> {
    if (this.db) return;
    const { default: Database } = await import('@tauri-apps/plugin-sql');
    this.db = await Database.load('sqlite:mobao.db');
    for (const sql of SQL_CREATE) {
      await this.db.execute(sql);
    }
    // 索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_novels_series ON novels(series_id)',
      'CREATE INDEX IF NOT EXISTS idx_characters_novel ON characters(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_world_novel ON world_entries(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_timeline_novel ON timeline_events(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_plot_novel ON plot_threads(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_notes_novel ON chapter_notes(novel_id)',
    ];
    for (const i of indexes) {
      await this.db.execute(i);
    }
  }

  async getAll<T>(table: string, where?: string, params?: any[]): Promise<T[]> {
    try {
      const sql = where
        ? `SELECT * FROM ${table} WHERE ${where} ORDER BY sort_order`
        : `SELECT * FROM ${table} ORDER BY sort_order`;
      return await this.db.select(sql, params);
    } catch (e) { console.error(`[SQLite] getAll ${table}`, e); return []; }
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    try {
      const rows = await this.db.select(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      return rows[0] || null;
    } catch { return null; }
  }

  async insert(table: string, data: Record<string, any>): Promise<void> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const ph = keys.map(() => '?').join(', ');
      await this.db.execute(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${ph})`, values);
    } catch (e) { console.error(`[SQLite] insert ${table}`, e); }
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<void> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const set = keys.map(k => `${k} = ?`).join(', ');
      await this.db.execute(`UPDATE ${table} SET ${set}, updated_at = datetime('now') WHERE id = ?`, [...values, id]);
    } catch (e) { console.error(`[SQLite] update ${table}`, e); }
  }

  async remove(table: string, id: string): Promise<void> {
    try { await this.db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]); }
    catch (e) { console.error(`[SQLite] remove ${table}`, e); }
  }

  async removeWhere(table: string, where: string, params: any[]): Promise<void> {
    try { await this.db.execute(`DELETE FROM ${table} WHERE ${where}`, params); }
    catch (e) { console.error(`[SQLite] removeWhere ${table}`, e); }
  }

  async getSetting(key: string): Promise<string | null> {
    try {
      const rows = await this.db.select('SELECT value FROM user_settings WHERE key = ?', [key]);
      return rows[0]?.value || null;
    } catch { return null; }
  }

  async setSetting(key: string, value: string): Promise<void> {
    try { await this.db.execute('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', [key, value]); }
    catch (e) { console.error('[SQLite] setSetting', e); }
  }
}
