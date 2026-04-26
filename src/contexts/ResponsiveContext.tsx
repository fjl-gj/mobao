import React, { createContext, useContext } from 'react';
import { useResponsive, type ResponsiveInfo } from '../hooks/useResponsive';

const ResponsiveCtx = createContext<ResponsiveInfo>(null!);

export function useResponsiveCtx() {
  return useContext(ResponsiveCtx);
}

export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  const info = useResponsive();
  return (
    <ResponsiveCtx.Provider value={info}>
      {children}
    </ResponsiveCtx.Provider>
  );
}
