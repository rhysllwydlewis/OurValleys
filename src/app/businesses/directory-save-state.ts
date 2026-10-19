import "server-only";

import { headers } from "next/headers";
import type { SaveSearchState } from "@/components/search/save-search";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import {
  canonicalDirectoryQuery,
  isSavedSearch,
} from "@/modules/residents/saved-search-model";
import { listSavedSearchesForUser } from "@/modules/residents/saved-searches";

/**
 * Whether to offer "Save these filters" on the business directory, and the
 * canonical filter string that would be kept. Nothing is offered when no filter
 * narrows the directory or there are no results to keep.
 */
export async function readDirectorySaveState(
  rawQuery: string,
  resultTotal: number,
): Promise<{ state: SaveSearchState; query: string | null }> {
  const query = canonicalDirectoryQuery(rawQuery);
  if (!query) return { state: { kind: "hidden" }, query: null };
  let session;
  try {
    session = await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return { state: { kind: "hidden" }, query };
  }
  if (!session) {
    return {
      state: resultTotal > 0 ? { kind: "anonymous" } : { kind: "hidden" },
      query,
    };
  }
  if (isPublicDemoEmail(session.user.email)) {
    return { state: { kind: "hidden" }, query };
  }
  const saved = await listSavedSearchesForUser(session.user.id);
  if (saved.state !== "ready") return { state: { kind: "hidden" }, query };
  if (isSavedSearch(saved.searches, { queryKey: query, type: "directory" })) {
    return { state: { kind: "saved" }, query };
  }
  return {
    state: resultTotal > 0 ? { kind: "available" } : { kind: "hidden" },
    query,
  };
}
