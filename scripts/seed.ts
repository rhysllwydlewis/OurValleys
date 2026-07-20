import { sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../src/lib/database/client";
import { publicDemoAccount } from "../src/lib/demo-account";
import { user } from "../src/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessMembership,
  businessPublication,
  businessSite,
  category,
  openingHoursRule,
  place,
  service,
} from "../src/lib/database/schema/business";
import { scaffoldProof } from "../src/lib/database/schema/scaffold";

const fixtureIds = {
  owner: "00000000-0000-4000-8000-000000000101",
  category: "00000000-0000-4000-8000-000000000201",
  place: "00000000-0000-4000-8000-000000000301",
  business: "00000000-0000-4000-8000-000000000401",
  membership: "00000000-0000-4000-8000-000000000501",
  services: [
    "00000000-0000-4000-8000-000000000601",
    "00000000-0000-4000-8000-000000000602",
    "00000000-0000-4000-8000-000000000603",
  ],
  location: "00000000-0000-4000-8000-000000000701",
  hours: [
    "00000000-0000-4000-8000-000000000710",
    "00000000-0000-4000-8000-000000000711",
    "00000000-0000-4000-8000-000000000712",
    "00000000-0000-4000-8000-000000000713",
    "00000000-0000-4000-8000-000000000714",
    "00000000-0000-4000-8000-000000000715",
    "00000000-0000-4000-8000-000000000716",
  ],
  site: "00000000-0000-4000-8000-000000000801",
  publication: "00000000-0000-4000-8000-000000000901",
} as const;

const publishedAt = new Date("2026-07-19T12:00:00.000Z");

async function seedScaffoldProof() {
  const database = getDatabase();
  await database
    .insert(scaffoldProof)
    .values({
      proofKey: "database",
      proofValue: "PostgreSQL and Drizzle are connected.",
    })
    .onConflictDoUpdate({
      target: scaffoldProof.proofKey,
      set: {
        proofValue: "PostgreSQL and Drizzle are connected.",
        updatedAt: sql`now()`,
      },
    });
}

