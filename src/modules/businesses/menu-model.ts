/**
 * Pure rules for the structured menu builder (docs/32 §9.3, docs/53): the
 * approved dietary labels, how old free-text labels map onto them, price
 * tidying, safe re-ordering, the paste-a-menu importer, owner guidance and the
 * public filter. No database or framework imports so every rule is unit tested.
 */

export const dietaryLabelDefinitions = [
  {
    key: "vegetarian",
    label: "Vegetarian",
    short: "V",
    aliases: ["v", "veg", "vegetarian", "veggie", "llysieuol"],
  },
  {
    key: "vegan",
    label: "Vegan",
    short: "VE",
    aliases: ["ve", "vg", "vegan", "fegan", "plant based", "plant-based"],
  },
  {
    key: "gluten-free",
    label: "Gluten free",
    short: "GF",
    aliases: [
      "gf",
      "gluten free",
      "gluten-free",
      "glutenfree",
      "heb glwten",
      "di-glwten",
    ],
  },
  {
    key: "dairy-free",
    label: "Dairy free",
    short: "DF",
    aliases: ["df", "dairy free", "dairy-free", "dairyfree", "heb laeth"],
  },
  {
    key: "nut-free",
    label: "Nut free",
    short: "NF",
    aliases: ["nf", "nut free", "nut-free", "nutfree", "heb gnau"],
  },
  {
    key: "halal",
    label: "Halal",
    short: "H",
    aliases: ["halal", "h"],
  },
  {
    key: "spicy",
    label: "Spicy",
    short: "S",
    aliases: ["spicy", "hot", "sbeislyd", "chilli"],
  },
] as const;

export type DietaryLabelKey = (typeof dietaryLabelDefinitions)[number]["key"];

export const maxDietaryLabels = 12;
export const maxCustomLabelLength = 40;

export const dietaryLabelKeys: readonly DietaryLabelKey[] =
  dietaryLabelDefinitions.map((definition) => definition.key);

