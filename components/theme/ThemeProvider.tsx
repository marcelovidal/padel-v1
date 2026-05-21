"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (mode: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Hydrate from data-theme set by the no-flash script
    const current = (document.documentElement.getAttribute("data-theme") ?? "light") as Theme;
    setThemeState(current);
  }, []);

  const setTheme = (mode: Theme) => {
    setThemeState(mode);
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem("pasala-theme", mode); } catch (_) {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
