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

  return (
    <Image
      className={className}
      src={src}
      alt=""
      fill
      priority={priority}
      unoptimized
      sizes={sizes}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