function foldLabel(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliasIndex: ReadonlyMap<string, DietaryLabelKey> = new Map(
  dietaryLabelDefinitions.flatMap((definition) =>
    [definition.label, definition.key, ...definition.aliases].map(
      (alias) => [foldLabel(alias), definition.key] as const,
    ),
  ),
);

/** The approved key a stored label stands for, or null for a custom label. */
export function dietaryKeyFor(label: string): DietaryLabelKey | null {
  return aliasIndex.get(foldLabel(label)) ?? null;
}

export function dietaryLabelFor(key: DietaryLabelKey): string {
  return (
    dietaryLabelDefinitions.find((definition) => definition.key === key)
      ?.label ?? key
  );
}

/**
 * Stored labels are the English display text for approved labels and the
 * owner's own words for custom ones. Free text typed before the builder
 * ("gf, V", "Gluten-free") is mapped onto the approved text so filters work;
 * unknown words are kept (trimmed, capped), duplicates collapse, order holds.
 */
export function normaliseDietaryLabels(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const key = dietaryKeyFor(trimmed);
    const stored = key
      ? dietaryLabelFor(key)
      : trimmed.slice(0, maxCustomLabelLength);
    const id = key ?? `custom:${foldLabel(stored)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(stored);
    if (result.length >= maxDietaryLabels) break;
  }
  return result;
}

/** Splits the "other labels" text box on commas, semicolons and new lines. */
export function splitCustomLabels(text: string): string[] {
  return text.split(/[,;\n]/).map((part) => part.trim());
}

export type MenuLabelParts = {
  keys: DietaryLabelKey[];
  custom: string[];
};

export function splitStoredLabels(labels: readonly string[]): MenuLabelParts {
  const keys: DietaryLabelKey[] = [];
  const custom: string[] = [];
  for (const label of normaliseDietaryLabels(labels)) {
    const key = dietaryKeyFor(label);
    if (key) keys.push(key);
    else custom.push(label);
  }
  return { keys, custom };
}

/**
 * Tidies a price. A bare number becomes pounds and pence ("4.5" is "£4.50",
 * "£4" is "£4.00"); anything with words ("from £5", "Market price", "£4 / £6")
 * is kept as typed, trimmed, because a price is display text, not arithmetic.
 */
export function normalisePrice(
  input: string | null | undefined,
): string | null {
  const trimmed = (input ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  const bare = /^£?\s*(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(trimmed);
  if (bare) {
    const pence = (bare[2] ?? "").padEnd(2, "0");
    return `£${bare[1]}.${pence || "00"}`;
  }
  return trimmed.slice(0, 80);
}

export type MoveDirection = "up" | "down";

/** Returns the ids with one moved a place; unchanged at either end or unknown. */
export function moveId<T extends string>(
  ids: readonly T[],
  id: T,
  direction: MoveDirection,
): T[] {
  const index = ids.indexOf(id);
  if (index === -1) return [...ids];
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export type ParsedMenuLine = {
  name: string;
  priceDisplay: string | null;
  description: string | null;
  dietaryLabels: string[];
};

export type ParsedMenuGroup = {
  name: string;
  items: ParsedMenuLine[];
};

export type ParsedMenu = {
  groups: ParsedMenuGroup[];
  skipped: number;
  truncated: boolean;
};

export const maxImportLines = 80;
export const maxImportGroups = 12;

const priceToken = /(£\s*\d{1,4}(?:[.,]\d{1,2})?|\b\d{1,4}[.,]\d{2}\b)/;

/**
 * Reads a pasted menu. A line ending in a colon, or written in capitals with
 * no price, starts a new group ("STARTERS", "Hot drinks:"). Any other line is
 * an item: "Name - £4.50 - description", "Name £4.50", "Name | 4.50 | desc".
 * Trailing "(v)", "(gf)" style tags become dietary labels. Lines that cannot
 * be read are counted, never guessed at.
 */
export function parsePastedMenu(
  text: string,
  defaultGroupName: string,
): ParsedMenu {
  const groups: ParsedMenuGroup[] = [];
  let current: ParsedMenuGroup | null = null;
  let skipped = 0;
  let truncated = false;
  let lines = 0;

  const startGroup = (name: string) => {
    if (groups.length >= maxImportGroups) {
      truncated = true;
      current = null;
      return;
    }
    current = { name: name.slice(0, 100), items: [] };
    groups.push(current);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine
      .replace(/^[\s\-–—•*·]+/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!line) continue;
    lines += 1;
    if (lines > maxImportLines) {
      truncated = true;
      break;
    }
    const hasPrice = priceToken.test(line);
    const isHeading =
      !hasPrice &&
      (/[:：]$/.test(line) ||
        (line.length <= 40 &&
          line === line.toUpperCase() &&
          /[A-ZÂÊÎÔÛŴŶ]/.test(line)));
    if (isHeading) {
      const name = line.replace(/[:：]$/, "").trim();
      startGroup(
        name === name.toUpperCase()
          ? name.charAt(0) + name.slice(1).toLowerCase()
          : name,
      );
      continue;
    }

    const tagLabels: string[] = [];
    const withoutTags = line
      .replace(/\(([^()]{1,24})\)/g, (whole, inner: string) => {
        const parts = inner.split(/[,/]/).map((part) => part.trim());
        const keys = parts.map((part) => dietaryKeyFor(part));
        if (keys.length > 0 && keys.every(Boolean)) {
          for (const key of keys) tagLabels.push(dietaryLabelFor(key!));
          return "";
        }
        return whole;
      })
      .replace(/\s+/g, " ")
      .trim();

    const parts = withoutTags
      .split(/\s+[-–—|]\s+|\s*\|\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    let name = parts[0] ?? "";
    let price: string | null = null;
    const descriptionParts: string[] = [];
    for (const part of parts.slice(1)) {
      if (!price && /^£?\s*\d{1,4}(?:[.,]\d{1,2})?$/.test(part)) {
        price = normalisePrice(part);
      } else {
        descriptionParts.push(part);
      }
    }
    if (!price) {
      const match = priceToken.exec(name);
      if (match && match.index > 1) {
        price = normalisePrice(match[0].replace(/\s+/g, ""));
        name = (
          name.slice(0, match.index) + name.slice(match.index + match[0].length)
        ).trim();
      }
    }
    if (!price) {
      const trailing = /^(.*\S)\s+£?(\d{1,3}(?:[.,]\d{1,2})?)$/.exec(name);
      if (trailing && trailing[1]!.length >= 2) {
        price = normalisePrice(trailing[2]);
        name = trailing[1]!;
      }
    }
    name = name.replace(/[,:\-–—]+$/, "").trim();
    if (name.length < 2 || /^[£\d.,\s]+$/.test(name)) {
      skipped += 1;
      continue;
    }
    if (!current) startGroup(defaultGroupName);
    const target = current as ParsedMenuGroup | null;
    if (!target) {
      skipped += 1;
      continue;
    }
    const description = descriptionParts.join(" – ").slice(0, 1000);
    target.items.push({
      name: name.slice(0, 120),
      priceDisplay: price,
      description: description || null,
      dietaryLabels: normaliseDietaryLabels(tagLabels),
    });
  }

  return {
    groups: groups.filter((group) => group.items.length > 0),
    skipped,
    truncated,
  };
}

export type MenuItemShape = {
  id: string;
  name: string;
  description: string | null;
  priceDisplay: string | null;
  dietaryLabels: string[];
  available: boolean;
  featured: boolean;
};

export type MenuGroupShape<Item extends MenuItemShape = MenuItemShape> = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  items: Item[];
};

export type MenuGuidance = {
  groups: number;
  items: number;
  hiddenGroups: number;
  unavailableItems: number;
  missingPrice: number;
  missingDescription: number;
  emptyGroups: number;
  hasFeatured: boolean;
  /** Ordered, most useful first. Codes map to catalogue keys in the UI. */
  suggestions: Array<
    | "add_group"
    | "add_items"
    | "fill_empty_groups"
    | "add_prices"
    | "add_descriptions"
    | "add_labels"
    | "feature_favourites"
  >;
};

export function describeMenuGuidance(
  groups: readonly MenuGroupShape[],
): MenuGuidance {
  const items = groups.flatMap((group) => group.items);
  const labelled = items.filter((item) => item.dietaryLabels.length > 0).length;
  const guidance: MenuGuidance = {
    groups: groups.length,
    items: items.length,
    hiddenGroups: groups.filter((group) => group.status === "hidden").length,
    unavailableItems: items.filter((item) => !item.available).length,
    missingPrice: items.filter((item) => !item.priceDisplay).length,
    missingDescription: items.filter((item) => !item.description?.trim())
      .length,
    emptyGroups: groups.filter((group) => group.items.length === 0).length,
    hasFeatured: items.some((item) => item.featured),
    suggestions: [],
  };
  if (groups.length === 0) guidance.suggestions.push("add_group");
  else if (items.length === 0) guidance.suggestions.push("add_items");
  if (guidance.emptyGroups > 0 && items.length > 0) {
    guidance.suggestions.push("fill_empty_groups");
  }
  if (guidance.missingPrice > 0) guidance.suggestions.push("add_prices");
  if (items.length >= 3 && labelled === 0) {
    guidance.suggestions.push("add_labels");
  }
  if (items.length >= 4 && guidance.missingDescription > items.length / 2) {
    guidance.suggestions.push("add_descriptions");
  }
  if (items.length >= 6 && !guidance.hasFeatured) {
    guidance.suggestions.push("feature_favourites");
  }
  return guidance;
}

export type MenuFilter = {
  /** Approved label keys an item must all carry. */
  dietary: readonly DietaryLabelKey[];
  hideUnavailable: boolean;
};

export function itemMatchesFilter(
  item: Pick<MenuItemShape, "dietaryLabels" | "available">,
  filter: MenuFilter,
): boolean {
  if (filter.hideUnavailable && !item.available) return false;
  if (filter.dietary.length === 0) return true;
  const { keys } = splitStoredLabels(item.dietaryLabels);
  return filter.dietary.every((key) => keys.includes(key));
}

/** Which approved labels at least one item carries, for the filter chips. */
export function dietaryKeysInUse(
  groups: readonly MenuGroupShape[],
): DietaryLabelKey[] {
  const used = new Set<DietaryLabelKey>();
  for (const group of groups) {
    for (const item of group.items) {
      for (const key of splitStoredLabels(item.dietaryLabels).keys) {
        used.add(key);
      }
    }
  }
  return dietaryLabelKeys.filter((key) => used.has(key));
}

/** Stable, readable anchor for a group heading. */
export function menuGroupAnchor(group: { id: string }): string {
  return `menu-group-${group.id.slice(0, 8)}`;
}

/** Items marked as favourites that can be ordered today, newest layout first. */
export function featuredMenuItems<Item extends MenuItemShape>(
  groups: readonly MenuGroupShape<Item>[],
  limit = 4,
): Item[] {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => item.featured && item.available)
    .slice(0, limit);
}
