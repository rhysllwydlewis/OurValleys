import { qrPathData } from "@/modules/businesses/qr-code";

/**
 * A QR code drawn as an ordinary SVG element from the module path, so nothing
 * is injected as markup. Dark on white with the standard quiet zone, which
 * keeps it scannable whatever colours surround it.
 */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  /** The accessible name: what scanning the code does. */
  label: string;
  className?: string;
}) {
  const { size, path } = qrPathData(value);
  return (
    <svg
      className={className}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path d={path} fill="#111" />
    </svg>
  );
}
