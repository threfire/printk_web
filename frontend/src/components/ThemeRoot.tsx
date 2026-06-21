"use client";

import { useEffect, useRef, useState } from "react";

const themes = [
  { name: "dark", label: "深色" },
  { name: "light", label: "浅色" },
  { name: "red", label: "战队色" },
] as const;

type ThemeName = (typeof themes)[number]["name"];

const themeStorageKey = "printk-site-theme";
const legacyThemeStorageKey = "printk-theme";
const defaultTheme: ThemeName = "dark";
const windowNameThemePrefix = `${themeStorageKey}=`;
const themeBootScript = String.raw`
(function () {
  var themes = {
    dark: { next: "light", label: "深色" },
    light: { next: "red", label: "浅色" },
    red: { next: "dark", label: "战队色" }
  };
  var storageKey = "printk-site-theme";
  var legacyStorageKey = "printk-theme";
  var windowNamePrefix = storageKey + "=";

  function isThemeName(value) {
    return value === "dark" || value === "light" || value === "red";
  }

  function readCookieTheme() {
    var parts = document.cookie ? document.cookie.split("; ") : [];
    for (var index = 0; index < parts.length; index += 1) {
      if (parts[index].indexOf(storageKey + "=") === 0) {
        return decodeURIComponent(parts[index].split("=")[1] || "");
      }
    }
    return null;
  }

  function readWindowNameTheme() {
    var parts = window.name ? window.name.split(";") : [];
    for (var index = 0; index < parts.length; index += 1) {
      if (parts[index].indexOf(windowNamePrefix) === 0) {
        return parts[index].slice(windowNamePrefix.length);
      }
    }
    return null;
  }

  function readStoredTheme() {
    try {
      var savedTheme = window.localStorage && window.localStorage.getItem(storageKey);
      if (isThemeName(savedTheme)) {
        return savedTheme;
      }

      var legacyTheme = window.localStorage && window.localStorage.getItem(legacyStorageKey);
      if (legacyTheme === "light") {
        return "light";
      }
    } catch (error) {
      var fallbackCookieTheme = readCookieTheme();
      if (isThemeName(fallbackCookieTheme)) {
        return fallbackCookieTheme;
      }

      var fallbackWindowTheme = readWindowNameTheme();
      return isThemeName(fallbackWindowTheme) ? fallbackWindowTheme : "dark";
    }

    var cookieTheme = readCookieTheme();
    if (isThemeName(cookieTheme)) {
      return cookieTheme;
    }

    var windowNameTheme = readWindowNameTheme();
    return isThemeName(windowNameTheme) ? windowNameTheme : "dark";
  }

  function storeWindowNameTheme(theme) {
    var values = (window.name ? window.name.split(";") : []).filter(function (item) {
      return item.indexOf(windowNamePrefix) !== 0;
    });
    values.push(windowNamePrefix + theme);
    window.name = values.join(";");
  }

  function storeTheme(theme) {
    try {
      window.localStorage && window.localStorage.setItem(storageKey, theme);
      window.localStorage && window.localStorage.setItem(legacyStorageKey, theme);
    } catch (error) {}

    try {
      document.cookie = storageKey + "=" + encodeURIComponent(theme) + "; path=/; max-age=31536000; SameSite=Lax";
    } catch (error) {}

    storeWindowNameTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
    if (document.body) {
      document.body.dataset.theme = theme;
    }

    var root = document.querySelector(".theme-root");
    if (root) {
      root.setAttribute("data-theme", theme);
    }

    var button = document.querySelector(".theme-switcher");
    if (button) {
      button.className = "theme-switcher theme-switcher-" + theme;
      button.setAttribute("aria-label", "当前为" + themes[theme].label + "主题，点击切换主题");
    }
  }

  function selectNextTheme() {
    var currentTheme = document.documentElement.dataset.theme;
    var theme = isThemeName(currentTheme) ? currentTheme : readStoredTheme();
    var selectedTheme = themes[theme].next;
    storeTheme(selectedTheme);
    applyTheme(selectedTheme);
  }

  if (window.__printkThemeSwitchReady) {
    applyTheme(readStoredTheme());
    return;
  }

  window.__printkThemeSwitchReady = true;
  applyTheme(readStoredTheme());
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (target && target.closest && target.closest(".theme-switcher")) {
      selectNextTheme();
    }
  });
})();
`;

