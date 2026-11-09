import "server-only";
import {
  currentContentImageId,
  saveContentImage,
  updateContentImageAlt,
  type ContentImageKind,
} from "./content-images";

export type ContentImageChange =
  | {
      ok: true;
      /** `undefined` leaves the picture alone, `null` removes it. */
      imageMediaId: string | null | undefined;
      /** Set when this request uploaded a picture that may need cleaning up. */
      uploadedMediaId: string | null;
      /**
       * With `deferAltUpdate`: typed descriptions for the current picture that
       * the caller applies (`applyContentImageAlt`) once its own save succeeds.
       */
      pendingAlt?: { altText?: string; altTextCy?: string | null };
    }
  | { ok: false; outcome: string };

/**
 * Reads the optional picture fields of an offer or event form. A newly chosen
 * file wins over "remove the picture"; no file and no tick leaves it as it is.
 */
export async function readContentImageChange(
  formData: FormData,
  businessId: string,
  kind: ContentImageKind,
  itemId: string | undefined,
  options: { deferAltUpdate?: boolean } = {},
): Promise<ContentImageChange> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const saved = await saveContentImage({
      businessId,
      kind,
      contentType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
      altText: String(formData.get("imageAlt") ?? ""),
      altTextCy: String(formData.get("imageAltCy") ?? ""),
      // Read on the server for this business, never taken from the form.
      replacingMediaId: itemId
        ? await currentContentImageId({ businessId, kind, itemId })
        : null,
    });
    if (saved.status === "saved") {
      return {
        ok: true,
        imageMediaId: saved.mediaId,
        uploadedMediaId: saved.mediaId,
      };
    }
    const outcomes = {
      invalid: "image-invalid",
      limit: "image-limit",
      disabled: "image-storage",
      unavailable: "unavailable",
    } as const;
    return { ok: false, outcome: outcomes[saved.status] };
  }
  if (
    formData.get("removeImage") === "on" ||
    formData.get("removeImage") === "true"
  ) {
    return { ok: true, imageMediaId: null, uploadedMediaId: null };
  }
  // No new file: typed descriptions edit the current picture's descriptions.
  // The Welsh field is sent whole (an empty one clears it); a form that does
  // not send it at all leaves the Welsh text alone.
  const newAlt = String(formData.get("imageAlt") ?? "").trim();
  const welsh = formData.get("imageAltCy");
  const altTextCy = typeof welsh === "string" ? welsh : undefined;
  if ((newAlt || altTextCy !== undefined) && itemId) {
    const change = { altText: newAlt || undefined, altTextCy };
    if (options.deferAltUpdate) {
      return {
        ok: true,
        imageMediaId: undefined,
        uploadedMediaId: null,
        pendingAlt: change,
      };
    }
    const updated = await updateContentImageAlt({
      businessId,
      kind,
      itemId,
      ...change,
    });
    if (updated === "invalid") return { ok: false, outcome: "image-invalid" };
    if (updated === "unavailable") return { ok: false, outcome: "unavailable" };
  }
  return { ok: true, imageMediaId: undefined, uploadedMediaId: null };
}

/** Applies a description held back by `deferAltUpdate`, after the save it waited for. */
export async function applyContentImageAlt(input: {
  businessId: string;
  kind: ContentImageKind;
  itemId: string;
  altText?: string;
  altTextCy?: string | null;
}): Promise<"updated" | "invalid" | "unavailable"> {
  const result = await updateContentImageAlt(input);
  return result === "invalid" || result === "unavailable" ? result : "updated";
}
