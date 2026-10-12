import { foldText } from "@/modules/search/match";

/**
 * The place hierarchy (council area, valley, town or village) as pure data
 * structures. The directory page, the place pages and their tests all read
 * through this module so counts, search and grouping can never disagree.
 * It performs no database access and holds no private data: every field is
 * already public reference data or a count of published businesses.
 */

export type PlaceNode = {
  id: string;
  slug: string;
  name: string;
  welshName: string | null;
  placeType: string;
  coverageStatus: string;
  parentId: string | null;
  aliases: readonly string[];
  /** Published businesses recorded directly against this place. */
  businessCount: number;
};

export type PlaceTree = {
  nodes: readonly PlaceNode[];
  byId: ReadonlyMap<string, PlaceNode>;
  bySlug: ReadonlyMap<string, PlaceNode>;
  childrenOf: ReadonlyMap<string, readonly PlaceNode[]>;
  /** Businesses in the place and everything inside it. */
  totalCount: ReadonlyMap<string, number>;
};

/** Place types that group other places rather than being a locality. */
export const AREA_TYPES: readonly string[] = ["region", "valley"];

export function isLocality(node: PlaceNode): boolean {
  return !AREA_TYPES.includes(node.placeType);
}

export function displayName(node: PlaceNode, welsh: boolean): string {
  return (welsh && node.welshName) || node.name;
}

function byName(a: PlaceNode, b: PlaceNode): number {
  return a.name.localeCompare(b.name, "en-GB") || a.slug.localeCompare(b.slug);
}

/**
 * Builds the tree. A parent that is missing (inactive, say) leaves its child a
 * root; a cycle in the data cannot loop because counts and ancestors walk at
 * most `nodes.length` steps.
 */
export function buildPlaceTree(input: readonly PlaceNode[]): PlaceTree {
  const nodes = [...input].sort(byName);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const bySlug = new Map(nodes.map((node) => [node.slug, node]));
  const children = new Map<string, PlaceNode[]>();
  const linkedParent = new Map<string, string>();
  // True when `ancestorId` is `node` or already sits somewhere below it, so
  // linking would close a loop and make both places vanish from the roots.
  const closesLoop = (node: PlaceNode, parentId: string): boolean => {
    for (let id: string | null = parentId, step = 0; id; step += 1) {
      if (id === node.id || step > nodes.length) return true;
      id = linkedParent.get(id) ?? null;
    }
    return false;
  };
  for (const node of nodes) {
    if (!node.parentId || !byId.has(node.parentId)) continue;
    if (closesLoop(node, node.parentId)) continue;
    linkedParent.set(node.id, node.parentId);
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }

  const totalCount = new Map<string, number>();
  const total = (node: PlaceNode, seen: Set<string>): number => {
    if (seen.has(node.id)) return 0;
    seen.add(node.id);
    let sum = node.businessCount;
    for (const child of children.get(node.id) ?? []) sum += total(child, seen);
    return sum;
  };
  for (const node of nodes) totalCount.set(node.id, total(node, new Set()));

  return { nodes, byId, bySlug, childrenOf: children, totalCount };
}

