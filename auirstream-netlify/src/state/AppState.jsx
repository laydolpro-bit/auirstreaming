import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readPrefs, subscribeStorage, writePrefs } from '../lib/storage.js';

/**
 * Etat applicatif partage : theme clair/sombre, langue de lecture (VF/VO),
 * et donnees locales (favoris / progression) tenues a jour via un compteur
 * de version pour rafraichir les listes sans recharger la page.
 */
const AppContext = createContext(null);

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function AppProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      return readPrefs();
    } catch {
      return { theme: 'dark', lang: 'vf' };
    }
  });
  const [storageVersion, setStorageVersion] = useState(0);

  useEffect(() => {
    applyTheme(prefs.theme);
  }, [prefs.theme]);

  useEffect(() => subscribeStorage(() => setStorageVersion((v) => v + 1)), []);

  const setTheme = useCallback((theme) => {
    setPrefs((prev) => {
      const next = { ...prev, theme };
      writePrefs({ theme });
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setPrefs((prev) => {
      const theme = prev.theme === 'dark' ? 'light' : 'dark';
      writePrefs({ theme });
      return { ...prev, theme };
    });
  }, []);

  const setLang = useCallback((lang) => {
    setPrefs((prev) => {
      const next = lang === 'vo' ? 'vo' : 'vf';
      writePrefs({ lang: next });
      return { ...prev, lang: next };
    });
  }, []);

  const value = useMemo(
    () => ({
      theme: prefs.theme,
      setTheme,
      toggleTheme,
      lang: prefs.lang,
      setLang,
      storageVersion,
    }),
    [prefs.theme, prefs.lang, setTheme, toggleTheme, setLang, storageVersion],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans <AppProvider>.');
  return context;
}

export function useTheme() {
  const { theme, toggleTheme, setTheme } = useApp();
  return { theme, toggleTheme, setTheme };
}

export function useAudioLang() {
  const { lang, setLang } = useApp();
  return { lang, setLang };
}

/** Rafraichit un composant lorsque les donnees locales changent. */
export function useStorageVersion() {
  return useApp().storageVersion;
}
