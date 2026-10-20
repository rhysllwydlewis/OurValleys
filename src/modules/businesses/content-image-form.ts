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
): Promise<ContentImageChange> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const saved = await saveContentImage({
      businessId,
      kind,
      contentType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
      altText: String(formData.get("imageAlt") ?? ""),
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
  // No new file: a typed description edits the current picture's description.
  const newAlt = String(formData.get("imageAlt") ?? "").trim();
  if (newAlt && itemId) {
    const updated = await updateContentImageAlt({
      businessId,
      kind,
      itemId,
      altText: newAlt,
    });
    if (updated === "invalid") return { ok: false, outcome: "image-invalid" };
    if (updated === "unavailable") return { ok: false, outcome: "unavailable" };
  }
  return { ok: true, imageMediaId: undefined, uploadedMediaId: null };
}
