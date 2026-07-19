export type PublicBusinessSummary = {
  id: string;
  slug: string;
  tradingName: string;
  summary: string;
  category: { name: string; slug: string };
  place: { name: string; slug: string };
  verificationStatus: "unverified" | "verified";
  isDemo: boolean;
  updatedAt: Date;
};

export type PublicBusinessService = {
  id: string;
  name: string;
  description: string;
  priceDisplay: string | null;
};

export type PublicOpeningHours = {
  day: string;
  display: string;
};

export type PublicBusinessDetail = PublicBusinessSummary & {
  description: string;
  publicPhone: string | null;
  publicEmail: string | null;
  businessType: string;
  location: {
    type: string;
    display: string;
    addressVisibility: string;
  };
  site: {
    templateKey: string;
    platformPath: string;
    publishedAt: Date;
  };
  services: PublicBusinessService[];
  openingHours: PublicOpeningHours[];
};

export type BusinessDirectoryFilters = {
  query?: string;
  category?: string;
  place?: string;
};

export type BusinessDirectoryResult =
  | { state: "ready"; businesses: PublicBusinessSummary[] }
  | { state: "unavailable"; businesses: [] };

export type PublicBusinessResult =
  | { state: "ready"; business: PublicBusinessDetail }
  | { state: "missing"; business: null }
  | { state: "unavailable"; business: null };
