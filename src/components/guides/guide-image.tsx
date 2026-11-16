"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A guide picture (doc 118), drawn through the image optimiser where the file
 * is one it may fetch, so a 5MB upload reaches a phone as a small modern-format
 * copy. If the optimised copy cannot be loaded the original file is shown
 * instead, so a misconfigured optimiser never leaves a hole.
 */
export function GuideImage({
  src,
  alt,
  altLang,
  className,
  sizes,
  width,
  height,
  optimised,
  priority = false,
}: {
  src: string;
  /** Empty for a decorative card picture beside the guide's title. */
  alt: string;
  /** Set when the description is in a different language from the page. */
  altLang?: string;
  className?: string;
  sizes: string;
  width: number;
  height: number;
  optimised: boolean;
  /** For the article's main picture, usually the largest thing above the fold. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // An error can fire before React attaches onError; catch that case here.
  useEffect(() => {
    const element = ref.current;
    if (element && element.complete && element.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (!optimised || failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- the original file, when the optimiser may not or could not fetch it
      <img
        className={className}
        src={src}
        alt={alt}
        lang={altLang}
        width={width}
        height={height}
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
      lang={altLang}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
    />
  );
}
