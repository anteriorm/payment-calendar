/**
 * TrueMachine — design tokens via CSS custom properties.
 * Все палитры живут в theme.css.
 * Активная тема сохраняется в localStorage под ключом "tm_theme".
 * Дефолтная тема при первом посещении: "emerald".
 */

export const C = {
  sage:     "var(--tm-sage)",
  olive:    "var(--tm-olive)",
  beige:    "var(--tm-beige)",
  ivory:    "var(--tm-ivory)",
  warm:     "var(--tm-warm)",     // рамки и разделители
  hdr:      "var(--tm-hdr)",      // фон шапок таблиц и строки «Итого» (меняется с темой)
  selected: "var(--tm-selected)", // фон выделенной строки таблицы (меняется с темой)
  danger:   "var(--tm-danger)",
  textDk:   "var(--tm-textDk)",
  textLt:   "var(--tm-textLt)",
  surface:  "var(--tm-surface)",
  sageHov:  "var(--tm-sageHov)",
  sageAct:  "var(--tm-sageAct)",
  sage10:   "var(--tm-sage10)",
  sage20:   "var(--tm-sage20)",
  beige30:  "var(--tm-beige30)",
  beige40:  "var(--tm-beige40)",
  danger08: "var(--tm-danger08)",
  danger12: "var(--tm-danger12)",
  danger15: "var(--tm-danger15)",
  olive20:  "var(--tm-olive20)",
  ivory50:  "var(--tm-ivory50)",
  warm80:   "var(--tm-warm80)",
  overlay:  "var(--tm-overlay)",
  badge: {
    draft:      { bg: "var(--tm-badge-draft-bg)",      color: "var(--tm-badge-draft-color)"      },
    pending:    { bg: "var(--tm-badge-pending-bg)",    color: "var(--tm-badge-pending-color)"    },
    approved:   { bg: "var(--tm-badge-approved-bg)",   color: "var(--tm-badge-approved-color)"   },
    inRegistry: { bg: "var(--tm-badge-registry-bg)",   color: "var(--tm-badge-registry-color)"   },
    paid:       { bg: "var(--tm-badge-paid-bg)",       color: "var(--tm-badge-paid-color)"       },
    rejected:   { bg: "var(--tm-badge-rejected-bg)",   color: "var(--tm-badge-rejected-color)"   },
    planned:    { bg: "var(--tm-badge-planned-bg)",    color: "var(--tm-badge-planned-color)"    },
    confirmed:  { bg: "var(--tm-badge-confirmed-bg)",  color: "var(--tm-badge-confirmed-color)"  },
    received:   { bg: "var(--tm-badge-received-bg)",   color: "var(--tm-badge-received-color)"   },
  },
};

export type ThemeKey = "sage" | "mauve" | "coral" | "emerald";

export const THEMES: Record<ThemeKey, { label: string; dot1: string; dot2: string; dot3?: string }> = {
  sage:    { label: "Шалфей / Олива",    dot1: "#80A080", dot2: "#A0A080"             },
  mauve:   { label: "Моув / Тил",        dot1: "#91AD8D", dot2: "#334743"             },
  coral:   { label: "Коралл / Серый",    dot1: "#E98569", dot2: "#C5AA96"             },
  emerald: { label: "Изумруд / Бирюза",  dot1: "#00AA72", dot2: "#03899C", dot3: "#00BF32" },
};

const THEME_STORAGE_KEY = "tm_theme";
const DEFAULT_THEME:    ThemeKey = "emerald";  // ← дефолт при первом посещении

const THEME_CLASSES: Record<ThemeKey, string> = {
  sage:    "",
  mauve:   "theme-mauve",
  coral:   "theme-coral",
  emerald: "theme-emerald",
};

/**
 * Применяет тему: добавляет CSS-класс на <html> + сохраняет в localStorage.
 */
export function applyTheme(key: ThemeKey) {
  const root = document.documentElement;
  Object.values(THEME_CLASSES).forEach(cls => cls && root.classList.remove(cls));
  const cls = THEME_CLASSES[key];
  if (cls) root.classList.add(cls);
  try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch { /* silent */ }
}

/**
 * Читает активную тему: сначала из localStorage, потом из CSS-класса.
 * При отсутствии сохранённого значения возвращает DEFAULT_THEME.
 */
export function currentTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey | null;
    if (saved && saved in THEME_CLASSES) return saved;
  } catch { /* silent */ }
  // Fallback — читаем из CSS-классов
  const cl = document.documentElement.classList;
  if (cl.contains("theme-emerald")) return "emerald";
  if (cl.contains("theme-coral"))   return "coral";
  if (cl.contains("theme-mauve"))   return "mauve";
  return DEFAULT_THEME;
}

// ── Применить тему немедленно при загрузке модуля ──────────────────
// Это гарантирует что дефолтная тема активна до первого рендера React.
applyTheme(currentTheme());
