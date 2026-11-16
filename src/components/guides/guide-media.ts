import { mediaPublicBaseUrl } from "@/lib/media-config";
import { isOptimisableMediaUrl } from "@/lib/media-image-config";
import {
  guideCardPicture,
  resolveGuidePicture,
  type GuidePictureView,
} from "@/modules/guides/guide-picture-model";

/** A decorative card picture, ready for `GuideImage`. */
export type GuideCardMedia = { src: string; optimised: boolean };

/** The main picture of a guide article, in the reader's language. */
export type GuideHeroPicture = {
  url: string;
  alt: string;
  /** Set only when the description is Welsh inside an English page region, or the reverse. */
  altLang?: string;
  credit: string | null;
  optimised: boolean;
};

function optimisable(url: string, mediaBase: string | undefined): boolean {
  return isOptimisableMediaUrl(url, mediaBase);
}

/**
 * The picture a guide card shows: the guide's own, else the stock one matched
 * to its subject (always a local file, so always optimisable). Resolved on the
 * server, where the media host is known.
 */
export function guideCardMedia(
  guide: { slug: string; picture?: GuidePictureView | null },
  index: number,
  mediaBase: string | undefined = mediaPublicBaseUrl(process.env) ?? undefined,
): GuideCardMedia {
  const chosen = guideCardPicture(guide, index);
  return {
    src: chosen.src,
    optimised: chosen.own ? optimisable(chosen.src, mediaBase) : true,
  };
}

/** The article picture for a reader, or `null` when the guide has none. */
export function guideHeroPicture(
  picture: GuidePictureView | null | undefined,
  welsh: boolean,
  mediaBase: string | undefined = mediaPublicBaseUrl(process.env) ?? undefined,
): GuideHeroPicture | null {
  if (!picture) return null;
  const resolved = resolveGuidePicture(picture, welsh);
  return {
    url: resolved.url,
    alt: resolved.alt,
    altLang: resolved.altLang,
    credit: resolved.credit,
    optimised: optimisable(resolved.url, mediaBase),
  };
}
