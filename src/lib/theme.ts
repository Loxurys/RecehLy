export type ThemeMode = "light" | "dark" | "system";

export function getStoredTheme(): ThemeMode {
  return (localStorage.getItem("app-theme") as ThemeMode) || "system";
}

export function applyTheme(mode: ThemeMode) {
  localStorage.setItem("app-theme", mode);
  const root = document.documentElement;

  if (
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}