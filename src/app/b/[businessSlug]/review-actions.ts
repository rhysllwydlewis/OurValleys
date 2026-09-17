"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import {
  deleteOwnReview,
  submitBusinessReview,
  submitReviewInputSchema,
  type DeleteReviewResult,
  type SubmitReviewResult,
} from "@/modules/businesses/reviews";

type ReviewActor =
  | { state: "ready"; userId: string }
  | { state: "anonymous" }
  | { state: "forbidden" };

async function readReviewActor(): Promise<ReviewActor> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return { state: "anonymous" };
    if (isPublicDemoEmail(session.user.email)) return { state: "forbidden" };
    return { state: "ready", userId: session.user.id };
  } catch {
    return { state: "forbidden" };
  }
}

export type ReviewActionResult =
  SubmitReviewResult | { status: "signed_out" } | { status: "forbidden" };

export async function submitReviewAction(
  input: unknown,
): Promise<ReviewActionResult> {
  const actor = await readReviewActor();
  if (actor.state === "anonymous") return { status: "signed_out" };
  if (actor.state === "forbidden") return { status: "forbidden" };

  const parsed = submitReviewInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  return submitBusinessReview(actor.userId, parsed.data);
}

export type DeleteReviewActionResult =
  | { status: DeleteReviewResult }
  | { status: "signed_out" }
  | { status: "forbidden" };

export async function deleteReviewAction(
  input: unknown,
): Promise<DeleteReviewActionResult> {
  const actor = await readReviewActor();
  if (actor.state === "anonymous") return { status: "signed_out" };
  if (actor.state === "forbidden") return { status: "forbidden" };

  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await deleteOwnReview(actor.userId, parsed.data);
  return { status: result };
}