function isThemeName(value: string | null): value is ThemeName {
  return themes.some((item) => item.name === value);
}

function readCookieTheme() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${themeStorageKey}=`))
    ?.split("=")[1];

  return cookieValue ? decodeURIComponent(cookieValue) : null;
}

function readWindowNameTheme() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.name
      .split(";")
      .find((item) => item.startsWith(windowNameThemePrefix))
      ?.slice(windowNameThemePrefix.length) ?? null
  );
}

function readStoredTheme(): ThemeName {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  try {
    const savedTheme = window.localStorage?.getItem(themeStorageKey);
    if (isThemeName(savedTheme)) {
      return savedTheme;
    }

    const legacyTheme = window.localStorage?.getItem(legacyThemeStorageKey);
    if (legacyTheme === "light") {
      return "light";
    }
  } catch {
    const cookieTheme = readCookieTheme();
    if (isThemeName(cookieTheme)) {
      return cookieTheme;
    }

    const windowNameTheme = readWindowNameTheme();
    return isThemeName(windowNameTheme) ? windowNameTheme : defaultTheme;
  }

  const cookieTheme = readCookieTheme();
  if (isThemeName(cookieTheme)) {
    return cookieTheme;
  }

  const windowNameTheme = readWindowNameTheme();
  return isThemeName(windowNameTheme) ? windowNameTheme : defaultTheme;
}

function applyDocumentTheme(theme: ThemeName) {
  document.body.dataset.theme = theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  document.querySelector(".theme-root")?.setAttribute("data-theme", theme);
}

function storeWindowNameTheme(theme: ThemeName) {
  const values = window.name.split(";").filter((item) => !item.startsWith(windowNameThemePrefix));
  values.push(`${windowNameThemePrefix}${theme}`);
  window.name = values.join(";");
}

function storeTheme(theme: ThemeName) {
  try {
    window.localStorage?.setItem(themeStorageKey, theme);
    window.localStorage?.setItem(legacyThemeStorageKey, theme);
  } catch {
    // 本地存储受限时，继续使用 cookie 和 window.name 保存主题。
  }

  try {
    document.cookie = `${themeStorageKey}=${encodeURIComponent(theme)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // cookie 受限时，window.name 仍可覆盖当前标签页刷新后的主题。
  }

  storeWindowNameTheme(theme);
}

function nextTheme(theme: ThemeName): ThemeName {
  if (theme === "dark") {
    return "light";
  }

  if (theme === "light") {
    return "red";
  }

  return "dark";
}

function themeLabel(theme: ThemeName) {
  return themes.find((item) => item.name === theme)?.label ?? "主题";
}

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const [theme] = useState<ThemeName>(() => readStoredTheme());
  const themeRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyDocumentTheme(theme);
    themeRootRef.current?.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="theme-root" data-theme={theme} ref={themeRootRef} suppressHydrationWarning>
      {children}
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} suppressHydrationWarning />
    </div>
  );
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeName>(() => readStoredTheme());

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  function selectNextTheme() {
    setTheme((currentTheme) => {
      const selectedTheme = nextTheme(currentTheme);
      storeTheme(selectedTheme);
      applyDocumentTheme(selectedTheme);
      return selectedTheme;
    });
  }

  return (
    <button
      className={`theme-switcher theme-switcher-${theme}`}
      type="button"
      aria-label={`当前为${themeLabel(theme)}主题，点击切换主题`}
      onClick={selectNextTheme}
    >
      <span className="theme-icon" aria-hidden="true" />
    </button>
  );
}
