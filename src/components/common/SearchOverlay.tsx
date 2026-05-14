import { useState, useEffect, useRef } from 'react';
import { useProject } from '../../hooks/useProject';
import { useNovel } from '../../hooks/useNovel';
import { useResponsiveCtx } from '../../contexts/ResponsiveContext';
import { readTextFile } from '../../utils/fileOps';

interface SearchResult {
  chapterPath: string;
  chapterTitle: string;
  snippet: string;
  lineNumber: number;
}

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { state: pState, dispatch: pd } = useProject();
  const { novelStructure, activeNovelId, novels } = pState;
  const { dispatch } = useNovel();
  const { isMobile } = useResponsiveCtx();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeNovel = activeNovelId ? novels.find(n => n.id === activeNovelId) : null;
  const rootPath = activeNovel?.root_path || '';

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const doSearch = async () => {
    if (!query.trim() || !novelStructure || !rootPath) return;
    setSearching(true);

    const allPaths: { path: string; title: string }[] = [];
    if (novelStructure.prologue) allPaths.push({ path: novelStructure.prologue.relative_path, title: novelStructure.prologue.name });
    for (const vol of novelStructure.volumes) {
      for (const ch of vol.chapters) allPaths.push({ path: ch.relative_path, title: `${vol.name}/${ch.name}` });
    }
    for (const ch of novelStructure.root_chapters) allPaths.push({ path: ch.relative_path, title: ch.name });

    const found: SearchResult[] = [];
    for (const { path, title } of allPaths) {
      try {
        const content = await readTextFile(`${rootPath}/${path}`);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(query.toLowerCase())) {
            found.push({
              chapterPath: path,
              chapterTitle: title,
              snippet: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join('\n'),
              lineNumber: i + 1,
            });
          }
        }
      } catch { /* skip */ }
    }
    setResults(found);
    setSearching(false);
  };

  return (
    <div className={`search-overlay ${isMobile ? 'search-mobile' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-box">
        <div className="search-input-row">
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="搜索关键字..." />
          <button onClick={doSearch} disabled={searching}>{searching ? '⋯' : '🔍'}</button>
          <button className="search-close" onClick={onClose}>✕</button>
        </div>
        {query && <div className="search-stats">找到 {results.length} 处匹配</div>}
        <div className="search-results">
          {results.map((r, i) => (
            <div key={i} className="search-result-item">
              <div className="search-result-path">{r.chapterTitle} : {r.lineNumber}</div>
              <pre className="search-result-snippet">{r.snippet}</pre>
            </div>
          ))}
          {results.length === 0 && query && !searching && <div className="panel-empty">未找到匹配</div>}
        </div>
      </div>
    </div>
  );
}
