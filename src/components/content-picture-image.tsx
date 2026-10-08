"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Renders a picture through the image optimiser (a resized, modern-format copy
 * sized to the layout) and falls back to the original file if the optimised
 * one cannot be loaded, so a misconfigured optimiser never leaves a hole.
 */
export function ContentPictureImage({
  src,
  alt,
  variant,
  sizes,
  optimised,
  priority,
}: {
  src: string;
  alt: string;
  variant: "flush" | "inset";
  sizes: string;
  optimised: boolean;
  priority: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const className = `content-picture content-picture--${variant}`;

  // An error can fire before React attaches onError; catch that case here.
  useEffect(() => {
    const element = ref.current;
    if (element && element.complete && element.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (!optimised || failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        src={src}
        alt={alt}
        width={640}
        height={400}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    );
  }

  return (
    <Image
      ref={ref}
      className={className}
      src={src}
      alt={alt}
      width={640}
      height={400}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
    />
  );
}
