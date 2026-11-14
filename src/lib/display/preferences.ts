/**
 * Display comfort preferences: a visitor's own text size, contrast, motion,
 * spacing and font choices. Stored in one plain cookie (no account, no
 * database) and applied as `data-*` attributes on <html>. Every value is
 * validated against a closed list, so a tampered cookie falls back safely.
 */
export const DISPLAY_COOKIE = "ov-display";
export const DISPLAY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const DISPLAY_OPTIONS = {
  text: ["standard", "large", "larger"],
  contrast: ["standard", "high"],
  motion: ["system", "reduced"],
  spacing: ["standard", "relaxed"],
  font: ["standard", "plain"],
} as const;

export type DisplayGroup = keyof typeof DISPLAY_OPTIONS;
export type DisplayPreferences = {
  [G in DisplayGroup]: (typeof DISPLAY_OPTIONS)[G][number];
};

export const DISPLAY_GROUPS = Object.keys(DISPLAY_OPTIONS) as DisplayGroup[];

export const DEFAULT_DISPLAY: DisplayPreferences = {
  text: "standard",
  contrast: "standard",
  motion: "system",
  spacing: "standard",
  font: "standard",
};

function pick<G extends DisplayGroup>(
  group: G,
  value: unknown,
): DisplayPreferences[G] {
  const allowed = DISPLAY_OPTIONS[group] as readonly string[];
  return typeof value === "string" && allowed.includes(value)
    ? (value as DisplayPreferences[G])
    : DEFAULT_DISPLAY[group];
}

/** Reads any key/value source (form data or parsed cookie) safely. */
export function normaliseDisplay(
  read: (group: DisplayGroup) => unknown,
): DisplayPreferences {
  return {
    text: pick("text", read("text")),
    contrast: pick("contrast", read("contrast")),
    motion: pick("motion", read("motion")),
    spacing: pick("spacing", read("spacing")),
    font: pick("font", read("font")),
  };
}

export function serialiseDisplay(prefs: DisplayPreferences): string {
  return DISPLAY_GROUPS.map((group) => `${group}:${prefs[group]}`).join(".");
}

export function parseDisplayCookie(
  value: string | undefined | null,
): DisplayPreferences {
  if (!value || value.length > 200) return { ...DEFAULT_DISPLAY };
  const parts = new Map<string, string>();
  for (const part of value.split(".")) {
    const [key, option] = part.split(":");
    if (key && option) parts.set(key, option);
  }
  return normaliseDisplay((group) => parts.get(group));
}

export function isDefaultDisplay(prefs: DisplayPreferences): boolean {
  return DISPLAY_GROUPS.every(
    (group) => prefs[group] === DEFAULT_DISPLAY[group],
  );
}

/** The attributes for <html>; only non-default choices are emitted. */
export function displayAttributes(
  prefs: DisplayPreferences,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const group of DISPLAY_GROUPS) {
    if (prefs[group] !== DEFAULT_DISPLAY[group]) {
      attributes[`data-display-${group}`] = prefs[group];
    }
  }
  return attributes;
}
