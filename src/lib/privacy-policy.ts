/**
 * The privacy policy wording. Every factual statement here is traced to the
 * code in `docs/120-privacy-policy-evidence.md`, and `privacy-policy.test.ts`
 * checks the retention periods and cookie names against the constants the
 * application actually uses, so the text cannot drift from the behaviour.
 *
 * Who the controller is and how to reach them come from the owner's own
 * published policy at vexi.co.uk; the lawful bases and the overseas-transfer
 * safeguards are recorded, with their sources, in docs/120. Nothing here is
 * legal advice, and no registration number is stated because none is known.
 */
/** A body may hold several paragraphs, separated by a blank line. */
export type PolicySection = readonly [heading: string, body: string];

export const privacyPolicySections: readonly PolicySection[] = [
  [
    "Who is responsible for your data",
    "OurValleys is run by VEXI, a sole trader trading as VEXI (vexi.co.uk). VEXI is the controller of the personal data described in this policy, which means it decides why and how that data is used.\n\nTo ask a question about your data or use any of your rights, use the contact form on vexi.co.uk and say you are writing about OurValleys. When you send an enquiry to a business, that business receives your details too and is responsible for how it uses them.",
  ],
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
    "Our legal reasons",
    "UK data protection law lets us use personal data only for a recognised reason. Ours are:\n\nContract, so we can give you what you asked for: running your account, saving the things you choose to save, publishing a business owner's listing and website, and passing an enquiry you send to the business you sent it to.\n\nLegitimate interests, which means running a safe and useful local service where we have weighed this against your rights: the security records kept for each sign-in session, reviewing reports and suggestions, counting visits and searches so owners and editors can see what is useful, keeping the words of searches that found nothing, and the signal that tells us whether a service email was opened. You can object to any of these (see Your rights and choices).\n\nConsent: asking your browser for your location, and any optional marketing preference you switch on. You can withdraw consent at any time, and that does not affect anything done before.\n\nLegal obligation, where the law requires us to keep a record or hand it over, for example to a court or the police.\n\nThe language and display choices you make are stored on your device only because you asked for them. Please do not put sensitive details, such as health information, in an enquiry or a suggestion.",
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
    "Railway hosts OurValleys, its database and the pictures and documents businesses upload, and the service currently runs in the United States. Postmark delivers our emails. Cloudflare passes your requests to our site and protects and speeds it up, and keeps temporary copies of files such as pictures to do so. Postmark and Cloudflare also operate outside the UK. We use these providers only to run the service. When you follow a link to another website, that website's own policy applies.",
  ],
  [
    "Data outside the UK",
    "Railway, which hosts the service and its database, runs in the United States, and Postmark and Cloudflare also handle data outside the UK. The law requires a safeguard when personal data goes to a country without a UK adequacy decision, and each of these providers' data processing terms includes one: standard contractual clauses (with the Information Commissioner's UK addendum where it applies) or the UK Extension to the EU-US Data Privacy Framework. Their terms are published on their websites, and you can ask us if you would like help finding them.",
  ],
  [
    "How long we keep it",
    "Your account details stay until you delete your account.\n\nExpired sign-in session records are removed 30 days after they expire, and unused email-verification records after 7 days. An open enquiry is kept for up to 24 months after it was sent. Once a business closes or archives it, it is kept for 12 months from that date, which can take the total beyond 24 months. Spam is kept for 30 days. Notices you have read are removed after 90 days, records of whether our emails were delivered after 90 days, and the words of searches that found nothing after 90 days.\n\nRecords of how visitors use a business's page are kept for up to 26 months, and counts for guides and news stories for 400 days.\n\nBusiness suggestions are deleted after 12 months. A business that its owners ask us to delete is removed 30 days after the request unless they cancel it.",
  ],
  [
    "Your rights and choices",
    "Under UK data protection law you can ask us to tell you what we hold about you and give you a copy, correct anything wrong, delete your data, restrict how we use it, give you your data in a portable form, and stop uses that rely on our legitimate interests. Where we rely on your consent you can withdraw it at any time.\n\nAccount holders can do most of this themselves from their privacy page: see what we hold, choose which notices they receive, download a copy of their data and delete their account. The only owner of a business must add another owner, or delete the business, before closing their account. You can also change profile information and optional marketing preferences from your account settings. For anything else, or if you do not have an account, use the contact form on vexi.co.uk and say you are writing about OurValleys. We will reply within one month.\n\nSome records may be retained where security, dispute or legal obligations require it, for example the record that a business owner accepted our terms. If you are unhappy with how your data is handled you can complain to the Information Commissioner's Office (ico.org.uk).",
  ],
  [
    "Children",
    "OurValleys is for a general audience and is not designed for children. If you are under 13, please do not create an account. We do not knowingly collect personal data from children under 13, and if you think a child has given us any, contact us and we will delete it.",
  ],
  [
    "Keeping your data safe",
    "Pages are served over an encrypted (HTTPS) connection. Passwords are stored only as a one-way hash. Access to the administration tools requires two-step sign-in. No system is completely secure; if a breach is likely to put your rights at risk we will tell you and the Information Commissioner's Office, as the law requires.",
  ],
  [
    "Changes to this policy",
    "We will update this page when what we do with your data changes. Last updated: 17 November 2026.",
  ],
];
