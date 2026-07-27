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

export function normalisePublicEnquiryInput(
  input: PublicEnquiryInput,
): NormalisedPublicEnquiryInput {
  return {
    businessId: input.businessId.trim(),
    kind: input.kind,
    senderName: input.senderName.trim(),
    senderEmail: input.senderEmail?.trim().toLowerCase() ?? "",
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
