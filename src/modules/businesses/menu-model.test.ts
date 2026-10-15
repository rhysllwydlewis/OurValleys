import { describe, expect, it } from "vitest";
import {
  describeMenuGuidance,
  dietaryKeysInUse,
  dietaryKeyFor,
  featuredMenuItems,
  itemMatchesFilter,
  moveId,
  normaliseDietaryLabels,
  normalisePrice,
  parsePastedMenu,
  splitStoredLabels,
  type MenuGroupShape,
} from "./menu-model";

const item = (
  id: string,
  over: Partial<MenuGroupShape["items"][number]> = {},
): MenuGroupShape["items"][number] => ({
  id,
  name: `Item ${id}`,
  description: null,
  priceDisplay: null,
  dietaryLabels: [],
  available: true,
  featured: false,
  ...over,
});

describe("dietary labels", () => {
  it("maps abbreviations, Welsh and spacing onto approved labels", () => {
    expect(dietaryKeyFor("GF")).toBe("gluten-free");
    expect(dietaryKeyFor(" Gluten-free ")).toBe("gluten-free");
    expect(dietaryKeyFor("Llysieuol")).toBe("vegetarian");
    expect(dietaryKeyFor("Heb gnau")).toBe("nut-free");
    expect(dietaryKeyFor("contains truffle")).toBeNull();
  });

  it("normalises, de-duplicates, keeps custom text and caps the list", () => {
    expect(
      normaliseDietaryLabels([
        "gf",
        "Gluten free",
        "V",
        "  Local honey ",
        "",
        "local HONEY",
      ]),
    ).toEqual(["Gluten free", "Vegetarian", "Local honey"]);
    const many = Array.from({ length: 30 }, (_, index) => `Custom ${index}`);
    expect(normaliseDietaryLabels(many)).toHaveLength(12);
    expect(normaliseDietaryLabels(["x".repeat(90)])[0]).toHaveLength(40);
  });

  it("splits stored labels into approved keys and custom text", () => {
    expect(splitStoredLabels(["vegan", "Contains oats", "ve"])).toEqual({
      keys: ["vegan"],
      custom: ["Contains oats"],
    });
  });
});

describe("normalisePrice", () => {
  it("formats bare numbers as pounds", () => {
    expect(normalisePrice("4.5")).toBe("£4.50");
    expect(normalisePrice("£4")).toBe("£4.00");
    expect(normalisePrice("£ 12,5")).toBe("£12.50");
    expect(normalisePrice("3.95")).toBe("£3.95");
  });
  it("keeps words and ranges as typed, and empties to null", () => {
    expect(normalisePrice("from £5")).toBe("from £5");
    expect(normalisePrice("Market price")).toBe("Market price");
    expect(normalisePrice("£4 / £6")).toBe("£4 / £6");
    expect(normalisePrice("   ")).toBeNull();
    expect(normalisePrice(null)).toBeNull();
    expect(normalisePrice("x".repeat(200))).toHaveLength(80);
  });
});

