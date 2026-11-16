import type { ReactNode } from "react";

/** Decorative line icons for the designer; the label beside each carries the meaning. */
function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function DeviceIcon({
  device,
}: {
  device: "desktop" | "tablet" | "mobile";
}) {
  if (device === "desktop") {
    return (
      <Icon>
        <rect x="3" y="4.5" width="18" height="12" rx="2" />
        <path d="M9 20h6M12 16.5V20" />
      </Icon>
    );
  }
  if (device === "tablet") {
    return (
      <Icon>
        <rect x="5.5" y="3" width="13" height="18" rx="2.2" />
        <path d="M11 18h2" />
      </Icon>
    );
  }
  return (
    <Icon>
      <rect x="7.5" y="3" width="9" height="18" rx="2.2" />
      <path d="M11 18h2" />
    </Icon>
  );
}

export function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <Icon size={16}>
      {direction === "up" ? (
        <path d="M12 19V5M6 11l6-6 6 6" />
      ) : (
        <path d="M12 5v14M6 13l6 6 6-6" />
      )}
    </Icon>
  );
}

export function EyeIcon() {
  return (
    <Icon>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icon>
  );
}

export function PictureIcon({ kind }: { kind: "logo" | "cover" | "gallery" }) {
  if (kind === "logo") {
    return (
      <Icon size={22}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 14.5 11 10l2 3 1.2-1.6 1.6 3.1" />
      </Icon>
    );
  }
  if (kind === "cover") {
    return (
      <Icon size={22}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m3.5 16 4.8-4.6 3.6 3.2 2.6-2.3 6 5.2" />
        <circle cx="16" cy="9.3" r="1.4" />
      </Icon>
    );
  }
  return (
    <Icon size={22}>
      <rect x="3" y="3" width="8" height="8" rx="1.8" />
      <rect x="13" y="3" width="8" height="8" rx="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="1.8" />
      <rect x="13" y="13" width="8" height="8" rx="1.8" />
    </Icon>
  );
}