/** Roots first: [council area, valley] for a town inside a valley. */
export function ancestorsOf(tree: PlaceTree, id: string): PlaceNode[] {
  const chain: PlaceNode[] = [];
  let current = tree.byId.get(id);
  for (let step = 0; current?.parentId && step < tree.nodes.length; step += 1) {
    const parent = tree.byId.get(current.parentId);
    if (!parent || chain.includes(parent)) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Every place inside `id`, at any depth, nearest first. */
export function descendantsOf(tree: PlaceTree, id: string): PlaceNode[] {
  const result: PlaceNode[] = [];
  const seen = new Set<string>([id]);
  const queue = [...(tree.childrenOf.get(id) ?? [])];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    result.push(node);
    queue.push(...(tree.childrenOf.get(node.id) ?? []));
  }
  return result;
}

/** Places that no other place contains (after any loop has been broken). */
export function rootsOf(tree: PlaceTree): PlaceNode[] {
  const contained = new Set<string>();
  for (const list of tree.childrenOf.values()) {
    for (const child of list) contained.add(child.id);
  }
  return tree.nodes.filter((node) => !contained.has(node.id));
}

export type PlaceGroup = {
  /** The valley, or null for towns and villages that sit directly in the area. */
  heading: PlaceNode | null;
  places: PlaceNode[];
};

export type PlaceArea = {
  area: PlaceNode;
  groups: PlaceGroup[];
  placeCount: number;
  businessCount: number;
};

/**
 * Council areas with their valleys and the localities in each. Towns directly
 * inside an area are gathered into one heading-less group so nothing is lost
 * when a council area has no valleys of its own (Bridgend, Torfaen).
 */
export function groupByArea(tree: PlaceTree): PlaceArea[] {
  return rootsOf(tree).map((area) => {
    const groups: PlaceGroup[] = [];
    const loose: PlaceNode[] = [];
    for (const child of tree.childrenOf.get(area.id) ?? []) {
      if (child.placeType === "valley") {
        const inside = descendantsOf(tree, child.id).filter(isLocality);
        groups.push({ heading: child, places: inside });
      } else if (isLocality(child)) {
        loose.push(child, ...descendantsOf(tree, child.id).filter(isLocality));
      }
    }
    if (loose.length > 0) {
      groups.push({ heading: null, places: loose.sort(byName) });
    }
    groups.sort((a, b) => {
      // Valleys with businesses first, then alphabetical; loose towns last.
      if (!a.heading || !b.heading) return a.heading ? -1 : b.heading ? 1 : 0;
      const diff =
        (tree.totalCount.get(b.heading.id) ?? 0) -
        (tree.totalCount.get(a.heading.id) ?? 0);
      return diff || byName(a.heading, b.heading);
    });
    return {
      area,
      groups,
      placeCount: groups.reduce((sum, group) => sum + group.places.length, 0),
      businessCount: tree.totalCount.get(area.id) ?? 0,
    };
  });
}

/** True when the place, its Welsh name or any alias contains the text. */
export function placeMatchesText(node: PlaceNode, text: string): boolean {
  const needle = foldText(text.trim());
  if (!needle) return true;
  return [node.name, node.welshName, ...node.aliases].some(
    (label) => label && foldText(label).includes(needle),
  );
}

/** ---- URL state for `/places` ------------------------------------------ */

export type PlaceDirectoryFilters = {
  q: string;
  /** Slug of a council area to show on its own; empty for all. */
  area: string;
  /** Only places that have at least one published business. */
  active: boolean;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parsePlaceDirectoryFilters(
  params: RawParams,
): PlaceDirectoryFilters {
  const area = first(params.area).trim().toLowerCase().slice(0, 80);
  return {
    q: first(params.q).trim().slice(0, 60),
    area: /^[a-z0-9-]+$/.test(area) ? area : "",
    active: first(params.active) === "1",
  };
}

/** Canonical `/places` URL for a filter set; defaults are omitted. */
export function placeDirectoryHref(
  filters: Partial<PlaceDirectoryFilters>,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.area) params.set("area", filters.area);
  if (filters.active) params.set("active", "1");
  const query = params.toString();
  return query ? `/places?${query}` : "/places";
}

export type PlaceDirectoryView = {
  areas: PlaceArea[];
  /** Localities matching a text search, flat and ordered; null without a search. */
  matches: PlaceNode[] | null;
  visiblePlaces: number;
  totalPlaces: number;
};

/**
 * What the directory shows for a filter set. A text search flattens the result
 * into one list (people look for a name, not a hierarchy); otherwise areas are
 * kept as groups. `active` hides places and areas with no published business.
 * An unknown area slug is ignored rather than producing an empty page.
 */
export function viewPlaceDirectory(
  tree: PlaceTree,
  filters: PlaceDirectoryFilters,
): PlaceDirectoryView {
  const localities = tree.nodes.filter(isLocality);
  const keep = (node: PlaceNode) =>
    !filters.active || (tree.totalCount.get(node.id) ?? 0) > 0;
  const found = filters.area ? tree.bySlug.get(filters.area) : undefined;
  // Only council areas (roots) scope the page; any other slug is ignored.
  const areaNode =
    found && rootsOf(tree).some((root) => root.id === found.id)
      ? found
      : undefined;
  const scopeIds = areaNode
    ? new Set([
        areaNode.id,
        ...descendantsOf(tree, areaNode.id).map((node) => node.id),
      ])
    : null;
  const inScope = (node: PlaceNode) => !scopeIds || scopeIds.has(node.id);

  if (filters.q) {
    const matches = localities
      .filter(inScope)
      .filter(keep)
      .filter((node) => placeMatchesText(node, filters.q));
    return {
      areas: [],
      matches,
      visiblePlaces: matches.length,
      totalPlaces: localities.length,
    };
  }

  const areas = groupByArea(tree)
    .filter((entry) => !areaNode || entry.area.id === areaNode.id)
    .map((entry) => {
      const groups = entry.groups
        .map((group) => ({ ...group, places: group.places.filter(keep) }))
        .filter((group) => group.places.length > 0);
      return {
        ...entry,
        groups,
        placeCount: groups.reduce((sum, group) => sum + group.places.length, 0),
      };
    })
    .filter((entry) => entry.groups.length > 0);
  const visiblePlaces = areas.reduce(
    (sum, entry) =>
      sum + entry.groups.reduce((n, group) => n + group.places.length, 0),
    0,
  );
  return {
    areas,
    matches: null,
    visiblePlaces,
    totalPlaces: localities.length,
  };
}
