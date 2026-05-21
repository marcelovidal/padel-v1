"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-[3px]"
    >
      <button
        aria-label="Tema claro"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-full transition-all ${
          theme === "light"
            ? "bg-[var(--text-primary)] text-[var(--bg-card)]"
            : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        {/* Sun icon */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button
        aria-label="Tema oscuro"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-full transition-all ${
          theme === "dark"
            ? "bg-[var(--text-primary)] text-[var(--bg-card)]"
            : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        {/* Moon icon */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M13 9.5a5.5 5.5 0 0 1-7.5-7.3A5.5 5.5 0 1 0 13 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
