export type PublicBusinessRatingSummary = {
  average: number | null;
  count: number;
};

export type PublicBusinessCardImage = {
  url: string;
  focalX: number;
  focalY: number;
};

export type PublicBusinessSummary = {
  id: string;
  slug: string;
  tradingName: string;
  welshName: string | null;
  summary: string;
  category: { name: string; slug: string };
  place: { name: string; slug: string };
  verificationStatus: "unverified" | "verified";
  isDemo: boolean;
  updatedAt: Date;
  rating: PublicBusinessRatingSummary;
  /** The business's active hero (preferred) or logo photo, for listing cards. */
  cardImage?: PublicBusinessCardImage | null;
  /**
   * Distance in kilometres from the `nearPlace` filter's locality centroid,
   * when that filter is active and the business's place has a stored
   * coordinate. Null otherwise.
   */
  distanceKm: number | null;
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
  openNow?: boolean;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
  /** Reference time for the `openNow` filter. Defaults to the current time. */
  now?: Date;
  /**
   * Slug of a place to search near, ordering and filtering results by
   * distance from that place's locality centroid rather than exact place
   * match. Independent of `place`.
   */
  nearPlace?: string;
  /** Search radius in kilometres, only meaningful alongside `nearPlace`. */
  radiusKm?: number;
};

export type BusinessDirectoryResult =
  | {
      state: "ready";
      businesses: PublicBusinessSummary[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    }
  | {
      state: "unavailable";
      businesses: [];
      page: 1;
      pageSize: number;
      total: 0;
      totalPages: 0;
      hasPreviousPage: false;
      hasNextPage: false;
    };

export type PublicBusinessResult =
  | { state: "ready"; business: PublicBusinessDetail }
  | { state: "missing"; business: null }
  | { state: "unavailable"; business: null };
