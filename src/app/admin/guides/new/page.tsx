import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildGuideArticleLabels } from "@/components/guides/guide-article-labels";
import { translatorFor } from "@/lib/i18n/translate";
import { readAdminSession } from "@/modules/identity/admin-access";
import { listAllPlacesForAdmin } from "@/modules/reference-data/admin-places";
import { GuideStudio } from "../guide-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New guide" };

export default async function NewGuidePage() {
  const admin = await readAdminSession();
  if (!admin) notFound();
  const placesResult = await listAllPlacesForAdmin();
  const t = translatorFor("en");
  return (
    <GuideStudio
      guide={null}
      places={
        placesResult.state === "ready"
          ? placesResult.places.map((place) => ({
              id: place.id,
              canonicalName: place.canonicalName,
            }))
          : []
      }
      labels={buildGuideArticleLabels(t, "en", {
        title: "",
        authorName: "",
        place: null,
        publishedAt: null,
        updatedAt: new Date(),
      })}
      byTemplate={t("guide.by", { name: "{name}" })}
    />
  );
}
