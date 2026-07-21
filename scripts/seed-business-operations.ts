import { sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../src/lib/database/client";
import { businessTermsAcceptance } from "../src/lib/database/schema/business-governance";
import {
  businessCategorySection,
  businessContactMethod,
  businessEntitlement,
  businessEvent,
  businessLifecycle,
  businessMenuGroup,
  businessMenuItem,
  businessOffer,
} from "../src/lib/database/schema/business-operations";

const ids = {
  owner: "00000000-0000-4000-8000-000000000101",
  business: "00000000-0000-4000-8000-000000000401",
  contactEmail: "00000000-0000-4000-8000-000000001001",
  contactEnquiry: "00000000-0000-4000-8000-000000001002",
  offer: "00000000-0000-4000-8000-000000001101",
  event: "00000000-0000-4000-8000-000000001201",
  menuGroup: "00000000-0000-4000-8000-000000001301",
  menuItem: "00000000-0000-4000-8000-000000001302",
  categorySection: "00000000-0000-4000-8000-000000001303",
  lifecycle: "00000000-0000-4000-8000-000000001304",
  entitlement: "00000000-0000-4000-8000-000000001305",
  termsAcceptance: "00000000-0000-4000-8000-000000001306",
} as const;

const freeCapabilities = [
  "website",
  "directory",
  "contacts",
  "enquiries",
  "offers",
  "events",
  "menu",
  "category_sections",
  "qr",
  "basic_analytics",
] as const;

async function seedBusinessOperations() {
  const database = getDatabase();
  const publishedAt = new Date("2026-07-19T12:00:00.000Z");

  await database.transaction(async (transaction) => {
    await transaction
      .insert(businessContactMethod)
      .values([
        {
          id: ids.contactEmail,
          businessId: ids.business,
          type: "email",
          label: "Email us",
          value: "hello@cwm-coil.example",
          enabled: true,
          isPrimary: false,
          sortOrder: 10,
        },
        {
          id: ids.contactEnquiry,
          businessId: ids.business,
          type: "enquiry",
          label: "Send an enquiry",
          value: "form",
          enabled: true,
          isPrimary: true,
          sortOrder: 20,
        },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(businessOffer)
      .values({
        id: ids.offer,
        businessId: ids.business,
        title: "Free fictional heating check conversation",
        description:
          "A demonstration offer showing how time-sensitive business content appears once on the business website.",
        terms: "Demonstration only. No real service or discount is offered.",
        status: "active",
        sortOrder: 10,
      })
      .onConflictDoUpdate({
        target: businessOffer.id,
        set: { status: "active", updatedAt: sql`now()` },
      });

    await transaction
      .insert(businessEvent)
      .values({
        id: ids.event,
        businessId: ids.business,
        title: "Fictional home-heating question session",
        description:
          "A clearly fictional future event used to prove one event can surface on both the business website and the shared events page.",
        locationDisplay: "Online demonstration event",
        startsAt: new Date("2099-02-14T18:00:00.000Z"),
        endsAt: new Date("2099-02-14T19:00:00.000Z"),
        status: "active",
      })
      .onConflictDoUpdate({
        target: businessEvent.id,
        set: { status: "active", updatedAt: sql`now()` },
      });

    await transaction
      .insert(businessMenuGroup)
      .values({
        id: ids.menuGroup,
        businessId: ids.business,
        name: "Example maintenance options",
        description: "A structured demonstration list, not a real price menu.",
        sortOrder: 10,
      })
      .onConflictDoUpdate({
        target: businessMenuGroup.id,
        set: { status: "active", updatedAt: sql`now()` },
      });

    await transaction
      .insert(businessMenuItem)
      .values({
        id: ids.menuItem,
        businessId: ids.business,
        groupId: ids.menuGroup,
        name: "Demonstration boiler-care visit",
        description: "Fictional structured content used for accessibility testing.",
        priceDisplay: "Contact for guidance",
        dietaryLabels: [],
        available: true,
        featured: true,
        sortOrder: 10,
      })
      .onConflictDoUpdate({
        target: businessMenuItem.id,
        set: { available: true, updatedAt: sql`now()` },
      });

    await transaction
      .insert(businessCategorySection)
      .values({
        id: ids.categorySection,
        businessId: ids.business,
        sectionType: "areas_covered",
        title: "Example areas covered",
        content: {
          entries: [
            {
              title: "Rhondda",
              description: "A fictional service-area example.",
              meta: "Demonstration only",
            },
          ],
        },
        status: "active",
        sortOrder: 10,
      })
      .onConflictDoUpdate({
        target: businessCategorySection.id,
        set: { status: "active", updatedAt: sql`now()` },
      });

    await transaction
      .insert(businessLifecycle)
      .values({
        id: ids.lifecycle,
        businessId: ids.business,
        state: "active",
        lastConfirmedAt: publishedAt,
        nextConfirmationDueAt: new Date("2099-07-19T12:00:00.000Z"),
      })
      .onConflictDoUpdate({
        target: businessLifecycle.businessId,
        set: {
          state: "active",
          lastConfirmedAt: publishedAt,
          nextConfirmationDueAt: new Date("2099-07-19T12:00:00.000Z"),
          updatedAt: sql`now()`,
        },
      });

    await transaction
      .insert(businessEntitlement)
      .values({
        id: ids.entitlement,
        businessId: ids.business,
        planKey: "free",
        capabilities: [...freeCapabilities],
        limits: {
          galleryImages: 12,
          logoImages: 1,
          heroImages: 1,
          teamMembers: 4,
          locations: 1,
          activeOffers: 10,
          activeEvents: 25,
        },
      })
      .onConflictDoUpdate({
        target: businessEntitlement.businessId,
        set: {
          planKey: "free",
          capabilities: [...freeCapabilities],
          limits: {
            galleryImages: 12,
            logoImages: 1,
            heroImages: 1,
            teamMembers: 4,
            locations: 1,
            activeOffers: 10,
            activeEvents: 25,
          },
          updatedAt: sql`now()`,
        },
      });

    await transaction
      .insert(businessTermsAcceptance)
      .values({
        id: ids.termsAcceptance,
        businessId: ids.business,
        acceptedByUserId: ids.owner,
        termsVersion: "2026-07-21-v1",
        acceptedAt: publishedAt,
      })
      .onConflictDoUpdate({
        target: businessTermsAcceptance.businessId,
        set: {
          acceptedByUserId: ids.owner,
          termsVersion: "2026-07-21-v1",
          acceptedAt: publishedAt,
        },
      });
  });
}

seedBusinessOperations()
  .then(async () => {
    console.info("Seeded fictional Phases 7-12 business journeys.");
    await closeDatabase();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await closeDatabase();
    process.exit(1);
  });
