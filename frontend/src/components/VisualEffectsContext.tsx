'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type VisualEffectsContextValue = {
  liquidChromeEnabled: boolean;
  setLiquidChromeEnabled: (enabled: boolean) => void;
};

const STORAGE_KEY = 'globus-liquid-chrome-enabled';

const VisualEffectsContext = createContext<VisualEffectsContextValue | null>(null);

export function VisualEffectsProvider({ children }: { children: React.ReactNode }) {
  const [liquidChromeEnabled, setLiquidChromeEnabled] = useState(true);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);
    if (savedValue === null) return;
    setLiquidChromeEnabled(savedValue === 'true');
  }, []);

  const updateLiquidChromeEnabled = useCallback((enabled: boolean) => {
    setLiquidChromeEnabled(enabled);
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }, []);

  const value = useMemo(
    () => ({
      liquidChromeEnabled,
      setLiquidChromeEnabled: updateLiquidChromeEnabled,
    }),
    [liquidChromeEnabled, updateLiquidChromeEnabled]
  );

  return <VisualEffectsContext.Provider value={value}>{children}</VisualEffectsContext.Provider>;
}

export function useVisualEffects() {
  const context = useContext(VisualEffectsContext);

  if (!context) {
    throw new Error('useVisualEffects must be used within VisualEffectsProvider');
  }

  return context;
}
