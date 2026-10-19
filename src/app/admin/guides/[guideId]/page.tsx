import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildGuideArticleLabels } from "@/components/guides/guide-article-labels";
import { translatorFor } from "@/lib/i18n/translate";
import { getGuideForAdmin } from "@/modules/guides/admin";
import { readAdminSession } from "@/modules/identity/admin-access";
import { listAllPlacesForAdmin } from "@/modules/reference-data/admin-places";
import { GuideStudio } from "../guide-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit guide" };

export default async function EditGuidePage({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const admin = await readAdminSession();
  if (!admin) notFound();
  const { guideId } = await params;
  const [guide, placesResult] = await Promise.all([
    getGuideForAdmin(guideId),
    listAllPlacesForAdmin(),
  ]);
  if (!guide) notFound();

  const t = translatorFor("en");
  return (
    <GuideStudio
      guide={guide}
      places={
        placesResult.state === "ready"
          ? placesResult.places.map((place) => ({
              id: place.id,
              canonicalName: place.canonicalName,
            }))
          : []
      }
      labels={buildGuideArticleLabels(t, "en", {
        title: guide.title,
        authorName: guide.authorName,
        place: null,
        publishedAt: guide.publishedAt,
        updatedAt: guide.updatedAt,
      })}
      byTemplate={t("guide.by", { name: "{name}" })}
    />
  );
}
