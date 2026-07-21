"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  businessSections,
  defaultAppearance,
} from "@/modules/businesses/appearance";
import { saveBusinessAppearance } from "@/modules/businesses/appearance-repository";
import {
  isMediaRole,
  moveBusinessGalleryMedia,
  removeBusinessMedia,
  saveBusinessMedia,
  updateBusinessMediaPresentation,
} from "@/modules/businesses/media";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";

async function readAuthorisedEditor(businessId: string): Promise<boolean> {
  if (!z.uuid().safeParse(businessId).success) return false;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return false;
    return await canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.editProfile,
    });
  } catch {
    return false;
  }
}

function backTo(businessId: string, outcome: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  redirect(`/dashboard/business/${businessId}/website?outcome=${outcome}`);
}

function readFocalPoint(formData: FormData, name: string): number {
  return Number(formData.get(name) ?? 50);
}

export async function saveAppearanceAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await readAuthorisedEditor(businessId))) {
    backTo(businessId, "forbidden");
  }

  const hiddenSections = businessSections
    .filter((section) => formData.get(`visible-${section.id}`) !== "on")
    .map((section) => section.id);
  const positioned = businessSections
    .map((section, originalIndex) => ({
      id: section.id,
      originalIndex,
      position: Number(formData.get(`position-${section.id}`) ?? 0),
    }))
    .sort(
      (a, b) => a.position - b.position || a.originalIndex - b.originalIndex,
    )
    .map((entry) => entry.id);
  const sectionLayouts = Object.fromEntries(
    businessSections.map((section) => [
      section.id,
      String(
        formData.get(`layout-${section.id}`) ?? section.defaultLayout,
      ),
    ]),
  );

  const result = await saveBusinessAppearance(businessId, {
    templateKey: String(formData.get("templateKey") ?? ""),
    accentKey: String(formData.get("accentKey") ?? ""),
    hiddenSections,
    sectionOrder: positioned,
    sectionLayouts,
  });

  backTo(businessId, result.status === "saved" ? "saved" : result.status);
}

export async function resetAppearanceAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await readAuthorisedEditor(businessId))) {
    backTo(businessId, "forbidden");
  }

  const result = await saveBusinessAppearance(businessId, defaultAppearance);
  backTo(businessId, result.status === "saved" ? "reset" : result.status);
}

export async function uploadMediaAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await readAuthorisedEditor(businessId))) {
    backTo(businessId, "forbidden");
  }

  const role = String(formData.get("role") ?? "");
  const file = formData.get("file");
  if (!isMediaRole(role) || !(file instanceof File) || file.size === 0) {
    backTo(businessId, "invalid");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await saveBusinessMedia({
    businessId,
    role,
    contentType: file.type,
    bytes,
    altText: String(formData.get("altText") ?? ""),
    focalX: readFocalPoint(formData, "focalX"),
    focalY: readFocalPoint(formData, "focalY"),
  });

  backTo(businessId, result.status === "saved" ? "uploaded" : result.status);
}

export async function updateMediaAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await readAuthorisedEditor(businessId))) {
    backTo(businessId, "forbidden");
  }

  const mediaId = String(formData.get("mediaId") ?? "");
  if (!z.uuid().safeParse(mediaId).success) backTo(businessId, "invalid");

  const result = await updateBusinessMediaPresentation({
    businessId,
    mediaId,
    altText: String(formData.get("altText") ?? ""),
    focalX: readFocalPoint(formData, "focalX"),
    focalY: readFocalPoint(formData, "focalY"),
  });
  backTo(businessId, result.status === "saved" ? "media-saved" : result.status);
}

export async function moveMediaAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await readAuthorisedEditor(businessId))) {
    backTo(businessId, "forbidden");
  }

  const mediaId = String(formData.get("mediaId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (
    !z.uuid().safeParse(mediaId).success ||
    (direction !== "up" && direction !== "down")
  ) {
    backTo(businessId, "invalid");
  }

  const result = await moveBusinessGalleryMedia({
    businessId,
    mediaId,
    direction,
  });
  backTo(businessId, result.status);
}

export async function removeMediaAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await readAuthorisedEditor(businessId))) {
    backTo(businessId, "forbidden");
  }

  const mediaId = String(formData.get("mediaId") ?? "");
  if (!z.uuid().safeParse(mediaId).success) backTo(businessId, "invalid");

  const result = await removeBusinessMedia({ businessId, mediaId });
  backTo(businessId, result.status);
}
