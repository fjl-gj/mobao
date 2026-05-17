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
    chapter_start INTEGER, chapter_end INTEGER, chapter_count INTEGER,
    source_type TEXT DEFAULT 'create', structure_json TEXT,
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
  `CREATE TABLE IF NOT EXISTS chapter_annotations (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_rel_path TEXT NOT NULL, selected_text TEXT DEFAULT '',
    anchor_start INTEGER, anchor_end INTEGER,
    annotation_type TEXT DEFAULT 'note', color TEXT DEFAULT 'yellow',
    content TEXT DEFAULT '', metadata TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS writing_notes (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL DEFAULT 'chapter',
    scope_id TEXT NOT NULL DEFAULT '',
    selected_text TEXT DEFAULT '',
    anchor_start INTEGER,
    anchor_end INTEGER,
    title TEXT DEFAULT '', content TEXT DEFAULT '', tags TEXT DEFAULT '',
    metadata TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS chapter_history (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_rel_path TEXT NOT NULL, title TEXT DEFAULT '',
    content_snapshot TEXT NOT NULL, change_reason TEXT DEFAULT 'manual_save',
    word_count INTEGER DEFAULT 0, metadata TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    this.db = await Database.load('sqlite:inklery.db');
    await this.db.execute('PRAGMA foreign_keys = ON');
    for (const sql of SQL_CREATE) {
      await this.db.execute(sql);
    }
    await this.ensureNovelColumns();
    await this.ensureWritingNoteColumns();
    await this.ensureChapterNotesScope();
    // 索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_novels_series ON novels(series_id)',
      'CREATE INDEX IF NOT EXISTS idx_characters_novel ON characters(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_world_novel ON world_entries(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_timeline_novel ON timeline_events(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_plot_novel ON plot_threads(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_notes_novel ON chapter_notes(novel_id)',
      'CREATE INDEX IF NOT EXISTS idx_annotations_chapter ON chapter_annotations(novel_id, chapter_rel_path)',
      'CREATE INDEX IF NOT EXISTS idx_writing_notes_scope ON writing_notes(novel_id, scope_type, scope_id)',
      'CREATE INDEX IF NOT EXISTS idx_history_chapter ON chapter_history(novel_id, chapter_rel_path, created_at)',
    ];
    for (const i of indexes) {
      await this.db.execute(i);
    }
  }

  private async ensureNovelColumns(): Promise<void> {
    const rows = await this.db.select('PRAGMA table_info(novels)');
    const columns = new Set(rows.map((row: any) => row.name));
    const migrations = [
      ['chapter_start', 'ALTER TABLE novels ADD COLUMN chapter_start INTEGER'],
      ['chapter_end', 'ALTER TABLE novels ADD COLUMN chapter_end INTEGER'],
      ['chapter_count', 'ALTER TABLE novels ADD COLUMN chapter_count INTEGER'],
      ['source_type', "ALTER TABLE novels ADD COLUMN source_type TEXT DEFAULT 'create'"],
      ['structure_json', 'ALTER TABLE novels ADD COLUMN structure_json TEXT'],
    ];
    for (const [name, sql] of migrations) {
      if (!columns.has(name)) await this.db.execute(sql);
    }
  }

  private async ensureWritingNoteColumns(): Promise<void> {
    const rows = await this.db.select('PRAGMA table_info(writing_notes)');
    const columns = new Set(rows.map((row: any) => row.name));
    const migrations = [
      ['selected_text', 'ALTER TABLE writing_notes ADD COLUMN selected_text TEXT DEFAULT ""'],
      ['anchor_start', 'ALTER TABLE writing_notes ADD COLUMN anchor_start INTEGER'],
      ['anchor_end', 'ALTER TABLE writing_notes ADD COLUMN anchor_end INTEGER'],
    ];
    for (const [name, sql] of migrations) {
      if (!columns.has(name)) await this.db.execute(sql);
    }
  }

  private async ensureChapterNotesScope(): Promise<void> {
    const indexes = await this.db.select('PRAGMA index_list(chapter_notes)');
    let hasScopedUnique = false;
    let hasGlobalPathUnique = false;

    for (const index of indexes) {
      if (!index.unique) continue;
      const columns = await this.db.select(`PRAGMA index_info(${index.name})`);
      const names = columns.map((column: any) => column.name);
      if (names.length === 2 && names[0] === 'novel_id' && names[1] === 'chapter_rel_path') {
        hasScopedUnique = true;
      }
      if (names.length === 1 && names[0] === 'chapter_rel_path') {
        hasGlobalPathUnique = true;
      }
    }

    if (!hasGlobalPathUnique && hasScopedUnique) return;

    await this.db.execute('PRAGMA foreign_keys = OFF');
    try {
      await this.db.execute('BEGIN TRANSACTION');
      await this.db.execute(`CREATE TABLE IF NOT EXISTS chapter_notes_next (
        id TEXT PRIMARY KEY, novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        chapter_rel_path TEXT NOT NULL, note TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(novel_id, chapter_rel_path)
      )`);
      await this.db.execute(`INSERT OR IGNORE INTO chapter_notes_next
        (id, novel_id, chapter_rel_path, note, created_at, updated_at)
        SELECT id, novel_id, chapter_rel_path, note, created_at, updated_at FROM chapter_notes`);
      await this.db.execute('DROP TABLE chapter_notes');
      await this.db.execute('ALTER TABLE chapter_notes_next RENAME TO chapter_notes');
      await this.db.execute('COMMIT');
    } catch (e) {
      await this.db.execute('ROLLBACK');
      throw e;
    } finally {
      await this.db.execute('PRAGMA foreign_keys = ON');
    }
  }

  async getAll<T>(table: string, where?: string, params?: any[]): Promise<T[]> {
    try {
      const sortable = new Set(['series', 'novels', 'characters', 'world_entries', 'timeline_events']);
      const timeSorted = new Set(['chapter_annotations', 'writing_notes', 'chapter_history', 'chapter_notes']);
      const orderBy = sortable.has(table)
        ? 'sort_order'
        : timeSorted.has(table)
          ? 'created_at DESC'
          : 'id';
      const sql = where
        ? `SELECT * FROM ${table} WHERE ${where} ORDER BY ${orderBy}`
        : `SELECT * FROM ${table} ORDER BY ${orderBy}`;
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
    } catch (e) {
      console.error(`[SQLite] insert ${table}`, e);
      throw e;
    }
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<void> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const set = keys.map(k => `${k} = ?`).join(', ');
      await this.db.execute(`UPDATE ${table} SET ${set}, updated_at = datetime('now') WHERE id = ?`, [...values, id]);
    } catch (e) {
      console.error(`[SQLite] update ${table}`, e);
      throw e;
    }
  }

  async remove(table: string, id: string): Promise<void> {
    try { await this.db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]); }
    catch (e) {
      console.error(`[SQLite] remove ${table}`, e);
      throw e;
    }
  }

  async removeWhere(table: string, where: string, params: any[]): Promise<void> {
    try { await this.db.execute(`DELETE FROM ${table} WHERE ${where}`, params); }
    catch (e) {
      console.error(`[SQLite] removeWhere ${table}`, e);
      throw e;
    }
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
