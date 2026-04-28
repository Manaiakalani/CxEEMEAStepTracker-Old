import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "admin-theme";

function resolve(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  const mode = resolve(theme);
  root.classList.toggle("dark", mode === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(KEY) as Theme | null) ?? "system";
  });

  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => apply("system");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}

export function initThemeEarly() {
  const raw = localStorage.getItem(KEY) as Theme | null;
  apply(raw ?? "system");
}
