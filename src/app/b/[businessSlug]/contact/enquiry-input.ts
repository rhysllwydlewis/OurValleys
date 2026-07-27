export const publicEnquiryKinds = ["enquiry", "quote", "callback"] as const;

export type PublicEnquiryKind = (typeof publicEnquiryKinds)[number];

export type PublicEnquiryInput = {
  businessId: string;
  kind: PublicEnquiryKind;
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  message: string;
  preferredTime?: string;
  consentAccepted: boolean;
  website?: string;
};

export type NormalisedPublicEnquiryInput = {
  businessId: string;
  kind: PublicEnquiryKind;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  message: string;
  preferredTime: string;
  consentAccepted: boolean;
  website: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === "string" || value === undefined;
}

function normaliseEmailAddress(value: string): string {
  const trimmed = value.trim();
  const separatorIndex = trimmed.lastIndexOf("@");

  if (separatorIndex <= 0) return trimmed;

  return `${trimmed.slice(0, separatorIndex)}@${trimmed
    .slice(separatorIndex + 1)
    .toLowerCase()}`;
}

export function normalisePublicEnquiryInput(
  input: unknown,
): NormalisedPublicEnquiryInput | null {
  if (
    !isRecord(input) ||
    typeof input.businessId !== "string" ||
    typeof input.kind !== "string" ||
    !publicEnquiryKinds.includes(input.kind as PublicEnquiryKind) ||
    typeof input.senderName !== "string" ||
    !isOptionalString(input.senderEmail) ||
    !isOptionalString(input.senderPhone) ||
    typeof input.message !== "string" ||
    !isOptionalString(input.preferredTime) ||
    typeof input.consentAccepted !== "boolean" ||
    !isOptionalString(input.website)
  ) {
    return null;
  }

  return {
    businessId: input.businessId.trim(),
    kind: input.kind as PublicEnquiryKind,
    senderName: input.senderName.trim(),
    senderEmail: normaliseEmailAddress(input.senderEmail ?? ""),
    senderPhone: input.senderPhone?.trim() ?? "",
    message: input.message.trim(),
    preferredTime: input.preferredTime?.trim() ?? "",
    consentAccepted: input.consentAccepted,
    website: input.website ?? "",
  };
}

export function isAutomatedPublicEnquiry(
  input: NormalisedPublicEnquiryInput,
): boolean {
  return input.website.length > 0;
}
