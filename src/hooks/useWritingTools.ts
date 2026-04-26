import { useContext } from 'react';
import { WritingToolsContext } from '../contexts/WritingToolsContext';

export function useWritingTools() {
  const ctx = useContext(WritingToolsContext);
  if (!ctx) throw new Error('useWritingTools must be used within a WritingToolsProvider');
  return ctx;
}
