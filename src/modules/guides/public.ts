export type PublicGuideSection = {
  heading: string;
  body: string;
  href: string;
  linkLabel: string;
};

export type PublicGuide = {
  slug: string;
  title: string;
  summary: string;
  area: string;
  readingTime: string;
  sections: readonly PublicGuideSection[];
};

const representativeGuides = [
  {
    slug: "independent-coffee-across-the-valleys",
    title: "Independent coffee across the Valleys",
    summary:
      "A fictional guide concept showing how residents could combine local cafés, high streets and nearby events.",
    area: "Across Rhondda Cynon Taf",
    readingTime: "4 minute preview",
    sections: [
      {
        heading: "Start with a local search",
        body:
          "Use the business directory to explore published fictional café profiles without treating this preview as a real recommendation.",
        href: "/businesses?q=coffee",
        linkLabel: "Search fictional coffee businesses",
      },
      {
        heading: "Choose an area",
        body:
          "Browse active provisional place routes to understand how local discovery can narrow from the wider Valleys to one community.",
        href: "/places",
        linkLabel: "Explore places",
      },
      {
        heading: "Add something happening nearby",
        body:
          "The events directory demonstrates how a future guide could connect a stop for food or drink with an active local event.",
        href: "/events",
        linkLabel: "Browse fictional events",
      },
    ],
  },
  {
    slug: "a-practical-afternoon-in-porth",
    title: "A practical afternoon in Porth",
    summary:
      "A representative place guide combining useful services, local browsing and a clear route back to the directory.",
    area: "Porth",
    readingTime: "3 minute preview",
    sections: [
      {
        heading: "Explore the place route",
        body:
          "Begin with the provisional Porth page and see only published fictional businesses associated with that active reference-data area.",
        href: "/places/porth",
        linkLabel: "Open the Porth preview",
      },
      {
        heading: "Find something useful",
        body:
          "Search the wider directory when the exact service matters more than a pre-written itinerary or editorial claim.",
        href: "/businesses?place=porth",
        linkLabel: "Search fictional Porth businesses",
      },
      {
        heading: "Keep plans flexible",
        body:
          "Browse the events journey for active fictional listings rather than relying on dates embedded in this provisional guide.",
        href: "/events",
        linkLabel: "Explore upcoming event previews",
      },
    ],
  },
  {
    slug: "valley-trails-for-a-clear-day",
    title: "Valley trails for a clear day",
    summary:
      "A fictional editorial preview for future outdoor discovery content, without presenting unverified route or safety advice.",
    area: "The Valleys",
    readingTime: "5 minute preview",
    sections: [
      {
        heading: "Treat this as a discovery concept",
        body:
          "This baseline does not publish walking directions, access claims or safety guidance. It demonstrates how governed editorial content could be structured.",
        href: "/categories",
        linkLabel: "Browse provisional categories",
      },
      {
        heading: "Use verified local services",
        body:
          "Future guide content can connect residents to published businesses while preserving the platform's existing privacy-safe public projection.",
        href: "/businesses?q=outdoor",
        linkLabel: "Search fictional outdoor businesses",
      },
      {
        heading: "Check what else is nearby",
        body:
          "Place and event routes provide durable discovery paths without inventing real recommendations inside this representative guide.",
        href: "/places",
        linkLabel: "Explore local areas",
      },
    ],
  },
] as const satisfies readonly PublicGuide[];

export function listPublicGuides(): readonly PublicGuide[] {
  return representativeGuides;
}

export function getPublicGuideBySlug(slug: string): PublicGuide | null {
  return representativeGuides.find((guide) => guide.slug === slug) ?? null;
}
