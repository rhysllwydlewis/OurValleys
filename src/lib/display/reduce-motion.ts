/**
 * Client-side check for "should movement be reduced?": the device setting or
 * the visitor's own OurValleys choice (set on <html> by the root layout).
 */
export const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return (
    window.matchMedia(REDUCE_MOTION_QUERY).matches ||
    document.documentElement.dataset.displayMotion === "reduced"
  );
}
