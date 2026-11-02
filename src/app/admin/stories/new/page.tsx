import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildStoryArticleLabels } from "@/components/stories/story-labels";
import { translatorFor } from "@/lib/i18n/translate";
import { readAdminSession } from "@/modules/identity/admin-access";
import { listAllPlacesForAdmin } from "@/modules/reference-data/admin-places";
import { StoryStudio } from "../story-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New story" };

export default async function NewStoryPage() {
  const admin = await readAdminSession();
  if (!admin) notFound();
  const placesResult = await listAllPlacesForAdmin();
  return (
    <StoryStudio
      story={null}
      places={
        placesResult.state === "ready"
          ? placesResult.places.map((place) => ({
              id: place.id,
              canonicalName: place.canonicalName,
            }))
          : []
      }
      labels={buildStoryArticleLabels(translatorFor("en"), "en", {
        authorName: "",
        place: null,
        publishedAt: null,
        updatedAt: new Date(),
        readingMinutes: 1,
        contentLocale: "en",
      })}
    />
  );
}
