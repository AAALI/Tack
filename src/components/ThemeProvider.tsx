"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { tack } from "@/lib/theme";

const STORAGE_KEY = "tack-theme";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function(){
  var stored = localStorage.getItem('${STORAGE_KEY}');
  var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();
        `.trim(),
      }}
    />
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getInitialTheme());
  }, []);

  if (!mounted) return null;

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-black/[0.03]"
      style={{ color: tack.ink }}
    >
      {theme === "dark" ? (
        <Sun size={14} style={{ color: tack.slate }} />
      ) : (
        <Moon size={14} style={{ color: tack.slate }} />
      )}
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
