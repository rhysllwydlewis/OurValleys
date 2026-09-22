import type { BusinessOnboardingDraft } from "./onboarding-draft";
import type { PublicBusinessDetail } from "./types";

const weekdayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export type BusinessSiteProjection = {
  tradingName: string;
  welshName: string | null;
  summary: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  locationDisplay: string | null;
  services: Array<{
    name: string;
    description: string | null;
    priceDisplay: string | null;
  }>;
  openingHours: Array<{ day: string; display: string }>;
  missingSections: Array<"profile" | "location" | "services" | "hours">;
  isComplete: boolean;
};

function projectLocation(
  location: BusinessOnboardingDraft["location"],
): string | null {
  if (!location) return null;

  const addressParts = [
    location.publicAddressLineOne,
    location.publicLocality,
    location.publicPostcode,
  ].filter((part): part is string => Boolean(part));

  if (
    location.publicAddressVisibility === "full_address" &&
    addressParts.length > 0
  ) {
    return addressParts.join(", ");
  }

  if (location.publicLocality) {
    return `Serving ${location.publicLocality} and nearby communities`;
  }

  if (location.locationType === "online") return "Available online";
  return "Serving the local community";
}

export function projectDraftBusinessSite(input: {
  draft: BusinessOnboardingDraft | null;
  fallbackTradingName: string;
}): BusinessSiteProjection {
  const profile = input.draft?.profile ?? null;
  const location = input.draft?.location ?? null;
  const services = input.draft?.services ?? [];
  const hours = input.draft?.hours ?? [];
  const missingSections: BusinessSiteProjection["missingSections"] = [];

  if (!profile) missingSections.push("profile");
  if (!location) missingSections.push("location");
  if (services.length === 0) missingSections.push("services");
  if (hours.length === 0) missingSections.push("hours");

  return {
    tradingName: profile?.tradingName ?? input.fallbackTradingName,
    welshName: null,
    summary: profile?.summary ?? null,
    publicPhone: profile?.publicPhone ?? null,
    publicEmail: profile?.publicEmail ?? null,
    locationDisplay: projectLocation(location),
    services: services.map((service) => ({
      name: service.name,
      description: service.description,
      priceDisplay: service.priceGuidance,
    })),
    openingHours: hours.map((day) => ({
      day: weekdayLabels[day.day] ?? day.day,
      display:
        day.closed || !day.opensAt || !day.closesAt
          ? "Closed"
          : `${day.opensAt}–${day.closesAt}`,
    })),
    missingSections,
    isComplete: missingSections.length === 0,
  };
}

/**
 * Projects the owner's draft preview, falling back to the currently
 * published business for any section the owner hasn't drafted yet. Without
 * this, a business that published before the draft-editing flow existed (or
 * simply hasn't touched a given step) would preview as empty placeholders
 * even though real content is already live.
 */
export function projectDraftBusinessSiteWithPublishedFallback(input: {
  draft: BusinessOnboardingDraft | null;
  published: PublicBusinessDetail | null;
  fallbackTradingName: string;
}): BusinessSiteProjection {
  const profile = input.draft?.profile ?? null;
  const location = input.draft?.location ?? null;
  const services = input.draft?.services ?? [];
  const hours = input.draft?.hours ?? [];
  const published = input.published;

  const missingSections: BusinessSiteProjection["missingSections"] = [];
  if (!profile && !published) missingSections.push("profile");
  if (!location && !published) missingSections.push("location");
  if (services.length === 0 && !published) missingSections.push("services");
  if (hours.length === 0 && !published) missingSections.push("hours");

  return {
    tradingName:
      profile?.tradingName ??
      published?.tradingName ??
      input.fallbackTradingName,
    welshName: published?.welshName ?? null,
    summary: profile?.summary ?? published?.summary ?? null,
    publicPhone: profile?.publicPhone ?? published?.publicPhone ?? null,
    publicEmail: profile?.publicEmail ?? published?.publicEmail ?? null,
    locationDisplay: location
      ? projectLocation(location)
      : (published?.location.display ?? null),
    services:
      services.length > 0
        ? services.map((service) => ({
            name: service.name,
            description: service.description,
            priceDisplay: service.priceGuidance,
          }))
        : (published?.services.map((service) => ({
            name: service.name,
            description: service.description,
            priceDisplay: service.priceDisplay,
          })) ?? []),
    openingHours:
      hours.length > 0
        ? hours.map((day) => ({
            day: weekdayLabels[day.day] ?? day.day,
            display:
              day.closed || !day.opensAt || !day.closesAt
                ? "Closed"
                : `${day.opensAt}–${day.closesAt}`,
          }))
        : (published?.openingHours ?? []),
    missingSections,
    isComplete: missingSections.length === 0,
  };
}

export function projectPublishedBusinessSite(
  business: PublicBusinessDetail,
): BusinessSiteProjection {
  return {
    tradingName: business.tradingName,
    welshName: business.welshName,
    summary: business.summary,
    publicPhone: business.publicPhone,
    publicEmail: business.publicEmail,
    locationDisplay: business.location.display,
    services: business.services.map((service) => ({
      name: service.name,
      description: service.description,
      priceDisplay: service.priceDisplay,
    })),
    openingHours: business.openingHours,
    missingSections: [],
    isComplete: true,
  };
}
