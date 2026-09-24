import { z } from "zod";

/**
 * Managed set of self-declared business attributes (OV-303). Kept as a fixed,
 * in-code catalogue with public labels rather than an admin-editable
 * reference table — the fixed set already satisfies OV-303's "managed
 * definitions" requirement (every attribute has an explanatory public
 * label); admin-authored custom attributes are a larger follow-up.
 *
 * Pure and framework-free so it can be imported from both client and server
 * code (the dashboard's attributes form needs the label/description text at
 * render time) without pulling in server-only database access.
 */
export const businessAttributeDefinitions = [
  {
    key: "stepFreeAccess",
    label: "Step-free access",
    description: "No steps between the entrance and the main service area.",
  },
  {
    key: "accessibleToilet",
    label: "Accessible toilet",
    description: "An accessible toilet is available on site.",
  },
  {
    key: "hearingLoop",
    label: "Hearing loop",
    description: "A hearing loop is available for customers who need one.",
  },
  {
    key: "welshSpeaking",
    label: "Welsh-speaking",
    description: "Staff can serve customers in Welsh.",
  },
  {
    key: "deliveryAvailable",
    label: "Delivery available",
    description: "This business can deliver to customers.",
  },
  {
    key: "collectionAvailable",
    label: "Collection available",
    description: "Orders can be collected from this business.",
  },
  {
    key: "emergencyAvailable",
    label: "Emergency availability",
    description: "This business offers an emergency or 24/7 service.",
  },
  {
    key: "appointmentRequired",
    label: "Appointment required",
    description: "Customers need to book an appointment in advance.",
  },
] as const;

export type BusinessAttributeKey =
  (typeof businessAttributeDefinitions)[number]["key"];

const attributeShape = Object.fromEntries(
  businessAttributeDefinitions.map((definition) => [
    definition.key,
    z.boolean().default(false),
  ]),
) as Record<BusinessAttributeKey, z.ZodDefault<z.ZodBoolean>>;

export const businessAttributesInputSchema = z.object(attributeShape);

export type BusinessAttributeValues = Record<BusinessAttributeKey, boolean>;

/** True attribute definitions only, for public display. */
export function listDeclaredAttributes(
  values: BusinessAttributeValues | null,
): (typeof businessAttributeDefinitions)[number][] {
  if (!values) return [];
  return businessAttributeDefinitions.filter(
    (definition) => values[definition.key],
  );
}
