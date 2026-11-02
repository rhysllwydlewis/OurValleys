import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readAdminSession } from "@/modules/identity/admin-access";
import { getGuideWelshForAdmin } from "@/modules/guides/welsh-admin";
import { WelshEditor } from "../../welsh-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Welsh version of guide" };

export default async function GuideWelshPage({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const admin = await readAdminSession();
  if (!admin) notFound();
  const { guideId } = await params;
  const view = await getGuideWelshForAdmin(guideId);
  if (!view) notFound();

  return (
    <WelshEditor
      guide={{
        id: view.guide.id,
        slug: view.guide.slug,
        status: view.guide.status,
        updatedAt: view.guide.updatedAt.toISOString(),
        title: view.guide.title,
        summary: view.guide.summary,
        areaLabel: view.guide.areaLabel,
        readingTime: view.guide.readingTime,
        sponsorshipDisclosure: view.guide.sponsorshipDisclosure,
        sections: view.guide.sections,
      }}
      initial={view.welsh}
      welshUpdatedAt={view.welshUpdatedAt?.toISOString() ?? null}
      englishChangedSince={view.englishChangedSince}
    />
  );
}
