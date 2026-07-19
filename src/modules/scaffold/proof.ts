import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/database/client";
import { scaffoldProof } from "@/lib/database/schema/scaffold";

export type ScaffoldProofStatus =
  | { state: "ready"; value: string }
  | { state: "unavailable"; value: null };

export async function readScaffoldProof(): Promise<ScaffoldProofStatus> {
  try {
    const [proof] = await db
      .select({ value: scaffoldProof.proofValue })
      .from(scaffoldProof)
      .where(eq(scaffoldProof.proofKey, "database"))
      .limit(1);

    return proof
      ? { state: "ready", value: proof.value }
      : { state: "unavailable", value: null };
  } catch {
    return { state: "unavailable", value: null };
  }
}
