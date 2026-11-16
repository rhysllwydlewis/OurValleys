/**
 * The privacy policy wording. Every factual statement here is traced to the
 * code in `docs/120-privacy-policy-evidence.md`, and `privacy-policy.test.ts`
 * checks the retention periods and cookie names against the constants the
 * application actually uses, so the text cannot drift from the behaviour.
 *
 * What is deliberately not here, because it is the owner's to supply and no
 * code can establish it: who the controller is, a contact route, the lawful
 * basis for each purpose, and the safeguard for data held outside the UK.
 * `POLICIES_APPROVED` stays false until those are settled.
 */
/** A body may hold several paragraphs, separated by a blank line. */
export type PolicySection = readonly [heading: string, body: string];

export const privacyPolicySections: readonly PolicySection[] = [
  [
    "What we collect",
    "Your account: your name, your email address and a scrambled (hashed) form of your password, plus your two-step sign-in settings if you turn them on.\n\nWhat you choose to do while signed in: businesses, places, events and searches you save, which notices you want, reports you file and businesses you suggest. Enquiries: if you send an enquiry to a business we keep the name, contact details and message you give and pass them to that business so it can reply.\n\nSecurity records: for each sign-in session we record the time, your IP address and your browser details, so we can protect accounts and investigate misuse. Business owners also give us the information that appears on their listing and website.",
  ],
  [
    "Visits and searches",
    "We record when a business's website is viewed, when it appears in search results, when its offers, events, updates and catalogue entries are opened, and when a visitor uses its telephone, email, directions, booking, order or other links or sends it an enquiry. We also count how often guides and news stories are read. This lets owners and editors see what is useful. These records can include a one-way scrambled fingerprint (a hash) made from the visitor's IP address and browser details, so one person is not counted twice. The IP address itself is not stored in these records, and the fingerprint is not linked to an account. We also keep the words of searches that found nothing, with the filters used and the time, but no name or account, to see which local businesses and services are missing.",
  ],
  [
    "Why we use it",
    "To provide accounts and generated websites, deliver enquiries, protect the platform, respond to corrections and understand whether local discovery creates useful connections. We do not sell personal data and we do not use it for third-party advertising.",
  ],
  [
    "Public and private information",
    "Business owners control structured public business content. Private addresses, evidence, account records and administrative notes are not published through public projections.",
  ],
  [
    "Business suggestions",
    "If you suggest a missing business we store the details you give, and your email address if you choose to add one, in a private record seen only by OurValleys reviewers. We do not publish it or contact the business in your name, and we delete suggestions after twelve months.",
  ],
  [
    "Email",
    "We send service emails, such as confirming your address, resetting a password or passing on an enquiry, through our email provider, Postmark. Each email contains a small image that tells Postmark when the message is opened, so we can see whether emails are arriving and being read. We do not track clicks on the links in our emails. Blocking remote images in your email program stops the open signal.",
  ],
  [
    "Cookies and similar storage",
    "We use only what the site needs to work, and no advertising or cross-site tracking cookies. A sign-in cookie keeps you signed in until you sign out or it expires, and is set only when you sign in. Two language cookies (ov-locale and ov-locale-ui) remember English or Welsh, and a display cookie (ov-display) remembers your display settings; each lasts up to a year and is set only when you choose a language or setting.\n\nYour own device also keeps your recent searches (ov-recent-searches, in local storage, never sent to us) and a short note of which part of the site you came from (ov-nav-from, in session storage, gone when you close the tab). That note is reduced to a broad label, such as the directory or search, and used only to show owners where their visits came from, never your browsing history.\n\nCloudflare, which sits in front of our site, may also give us aggregate figures on visits and performance.",
  ],
  [
    "Your location",
    "Near-me features ask your browser for your location only when you press the button. The position is used in your browser to pick the nearest town or village and is not sent to us or stored; we receive only the name of the place that was chosen.",
  ],
  [
    "Who handles your data",
    "Railway hosts OurValleys and its database, and the service currently runs in the United States. Postmark delivers our emails. Cloudflare passes your requests to our site, protects and speeds it up, and holds the pictures businesses upload. Postmark and Cloudflare also operate outside the UK. We use these providers only to run the service. When you follow a link to another website, that website's own policy applies.",
  ],
  [
    "How long we keep it",
    "Your account details stay until you delete your account.\n\nExpired sign-in session records are removed 30 days after they expire, and unused email-verification records after 7 days. An open enquiry is kept for up to 24 months after it was sent. Once a business closes or archives it, it is kept for 12 months from that date, which can take the total beyond 24 months. Spam is kept for 30 days. Notices you have read are removed after 90 days, records of whether our emails were delivered after 90 days, and the words of searches that found nothing after 90 days.\n\nRecords of how visitors use a business's page are kept for up to 26 months, and counts for guides and news stories for 400 days.\n\nBusiness suggestions are deleted after 12 months. A business that its owners ask us to delete is removed 30 days after the request unless they cancel it.",
  ],
  [
    "Your choices",
    "Account holders can see what we hold, choose which notices they receive, download a copy of their data and delete their account from their privacy page. The only owner of a business must add another owner, or delete the business, before closing their account. Some records may be retained where security, dispute or legal obligations require it, for example the record that a business owner accepted our terms. You can also change profile information and optional marketing preferences from your account settings. If you are unhappy with how your data is handled you can complain to the Information Commissioner's Office (ico.org.uk).",
  ],
  [
    "Changes to this policy",
    "We will update this page when what we do with your data changes.",
  ],
];