describe("moveId", () => {
  it("swaps neighbours and stops at the ends", () => {
    expect(moveId(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(moveId(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
    expect(moveId(["a", "b"], "zzz", "up")).toEqual(["a", "b"]);
  });
});

describe("parsePastedMenu", () => {
  it("reads groups, prices, descriptions and tags", () => {
    const parsed = parsePastedMenu(
      [
        "STARTERS",
        "Leek soup - £5.50 - with crusty bread (v)",
        "Welsh rarebit £6 (v, gf)",
        "",
        "Mains:",
        "- Cawl | 12.5 | lamb and root vegetables",
        "Sunday roast  £14.95",
      ].join("\n"),
      "Menu",
    );
    expect(parsed.skipped).toBe(0);
    expect(parsed.groups.map((group) => group.name)).toEqual([
      "Starters",
      "Mains",
    ]);
    expect(parsed.groups[0]!.items[0]).toEqual({
      name: "Leek soup",
      priceDisplay: "£5.50",
      description: "with crusty bread",
      dietaryLabels: ["Vegetarian"],
    });
    expect(parsed.groups[0]!.items[1]).toMatchObject({
      name: "Welsh rarebit",
      priceDisplay: "£6.00",
      dietaryLabels: ["Vegetarian", "Gluten free"],
    });
    expect(parsed.groups[1]!.items[0]).toMatchObject({
      name: "Cawl",
      priceDisplay: "£12.50",
      description: "lamb and root vegetables",
    });
    expect(parsed.groups[1]!.items[1]).toMatchObject({
      name: "Sunday roast",
      priceDisplay: "£14.95",
    });
  });

  it("uses the default group when no heading comes first", () => {
    const parsed = parsePastedMenu("Tea £2\nCoffee £3", "Drinks");
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0]!.name).toBe("Drinks");
    expect(parsed.groups[0]!.items).toHaveLength(2);
  });

  it("keeps unknown brackets in the name and skips unreadable lines", () => {
    const parsed = parsePastedMenu("Soup (large) £4\n£3\nx", "Menu");
    expect(parsed.groups[0]!.items).toHaveLength(1);
    expect(parsed.groups[0]!.items[0]!.name).toBe("Soup (large)");
    expect(parsed.skipped).toBe(2);
  });

  it("caps lines and groups and says so", () => {
    const long = Array.from(
      { length: 120 },
      (_, index) => `Dish ${index} £${index}`,
    );
    const parsed = parsePastedMenu(long.join("\n"), "Menu");
    expect(parsed.truncated).toBe(true);
    expect(parsed.groups[0]!.items.length).toBe(80);
    const groups = Array.from(
      { length: 20 },
      (_, index) => `Group ${index}:\nItem ${index} £1`,
    );
    const many = parsePastedMenu(groups.join("\n"), "Menu");
    expect(many.groups).toHaveLength(12);
    expect(many.truncated).toBe(true);
  });

  it("returns nothing for empty or heading-only text", () => {
    expect(parsePastedMenu("", "Menu").groups).toEqual([]);
    expect(parsePastedMenu("STARTERS\nMAINS", "Menu").groups).toEqual([]);
  });
});

describe("guidance and filtering", () => {
  const groups: MenuGroupShape[] = [
    {
      id: "g1",
      name: "Mains",
      description: null,
      status: "active",
      items: [
        item("1", {
          dietaryLabels: ["Vegan"],
          featured: true,
          priceDisplay: "£5.00",
        }),
        item("2", { available: false, dietaryLabels: ["vegan", "GF"] }),
      ],
    },
    { id: "g2", name: "Empty", description: null, status: "hidden", items: [] },
  ];

  it("describes what is missing", () => {
    const guidance = describeMenuGuidance(groups);
    expect(guidance).toMatchObject({
      groups: 2,
      items: 2,
      hiddenGroups: 1,
      unavailableItems: 1,
      missingPrice: 1,
      emptyGroups: 1,
      hasFeatured: true,
    });
    expect(guidance.suggestions).toContain("fill_empty_groups");
    expect(guidance.suggestions).toContain("add_prices");
    expect(describeMenuGuidance([]).suggestions).toEqual(["add_group"]);
    expect(
      describeMenuGuidance([
        { id: "x", name: "A", description: null, status: "active", items: [] },
      ]).suggestions,
    ).toContain("add_items");
  });

  it("filters by every chosen label and by availability", () => {
    const [first, second] = groups[0]!.items;
    expect(
      itemMatchesFilter(first!, { dietary: ["vegan"], hideUnavailable: false }),
    ).toBe(true);
    expect(
      itemMatchesFilter(first!, {
        dietary: ["vegan", "gluten-free"],
        hideUnavailable: false,
      }),
    ).toBe(false);
    expect(
      itemMatchesFilter(second!, {
        dietary: ["vegan", "gluten-free"],
        hideUnavailable: false,
      }),
    ).toBe(true);
    expect(
      itemMatchesFilter(second!, { dietary: [], hideUnavailable: true }),
    ).toBe(false);
  });

  it("lists labels in use in the approved order and picks favourites that are available", () => {
    expect(dietaryKeysInUse(groups)).toEqual(["vegan", "gluten-free"]);
    expect(featuredMenuItems(groups).map((entry) => entry.id)).toEqual(["1"]);
    const all = [
      {
        ...groups[0]!,
        items: [item("a", { featured: true, available: false })],
      },
    ];
    expect(featuredMenuItems(all)).toEqual([]);
  });
});
