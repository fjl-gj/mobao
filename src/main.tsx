import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NovelProvider } from './contexts/NovelContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { WritingToolsProvider } from './contexts/WritingToolsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ResponsiveProvider } from './contexts/ResponsiveContext';
import './styles/global.css';

function Root() {
  return (
    <SettingsProvider>
      <ProjectProvider>
        <NovelProvider>
          <WritingToolsProvider>
            <ResponsiveProvider>
              <App />
            </ResponsiveProvider>
          </WritingToolsProvider>
        </NovelProvider>
      </ProjectProvider>
    </SettingsProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
