"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { saveBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { businessSections } from "@/modules/businesses/appearance";
import {
  isMediaRole,
  removeBusinessMedia,
  saveBusinessMedia,
} from "@/modules/businesses/media";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";

async function readAuthorisedEditor(
  businessId: string,
): Promise<string | null> {
  if (!z.uuid().safeParse(businessId).success) return null;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return null;
    const authorised = await canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.editProfile,
    });
    return authorised ? session.user.id : null;
  } catch {
    return null;
  }
}

function backTo(businessId: string, outcome: string): never {
  redirect(`/dashboard/business/${businessId}/website?outcome=${outcome}`);
}

export async function saveAppearanceAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const editor = await readAuthorisedEditor(businessId);
  if (!editor) backTo(businessId, "forbidden");

  const hiddenSections = businessSections
    .filter((section) => formData.get(`visible-${section.id}`) !== "on")
    .map((section) => section.id);
  const positioned = businessSections
    .map((section) => ({
      id: section.id,
      position: Number(formData.get(`position-${section.id}`) ?? 0),
    }))
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.id);

  const result = await saveBusinessAppearance(businessId, {
    templateKey: String(formData.get("templateKey") ?? ""),
    accentKey: String(formData.get("accentKey") ?? ""),
    hiddenSections,
    sectionOrder: positioned,
  });

  backTo(businessId, result.status === "saved" ? "saved" : result.status);
}

export async function uploadMediaAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const editor = await readAuthorisedEditor(businessId);
  if (!editor) backTo(businessId, "forbidden");

  const role = String(formData.get("role") ?? "");
  const file = formData.get("file");
  if (!isMediaRole(role) || !(file instanceof File) || file.size === 0) {
    backTo(businessId, "invalid");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await saveBusinessMedia({
    businessId,
    role,
    fileName: file.name,
    contentType: file.type,
    bytes,
    altText: String(formData.get("altText") ?? ""),
  });

  backTo(businessId, result.status === "saved" ? "saved" : result.status);
}

export async function removeMediaAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const editor = await readAuthorisedEditor(businessId);
  if (!editor) backTo(businessId, "forbidden");

  const mediaId = String(formData.get("mediaId") ?? "");
  if (!z.uuid().safeParse(mediaId).success) backTo(businessId, "invalid");

  const result = await removeBusinessMedia({ businessId, mediaId });
  backTo(businessId, result.status === "removed" ? "removed" : result.status);
}
