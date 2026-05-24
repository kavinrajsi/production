"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "production_theme";

function readStored() {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  } catch {
    return "dark";
  }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = readStored();
    setTheme(t);
    apply(t);
    setMounted(true);
  }, []);

  function set(next) {
    setTheme(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  if (compact) {
    const next = theme === "dark" ? "light" : "dark";
    return (
      <button
        type="button"
        className="secondary"
        onClick={() => set(next)}
        title={`Switch to ${next} mode`}
        suppressHydrationWarning
      >
        {mounted ? (theme === "dark" ? "Light mode" : "Dark mode") : "Theme"}
      </button>
    );
  }

  return (
    <div className="theme-toggle stack" suppressHydrationWarning>
      <label>Appearance</label>
      <div className="theme-options" role="radiogroup" aria-label="Theme">
        {["dark", "light"].map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={theme === t}
            className={`theme-option${theme === t ? " active" : ""}`}
            onClick={() => set(t)}
          >
            <span className={`theme-swatch ${t}`} />
            <span style={{ textTransform: "capitalize" }}>{t}</span>
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        Saved to this browser.
      </p>
    </div>
  );
}
