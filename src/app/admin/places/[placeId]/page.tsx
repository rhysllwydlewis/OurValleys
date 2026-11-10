import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { translatorFor } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/translator";
import { readAdminSession } from "@/modules/identity/admin-access";
import { getPlaceProfileForAdmin } from "@/modules/reference-data/place-profile";
import styles from "../../admin.module.css";
import { PlaceProfileEditor } from "./place-profile-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Place profile" };

const PREVIEW_KEYS: MessageKey[] = [
  "placex.aboutEyebrow",
  "placex.aboutTitle",
  "placex.factsTitle",
  "placex.factsAria",
  "placex.aboutEnglishOnly",
];

function previewMessages(locale: "en" | "cy") {
  const t = translatorFor(locale);
  return Object.fromEntries(PREVIEW_KEYS.map((key) => [key, t(key)])) as Record<
    string,
    string
  >;
}

export default async function PlaceProfilePage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const admin = await readAdminSession();
  if (!admin) notFound();
  const { placeId } = await params;
  const result = await getPlaceProfileForAdmin(placeId);
  if (result.state === "not_found") notFound();

  return (
    <section>
      <p className={styles.hint}>
        <Link className="text-link" href="/admin/places">
          ← All places
        </Link>
      </p>
      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Place data is temporarily unavailable. Please try again shortly.
        </div>
      ) : (
        <PlaceProfileEditor
          place={result.place}
          initial={result.profile}
          updatedAt={result.updatedAt?.toISOString() ?? null}
          messages={{ en: previewMessages("en"), cy: previewMessages("cy") }}
        />
      )}
    </section>
  );
}
