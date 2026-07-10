import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'site-theme';

const readStoredTheme = (): Theme | null => {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
  } catch {
    return null;
  }
};

const writeStoredTheme = (theme: Theme) => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for the current session if storage is unavailable.
  }
};

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = readStoredTheme();
  if (storedTheme) {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme);
    const frameId = window.requestAnimationFrame(() => setTheme(preferredTheme));

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme()) return;
      const nextTheme = event.matches ? 'dark' : 'light';
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    writeStoredTheme(nextTheme);
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? '切换到浅色模式' : '切换到暗色模式'}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground shadow-sm shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-card/70 dark:shadow-black/20"
    >
      <Sun
        className={`absolute h-4 w-4 transition-all duration-300 ${isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-300 ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}
      />
    </button>
  );
}
