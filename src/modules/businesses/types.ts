export type PublicBusinessService = {
  id: string;
  name: string;
  description: string | null;
  priceLabel: string | null;
};

export type PublicBusiness = {
  id: string;
  slug: string;
  tradingName: string;
  summary: string;
  description: string | null;
  category: { slug: string; name: string };
  place: { slug: string; name: string } | null;
  locationType: "premises" | "hidden_address" | "service_area" | "online_only";
  publicEmail: string | null;
  publicPhone: string | null;
  publicWebsite: string | null;
  publicAddress: string | null;
  serviceRadiusKm: number | null;
  languages: string[];
  accessibility: string[];
  publishedAt: Date | null;
  updatedAt: Date;
  services: PublicBusinessService[];
};