async function seedFictionalBusiness() {
  const database = getDatabase();

  await database
    .insert(user)
    .values({
      id: fixtureIds.owner,
      name: "Demo Business Owner",
      email: "owner@cwm-coil.example",
      emailVerified: true,
    })
    .onConflictDoUpdate({
      target: user.id,
      set: {
        name: "Demo Business Owner",
        emailVerified: true,
        updatedAt: sql`now()`,
      },
    });

  await database
    .insert(user)
    .values({
      id: publicDemoAccount.userId,
      name: publicDemoAccount.name,
      email: publicDemoAccount.email,
      emailVerified: true,
    })
    .onConflictDoUpdate({
      target: user.id,
      set: {
        name: publicDemoAccount.name,
        email: publicDemoAccount.email,
        emailVerified: true,
        updatedAt: sql`now()`,
      },
    });

  await database
    .insert(category)
    .values({
      id: fixtureIds.category,
      name: "Plumbing & Heating",
      slug: "plumbing-heating",
      description: "Local heating, plumbing and home comfort services.",
      sortOrder: 10,
    })
    .onConflictDoUpdate({
      target: category.id,
      set: {
        name: "Plumbing & Heating",
        description: "Local heating, plumbing and home comfort services.",
        status: "active",
        updatedAt: sql`now()`,
      },
    });

  await database
    .insert(place)
    .values({
      id: fixtureIds.place,
      canonicalName: "Tonypandy",
      welshName: "Tonypandy",
      slug: "tonypandy",
      placeType: "town",
      coverageStatus: "seeding",
      editorialSummary:
        "A fictional launch fixture representing local discovery in the Rhondda.",
    })
    .onConflictDoUpdate({
      target: place.id,
      set: {
        canonicalName: "Tonypandy",
        coverageStatus: "seeding",
        status: "active",
        updatedAt: sql`now()`,
      },
    });

  await database
    .insert(business)
    .values({
      id: fixtureIds.business,
      tradingName: "Cwm & Coil Heating",
      legalNamePrivate: "Cwm & Coil Heating Services (Fictional) Ltd",
      slug: "cwm-coil-heating",
      summary:
        "A fictional Rhondda heating business used to prove one trusted local profile can power discovery and a generated website.",
      description:
        "Cwm & Coil Heating is a clearly labelled demonstration business. The fixture shows how a service-area company can present useful services, opening hours and contact choices without publishing a private home address or making unverified claims.",
      primaryCategoryId: fixtureIds.category,
      businessType: "service_area",
      status: "published",
      claimStatus: "claimed",
      verificationSummaryStatus: "unverified",
      publicEmail: "hello@cwm-coil.example",
      preferredLanguage: "en",
      isDemo: true,
      createdByUserId: fixtureIds.owner,
    })
    .onConflictDoUpdate({
      target: business.id,
      set: {
        tradingName: "Cwm & Coil Heating",
        summary:
          "A fictional Rhondda heating business used to prove one trusted local profile can power discovery and a generated website.",
        description:
          "Cwm & Coil Heating is a clearly labelled demonstration business. The fixture shows how a service-area company can present useful services, opening hours and contact choices without publishing a private home address or making unverified claims.",
        status: "published",
        verificationSummaryStatus: "unverified",
        isDemo: true,
        updatedAt: sql`now()`,
      },
    });

  await database
    .insert(businessMembership)
    .values({
      id: fixtureIds.membership,
      businessId: fixtureIds.business,
      userId: fixtureIds.owner,
      role: "owner",
      permissions: [
        "business.view",
        "business.edit_profile",
        "business.publish",
      ],
      status: "active",
      acceptedAt: publishedAt,
    })
    .onConflictDoUpdate({
      target: [businessMembership.businessId, businessMembership.userId],
      set: {
        role: "owner",
        permissions: [
          "business.view",
          "business.edit_profile",
          "business.publish",
        ],
        status: "active",
        acceptedAt: publishedAt,
      },
    });

  await database
    .insert(businessMembership)
    .values({
      id: publicDemoAccount.membershipId,
      businessId: publicDemoAccount.businessId,
      userId: publicDemoAccount.userId,
      role: "viewer",
      permissions: ["business.view"],
      status: "active",
      acceptedAt: publishedAt,
    })
    .onConflictDoUpdate({
      target: [businessMembership.businessId, businessMembership.userId],
      set: {
        role: "viewer",
        permissions: ["business.view"],
        status: "active",
        acceptedAt: publishedAt,
      },
    });

  const services = [
    {
      id: fixtureIds.services[0],
      name: "Boiler care visits",
      description:
        "A demonstration service for routine boiler checks and clear maintenance guidance.",
      priceDisplay: "Contact for a quote",
      sortOrder: 10,
    },
    {
      id: fixtureIds.services[1],
      name: "Heating fault diagnosis",
      description:
        "A structured example of fault-finding support for homes across the local service area.",
      priceDisplay: "Contact for a quote",
      sortOrder: 20,
    },
    {
      id: fixtureIds.services[2],
      name: "Radiator and controls advice",
      description:
        "A fictional consultation covering radiator performance and straightforward heating controls.",
      priceDisplay: "Free initial conversation",
      sortOrder: 30,
    },
  ];

  for (const fixtureService of services) {
    await database
      .insert(service)
      .values({
        ...fixtureService,
        businessId: fixtureIds.business,
        priceType: "quote",
      })
      .onConflictDoUpdate({
        target: service.id,
        set: {
          name: fixtureService.name,
          description: fixtureService.description,
          priceDisplay: fixtureService.priceDisplay,
          status: "active",
          sortOrder: fixtureService.sortOrder,
          updatedAt: sql`now()`,
        },
      });
  }

  await database
    .insert(businessLocation)
    .values({
      id: fixtureIds.location,
      businessId: fixtureIds.business,
      placeId: fixtureIds.place,
      locationType: "service_area_base",
      publicLocality: "Tonypandy",
      privateAddressLineOne: "Fixture Workshop — not a real address",
      privatePostcode: "CF00 0XX",
      publicAddressVisibility: "service_area_only",
      isPrimary: true,
    })
    .onConflictDoUpdate({
      target: businessLocation.id,
      set: {
        placeId: fixtureIds.place,
        locationType: "service_area_base",
        publicAddressLineOne: null,
        publicLocality: "Tonypandy",
        publicPostcode: null,
        privateAddressLineOne: "Fixture Workshop — not a real address",
        privatePostcode: "CF00 0XX",
        publicAddressVisibility: "service_area_only",
        isPrimary: true,
        status: "active",
        updatedAt: sql`now()`,
      },
    });

  const hours = [
    { dayOfWeek: 0, isClosed: true, opensAt: null, closesAt: null },
    { dayOfWeek: 1, isClosed: false, opensAt: "08:00", closesAt: "17:00" },
    { dayOfWeek: 2, isClosed: false, opensAt: "08:00", closesAt: "17:00" },
    { dayOfWeek: 3, isClosed: false, opensAt: "08:00", closesAt: "17:00" },
    { dayOfWeek: 4, isClosed: false, opensAt: "08:00", closesAt: "17:00" },
    { dayOfWeek: 5, isClosed: false, opensAt: "08:00", closesAt: "16:00" },
    { dayOfWeek: 6, isClosed: true, opensAt: null, closesAt: null },
  ];

  for (const [index, hour] of hours.entries()) {
    await database
      .insert(openingHoursRule)
      .values({
        id: fixtureIds.hours[index],
        businessLocationId: fixtureIds.location,
        ...hour,
      })
      .onConflictDoUpdate({
        target: [
          openingHoursRule.businessLocationId,
          openingHoursRule.dayOfWeek,
        ],
        set: {
          opensAt: hour.opensAt,
          closesAt: hour.closesAt,
          isClosed: hour.isClosed,
          updatedAt: sql`now()`,
        },
      });
  }

  await database
    .insert(businessSite)
    .values({
      id: fixtureIds.site,
      businessId: fixtureIds.business,
      templateKey: "local-service-v1",
      status: "published",
      platformPath: "/b/cwm-coil-heating",
      publishedAt,
    })
    .onConflictDoUpdate({
      target: businessSite.businessId,
      set: {
        templateKey: "local-service-v1",
        status: "published",
        platformPath: "/b/cwm-coil-heating",
        publishedAt,
        updatedAt: sql`now()`,
      },
    });

  await database
    .insert(businessPublication)
    .values({
      id: fixtureIds.publication,
      businessId: fixtureIds.business,
      businessSiteId: fixtureIds.site,
      status: "published",
      revisionNumber: 1,
      publishedAt,
      lastReviewedAt: publishedAt,
    })
    .onConflictDoUpdate({
      target: businessPublication.businessId,
      set: {
        businessSiteId: fixtureIds.site,
        status: "published",
        revisionNumber: 1,
        publishedAt,
        lastReviewedAt: publishedAt,
        updatedAt: sql`now()`,
      },
    });
}

async function main() {
  await seedScaffoldProof();
  await seedFictionalBusiness();
  console.info(
    JSON.stringify({
      event: "seed_complete",
      records: 3,
      fictionalBusinessSlug: "cwm-coil-heating",
      publicDemoRole: "viewer",
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
