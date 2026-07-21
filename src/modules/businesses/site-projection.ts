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

export function projectPublishedBusinessSite(
  business: PublicBusinessDetail,
): BusinessSiteProjection {
  return {
    tradingName: business.tradingName,
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
