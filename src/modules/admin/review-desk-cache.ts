import "server-only";
import { cache } from "react";
import { loadReviewDesk } from "./review-desk-loader";

/** One desk read per request, shared by the layout badges and the page. */
export const readReviewDesk = cache(() => loadReviewDesk());
