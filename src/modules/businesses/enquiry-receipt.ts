export type EnquiryReceiptInput = {
  businessName: string;
  kind: "enquiry" | "quote" | "callback";
  message: string;
  submittedAt: Date;
};

const kindLabels = {
  enquiry: "enquiry",
  quote: "quote request",
  callback: "callback request",
} as const;

/**
 * Plain-text "copy of your message" receipt for the resident. It carries only
 * what the resident typed plus the business's public name; never the
 * business's private contact details.
 */
export function buildEnquiryReceipt(input: EnquiryReceiptInput): {
  subject: string;
  text: string;
} {
  const kind = kindLabels[input.kind];
  const sent = input.submittedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  return {
    subject: `Your ${kind} to ${input.businessName}`,
    text: [
      `Thanks. OurValleys has passed your ${kind} to ${input.businessName}.`,
      "",
      `Sent: ${sent}`,
      "",
      "Your message:",
      input.message.slice(0, 500),
      "",
      "The business replies using the contact details you gave. Local businesses usually reply within a few days. If you do not hear back, you are welcome to send a new message.",
      "",
      "You received this email because you ticked 'Email me a copy' on the form. We have not stored that choice and will not email you about it again.",
    ].join("\n"),
  };
}
