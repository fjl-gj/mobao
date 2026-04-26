import { useState, useEffect, useRef } from 'react';
import { renderMarkdown } from '../utils/io';
import type { Chapter, Volume } from '../contexts/NovelContext';
import { useResponsiveCtx } from '../contexts/ResponsiveContext';

interface Props {
  chapters: { volume: Volume; chapter: Chapter }[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

let touchStartX = 0;

export default function FullScreenReader({ chapters, currentIndex, onNavigate, onClose }: Props) {
  const { isMobile } = useResponsiveCtx();
  const [layout, setLayout] = useState<'pc' | 'mobile'>('pc');
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentChapter = chapters[currentIndex]?.chapter;

  const scrollPage = (dir: 'up' | 'down') => {
    const el = contentRef.current;
    if (!el) return;
    el.scrollBy({ top: dir === 'down' ? el.clientHeight * 0.9 : -el.clientHeight * 0.9, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) { e.preventDefault(); onNavigate(currentIndex - 1); }
      if (e.key === 'ArrowRight' && currentIndex < chapters.length - 1) { e.preventDefault(); onNavigate(currentIndex + 1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); scrollPage('up'); }
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); scrollPage('down'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, chapters.length, onClose, onNavigate]);

  // Touch swipe for chapter navigation
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) {
      if (dx < 0 && currentIndex < chapters.length - 1) onNavigate(currentIndex + 1);
      if (dx > 0 && currentIndex > 0) onNavigate(currentIndex - 1);
    }
  };

  const fontSize = `${1 + fontSizeLevel * 0.1}rem`;
  const contentWidth = layout === 'mobile' || isMobile ? '100%' : 'min(800px, 90vw)';
  const html = currentChapter ? renderMarkdown(currentChapter.content) : '';

  return (
    <div className="fsr-overlay" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="fsr-topbar">
        <button className="fsr-btn" onClick={onClose}>✕ 退出</button>

        <div className="fsr-layout-group">
          <span>📖 {isMobile ? '自适应' : layout === 'pc' ? 'PC版式' : '手机版式'}</span>
          {!isMobile && (
            <button className="fsr-btn fsr-btn-accent" onClick={() => setLayout(l => l === 'pc' ? 'mobile' : 'pc')}>
              切至{layout === 'pc' ? '手机' : 'PC'}
            </button>
          )}
        </div>

        <div className="fsr-font-group">
          <button className="fsr-btn" onClick={() => setFontSizeLevel(Math.max(-2, fontSizeLevel - 1))}>A-</button>
          <span className="fsr-font-label">字体</span>
          <button className="fsr-btn" onClick={() => setFontSizeLevel(Math.min(5, fontSizeLevel + 1))}>A+</button>
        </div>

        <div className="fsr-scroll-group">
          <button className="fsr-btn" onClick={() => scrollPage('up')}>↑</button>
          <button className="fsr-btn" onClick={() => scrollPage('down')}>↓</button>
        </div>

        <div className="fsr-nav-group">
          <button className="fsr-btn" disabled={currentIndex <= 0} onClick={() => onNavigate(currentIndex - 1)}>← 上一章</button>
          <span className="fsr-page">{currentIndex + 1} / {chapters.length}</span>
          <button className="fsr-btn" disabled={currentIndex >= chapters.length - 1} onClick={() => onNavigate(currentIndex + 1)}>下一章 →</button>
        </div>
      </div>

      <div ref={contentRef} className="fsr-content" style={{ fontSize, maxWidth: contentWidth }}
        dangerouslySetInnerHTML={{ __html: html || '<p>无内容</p>' }} />

      <div className="fsr-bottombar">
        <span>← → 切换 · ↑↓ 翻页 · Esc 退出</span>
      </div>
    </div>
  );
}
