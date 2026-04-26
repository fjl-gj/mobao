// ---------- 双模式数据持久化 ----------
// Tauri 模式: SQLite  (桌面/移动端)
// 浏览器模式: localStorage (npm run dev 开发)

const STORAGE_PREFIX = 'mobao_v2_';
const isTauri = !!(window as any).__TAURI__;
let sqliteDb: any = null;
let browserMode = false;
const SORTABLE_TABLES = new Set([
  'series',
  'novels',
  'characters',
  'world_entries',
  'timeline_events',
]);

// ---------- 浏览器模式 localStorage 实现 ----------

function lsGet<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + table);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSet(table: string, data: any[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

function lsInsert(table: string, record: any) {
  const list = lsGet(table);
  list.push(record);
  lsSet(table, list);
}

function lsUpdate(table: string, id: string, data: Record<string, any>) {
  const list: any[] = lsGet(table);
  const idx = list.findIndex((r: any) => r.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
    lsSet(table, list);
  }
}

function lsRemove(table: string, id: string) {
  const list = lsGet<any[]>(table);
  lsSet(table, list.filter((r: any) => r.id !== id));
}

function lsWhere(table: string, field: string, value: any): any[] {
  return lsGet(table).filter((r: any) => r[field] === value);
}

// ---------- 建表 SQL ----------

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
    chapter_rel_path TEXT NOT NULL, note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(novel_id, chapter_rel_path)
  )`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_novels_series ON novels(series_id)`,
  `CREATE INDEX IF NOT EXISTS idx_characters_novel ON characters(novel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_world_novel ON world_entries(novel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_timeline_novel ON timeline_events(novel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_plot_novel ON plot_threads(novel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_novel ON chapter_notes(novel_id)`,
];

// ---------- 初始化 ----------

export async function initDatabase(): Promise<boolean> {
  if (sqliteDb) return true;

  if (!isTauri) {
    browserMode = true;
    console.log('[DB] 浏览器模式: 使用 localStorage 存储');
    return true;
  }

  try {
    const { default: Database } = await import('@tauri-apps/plugin-sql');
    sqliteDb = await Database.load('sqlite:mobao.db');
    await sqliteDb.execute('PRAGMA foreign_keys = ON');
    for (const sql of SQL_CREATE) {
      await sqliteDb.execute(sql);
    }
    console.log('[DB] Tauri 模式: SQLite 初始化成功');
    return true;
  } catch (e) {
    browserMode = true;
    console.warn('[DB] SQLite 初始化失败，回退到 localStorage 模式:', e);
    return true;
  }
}

export function isBrowser(): boolean {
  return browserMode;
}

export function isTauriEnv(): boolean {
  return isTauri;
}

// ---------- 通用 CRUD ----------

export async function getAll<T>(table: string, where?: string, params?: any[]): Promise<T[]> {
  if (browserMode) {
    if (where) {
      // 简单解析 field = ? 格式
      const match = where.match(/^(\w+)\s*=\s*\?$/);
      if (match) return lsWhere(table, match[1], params?.[0]) as T[];
    }
    return lsGet<T>(table);
  }

  try {
    const orderBy = SORTABLE_TABLES.has(table) ? ' ORDER BY sort_order' : '';
    const sql = where
      ? `SELECT * FROM ${table} WHERE ${where}${orderBy}`
      : `SELECT * FROM ${table}${orderBy}`;
    return await sqliteDb.select(sql, params);
  } catch (e: any) {
    console.error(`[DB] getAll ${table} failed:`, e);
    return [];
  }
}

export async function getById<T>(table: string, id: string): Promise<T | null> {
  if (browserMode) {
    const list: T[] = lsGet(table);
    return list.find((r: any) => r.id === id) as T || null;
  }

  try {
    const rows: T[] = await sqliteDb.select(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  } catch { return null; }
}

export async function insert(table: string, data: Record<string, any>): Promise<void> {
  if (browserMode) {
    return lsInsert(table, data);
  }

  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    await sqliteDb.execute(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
  } catch (e: any) {
    console.error(`[DB] insert ${table} failed:`, e);
  }
}

export async function update(table: string, id: string, data: Record<string, any>): Promise<void> {
  if (browserMode) {
    return lsUpdate(table, id, data);
  }

  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    await sqliteDb.execute(
      `UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id]
    );
  } catch (e: any) {
    console.error(`[DB] update ${table} failed:`, e);
  }
}

export async function remove(table: string, id: string): Promise<void> {
  if (browserMode) {
    return lsRemove(table, id);
  }

  try {
    await sqliteDb.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  } catch (e: any) {
    console.error(`[DB] remove ${table} failed:`, e);
  }
}

export async function removeWhere(table: string, where: string, params: any[]): Promise<void> {
  if (browserMode) {
    const match = where.match(/^(\w+)\s*=\s*\?$/);
    if (match) {
      const list = lsGet<any[]>(table);
      lsSet(table, list.filter((r: any) => r[match[1]] !== params[0]));
    }
    return;
  }

  try {
    await sqliteDb.execute(`DELETE FROM ${table} WHERE ${where}`, params);
  } catch (e: any) {
    console.error(`[DB] removeWhere ${table} failed:`, e);
  }
}

// ---------- 设置操作 ----------

export async function getSetting(key: string): Promise<string | null> {
  if (browserMode) {
    return localStorage.getItem(STORAGE_PREFIX + 'setting_' + key);
  }

  try {
    const rows: { value: string }[] = await sqliteDb.select(
      'SELECT value FROM user_settings WHERE key = ?', [key]
    );
    return rows[0]?.value || null;
  } catch { return null; }
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (browserMode) {
    localStorage.setItem(STORAGE_PREFIX + 'setting_' + key, value);
    return;
  }

  try {
    await sqliteDb.execute(
      `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  } catch (e: any) {
    console.error(`[DB] setSetting failed:`, e);
  }
}
