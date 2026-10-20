import type { Instrumentation } from "next";
import { formatRequestError } from "@/lib/request-error-log";

/** One JSON line per failed server request, so Railway logs can filter on level and digest. */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  console.error(
    JSON.stringify(
      formatRequestError(error, { method: request.method }, context),
    ),
  );
};
