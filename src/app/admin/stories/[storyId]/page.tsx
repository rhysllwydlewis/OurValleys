import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildStoryArticleLabels } from "@/components/stories/story-labels";
import { translatorFor } from "@/lib/i18n/translate";
import { readAdminSession } from "@/modules/identity/admin-access";
import { listAllPlacesForAdmin } from "@/modules/reference-data/admin-places";
import { getStoryForAdmin } from "@/modules/stories/admin";
import { readingMinutes } from "@/modules/stories/model";
import { StoryStudio } from "../story-studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit story" };

export default async function EditStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const admin = await readAdminSession();
  if (!admin) notFound();
  const { storyId } = await params;
  const { created } = await searchParams;
  const [story, placesResult] = await Promise.all([
    getStoryForAdmin(storyId),
    listAllPlacesForAdmin(),
  ]);
  if (!story) notFound();

  return (
    <StoryStudio
      story={story}
      notice={created === "1" ? "Story created and saved." : undefined}
      places={
        placesResult.state === "ready"
          ? placesResult.places.map((place) => ({
              id: place.id,
              canonicalName: place.canonicalName,
            }))
          : []
      }
      labels={buildStoryArticleLabels(translatorFor("en"), "en", {
        authorName: story.authorName,
        place: null,
        publishedAt: story.publishedAt,
        updatedAt: story.updatedAt,
        readingMinutes: readingMinutes(story.body),
        contentLocale: "en",
      })}
    />
  );
}
