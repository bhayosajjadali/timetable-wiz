'use client';

import { useState, useCallback } from 'react';

export interface PrintSettings {
  orientation: 'portrait' | 'landscape';
  sheetsPerPage: number;
  headerContent: string;
  footerContent: string;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  orientation: 'portrait',
  sheetsPerPage: 1,
  headerContent: '',
  footerContent: '',
};

/**
 * Session-persistent print settings hook.
 * Settings are stored in React state only — they persist across
 * report print/download actions within the same session but reset
 * when the session (page refresh) ends.
 */
export function usePrintSettings() {
  const [settings, setSettings] = useState<PrintSettings>({ ...DEFAULT_PRINT_SETTINGS });

  const updateSettings = useCallback((partial: Partial<PrintSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_PRINT_SETTINGS });
  }, []);

  return { settings, updateSettings, resetSettings };
}
