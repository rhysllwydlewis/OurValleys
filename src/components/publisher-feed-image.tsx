"use client";

import Image from "next/image";
import { useState } from "react";

type PublisherFeedImageProps = {
  src: string;
  sizes: string;
  className: string;
  priority?: boolean;
};

export function PublisherFeedImage({
  src,
  sizes,
  className,
  priority = false,
}: PublisherFeedImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  const sharedProps = {
    className,
    src,
    alt: "",
    fill: true,
    unoptimized: true,
    sizes,
    referrerPolicy: "no-referrer" as const,
    onError: () => setFailed(true),
  };

  return priority ? (
    <Image {...sharedProps} priority />
  ) : (
    <Image {...sharedProps} loading="lazy" />
  );
}
