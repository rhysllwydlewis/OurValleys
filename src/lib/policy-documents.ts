import type { PolicySection } from "./privacy-policy";

/**
 * The terms of use and the four shorter policies. The structure of the terms
 * follows the owner's Event Flow terms (VEXI, sole trader), with everything
 * that does not exist on OurValleys left out: there is no marketplace, no
 * payment and no public reviews or forum here, so none is promised.
 * `docs/121-policy-set-evidence.md` traces each factual statement, and
 * `policy-documents.test.ts` checks the ones that name a feature, a route or
 * a number against the code, so the text cannot drift from the product.
 *
 * Contact is the form on vexi.co.uk, as in the privacy policy: the site has no
 * mailbox of its own. Nothing here is legal advice.
 */

const CONTACT =
  "use the contact form on vexi.co.uk and say you are writing about OurValleys";

export const termsSections: readonly PolicySection[] = [
  [
    "Who we are and what these terms cover",
    "OurValleys is run by VEXI, a sole trader trading as VEXI (vexi.co.uk). These terms apply whenever you use the OurValleys website and its tools, whether you only browse or have an account. They work together with our privacy policy, content guidelines, complaints and corrections policy, advertising policy and accessibility statement, which you can find in the footer of every page.\n\nWhen you create an account you confirm that you accept these terms. If you do not accept them, please do not create an account.",
  ],
  [
    "What OurValleys is",
    "OurValleys is a free local guide to the valleys: a directory of businesses, places, events and offers, with guides and local news headlines, and tools that let a business publish its own page and a simple website.\n\nWe are an intermediary. We do not sell the goods or services that businesses list, we are not a party to anything you agree with a business, and a listing is not a recommendation. Businesses are responsible for what they publish about themselves, and we do not check every statement.",
  ],
  [
    "Who can use it",
    "Anyone can browse OurValleys. To create an account you must be at least 13. To create or manage a business listing, or to accept these terms on behalf of a business, you must be at least 18 and have the authority to act for that business. If you are under 18 and have an account, you should have a parent or guardian's permission. We may close an account we have good reason to think breaks these rules.",
  ],
  [
    "Your account",
    "Give us accurate details and keep them up to date. You are responsible for what happens under your account, so keep your password private, use a strong one that you do not use anywhere else, and turn on two-step sign-in in your account settings. Tell us promptly if you think someone else has used your account.\n\nYou must not use another person's account, pretend to be someone else, or open several accounts to get round a restriction.",
  ],
  [
    "Business listings and website tools",
    "If you list or manage a business you confirm that you have the authority to do so and that what you publish is accurate, current and not misleading. Keep it that way, especially opening hours, contact details, offers and events. Use your real trading name, do not claim awards, qualifications, verification, availability or endorsements you cannot support, and follow the law that applies to your business, including consumer protection and advertising rules.\n\nYour website is built from structured fields and approved design controls. You cannot add scripts or unrestricted HTML. Where we mark a listing as verified, that is a label about specific checks we have made, described on the listing. It is not a guarantee of quality or an endorsement, and paying for anything never buys it. Sponsored or promoted content is always labelled (see the advertising policy).",
  ],
  [
    "Content you submit",
    "Content you submit includes business information, pictures, menus and other documents, events, offers, updates, enquiries, reports and suggestions. You keep ownership of it. You confirm that you own it or have permission to publish it, and that it follows these terms and the content guidelines.\n\nYou give us a non-exclusive, worldwide, royalty-free licence to host, store, copy, format, resize, display and distribute it as needed to run OurValleys. That includes showing it on your listing and generated website, in search results, in link previews, and on our maps and guides, and keeping backups. The licence ends when you delete the content, except that we may keep limited copies for backups, security, legal obligations, dispute handling and legal claims for the periods set out in the privacy policy.",
  ],
  [
    "Using OurValleys properly",
    "You agree not to: break the law; publish content that is unlawful, threatening, abusive, discriminatory, harassing, sexually exploitative, defamatory or deliberately deceptive; claim a business that is not yours or impersonate a person or business; collect data from the site with automated tools, or build a competing directory from it, without our written permission; interfere with or overload the site, or try to get round its security or its permissions; upload malicious code; send spam or unsolicited marketing through the enquiry tools; or try to see another person's or business's private information.\n\nWe want everyone to feel welcome, so we do not allow content or conduct that targets people because of a protected characteristic such as race, religion, disability, sex, sexual orientation, gender identity, age or national origin.",
  ],
  [
    "Enquiries and messages",
    "When you send an enquiry we pass the details you give to that business so it can reply, and from then on the business is responsible for how it uses them. We cannot promise that a business will reply, or that it can supply what it advertises.\n\nBusinesses must use enquiry details only to deal with the enquiry, must not add people to marketing lists without their consent, and must keep what they receive secure. Please do not put sensitive information, such as health details, in an enquiry.",
  ],
  [
    "Reports, corrections and moderation",
    "You can report a listing, event, offer or update that you believe is inaccurate, unlawful or harmful, using the report control on that page. A report asks us to review the content; it does not change it by itself.\n\nWe may remove, hide, edit, restrict or refuse content, and may restrict or close accounts, where we reasonably think they break these terms or the law, put people at risk or mislead others. Where it is safe and practical we will tell the person affected why, and how to challenge the decision. To report illegal content, or to challenge a decision, see the complaints and corrections policy.",
  ],
  [
    "Our content and intellectual property",
    "The OurValleys name and logo, the design, the guides and the software are ours or used under licence. You may use the site for your own personal, non-commercial purposes and may share links to its pages. You must not copy, republish or sell its content, or build on it commercially, without our written permission.\n\nLocal news headlines and their links belong to their publishers and are shown with attribution; we do not own them. Some listings on the site are fictional demonstrations and are labelled as such. They are not real businesses or events.",
  ],
  [
    "Links and third parties",
    "We link to other websites, and businesses publish links to their own booking, ordering and social pages. We do not control them and are not responsible for their content, security or privacy practices. Check their terms before you rely on them or buy from them.",
  ],
  [
    "Fees",
    "OurValleys is free to use at the moment, and payments and a marketplace are not available. If we introduce a paid feature we will show the price, what it includes and how to cancel before you pay, and we will update these terms. Nothing you pay for can change whether a listing is marked as verified.",
  ],
  [
    "Availability and changes to the service",
    "We work to keep OurValleys available and accurate, but we do not promise that it will always be available, error-free or up to date. We may change, suspend or withdraw any part of it, and will give notice where we reasonably can.\n\nInformation on the site comes largely from businesses and other sources and can be out of date. Check important details, such as opening times, directly with the business before you travel or pay.",
  ],
  [
    "Our responsibility to you",
    "Nothing in these terms limits liability that the law does not allow to be limited, including liability for death or personal injury caused by negligence, and for fraud or fraudulent misrepresentation. Your legal rights as a consumer are not affected: under the Consumer Rights Act 2015 services must be provided with reasonable care and skill. For general advice about your rights see Citizens Advice (citizensadvice.org.uk).\n\nSubject to that, we are not responsible for what businesses or other users publish or do, for dealings between you and a business, or for loss that was not a foreseeable result of our breach. If you use OurValleys for business purposes, we are not liable for loss of profit, revenue, business, data or goodwill, or for indirect or consequential loss, and our total liability to you in connection with the service is limited to £100.",
  ],
  [
    "Suspending or ending your use",
    "You can stop using OurValleys at any time, and you can delete your account from your privacy page (the privacy policy explains what happens to your data). We may suspend or end your access, or restrict particular features, where reasonably necessary to enforce these terms, protect people or the service, investigate abuse or comply with the law. A business that its owners ask us to delete is removed after the recovery period set out in the privacy policy.\n\nTerms that by their nature should carry on after you stop using the service, such as those on content, intellectual property, liability and governing law, do.",
  ],
  [
    "Complaints and contact",
    `To contact us, report a problem or make a complaint, ${CONTACT}. Tell us the page address, what the problem is and what you would like us to do. We aim to reply within 10 working days. VEXI is a sole trader trading as VEXI, United Kingdom.`,
  ],
  [
    "General",
    "These terms, with the policies they refer to, are the whole agreement between you and us about OurValleys. If part of them cannot be enforced, the rest still applies. If we do not enforce a term straight away, we have not given up the right to. You may not transfer your rights under these terms. Nobody other than you and us has a right to enforce them. Using OurValleys does not make you our partner, agent or employee.",
  ],
  [
    "Governing law",
    "These terms, and any dispute about them, are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you are a consumer living in Scotland or Northern Ireland you may also bring a claim in the courts where you live.",
  ],
  [
    "Changes to these terms",
    "We may update these terms, for example when we add a feature or the law changes. We will change the date below and tell account holders about important changes. If you keep using OurValleys after a change, you accept the new terms. Last updated: 18 November 2026.",
  ],
];

export const accessibilitySections: readonly PolicySection[] = [
  [
    "Our commitment",
    "We want OurValleys to work for everyone, including people who use keyboards, screen readers, magnifiers or voice control, people with dyslexia or low vision, people with limited dexterity, and people who are sensitive to motion. We build to the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, and we treat an accessibility problem as a defect to fix, not an optional extra.",
  ],
  [
    "What we do",
    "Pages can be used with a keyboard alone, with a visible focus marker. Headings, landmarks and form labels give each page a clear structure. Errors and confirmations are written in words, not shown by colour alone. Animation follows the reduced-motion setting on your device. Layouts work from small phones to wide screens and when you zoom in.\n\nAutomated accessibility checks run on key pages with every change to the code, and before a new feature is released we also try it by hand with the keyboard, at phone and desktop sizes, with reduced motion, and in its loading, empty, error and success states.",
  ],
  [
    "Make the site comfortable for you",
    "The display settings let you change the text size, contrast, motion, spacing and typeface. Your choices are remembered on your device, and you can reach them from the link below.",
  ],
  [
    "Language",
    "OurValleys is available in English and Welsh. The wording of our policies is currently English only; a Welsh version will follow once a fluent Welsh speaker has checked it.",
  ],
  [
    "Known limits",
    "We have not yet had an independent accessibility audit. Some content is outside our direct control: pictures and documents uploaded by businesses, such as PDF menus, may be harder to use than the rest of the site. We ask for a description of every uploaded picture and encourage accessible documents, but we cannot guarantee them. News headlines come from their publishers. The interactive map can be used with a keyboard, and its places are also listed in text. Some of the Welsh translation may still need review.",
  ],
  [
    "Tell us about a problem",
    `If you cannot use part of OurValleys, ${CONTACT}. Tell us the page address, what you were trying to do, your device and browser, and any assistive technology you use. We aim to reply within 5 working days and to fix problems that stop people completing a task as a priority. We can also give you information in another format if you ask.`,
  ],
  [
    "If you are not satisfied",
    "If you are not happy with our reply you can contact the Equality Advisory and Support Service (equalityadvisoryservice.com), which gives advice on discrimination and equality. This statement was prepared on 18 November 2026. We will review it when the site changes significantly and at least once a year.",
  ],
];

export const contentGuidelinesSections: readonly PolicySection[] = [
  [
    "Useful and specific",
    "Content should help a resident understand what is offered, where it is available, how to make contact and whether important restrictions apply.",
  ],
  [
    "No unsupported claims",
    "Do not claim verification, awards, popularity, availability, qualifications or endorsements without an appropriate basis. Prices, discounts and comparisons must be true when you publish them, and an offer must say its conditions and end date.",
  ],
  [
    "Rights and consent",
    "Only upload text and media you own, are licensed to use or have permission to publish. Do not publish personal information about another person, such as a customer or a member of staff, without a good reason and their agreement, and take particular care with children.",
  ],
  [
    "Pictures and documents",
    "Give every picture a short description for people who cannot see it. Show the real business, product or place; do not present someone else's photograph or a stock image as your own. Menus and other documents should be readable and kept up to date. Uploads are limited to common picture formats and PDF files.",
  ],
  [
    "Offers, events and updates",
    "Publish only offers and events that are real, with the true date, time, place and conditions. Take them down or update them when they end, change or are cancelled. A misleading offer, a fake event or a price you do not honour is a breach of these guidelines.",
  ],
  [
    "Prohibited content",
    "Unlawful, threatening, abusive, discriminatory, harassing, sexually exploitative, defamatory, fraudulent, malicious or deliberately deceptive content is not permitted. Neither is content that infringes someone else's rights, that exposes personal information, or that contains malicious code or unsolicited marketing.",
  ],
  [
    "Sponsored and promotional content",
    "Anything paid for, sponsored or part of a commercial partnership must be clearly labelled. See the advertising policy.",
  ],
  [
    "If content breaks these guidelines",
    "We may ask you to change it, or hide, edit or remove it, and repeated or serious breaches can lead to restrictions on an account. Where it is safe and practical we will tell you why and how to challenge the decision, using the complaints and corrections policy.",
  ],
  [
    "Reporting content",
    "Use the report control on the listing, event, offer or update. To report something you believe is illegal, or if no report control is available, see the complaints and corrections policy.",
  ],
];

export const correctionsSections: readonly PolicySection[] = [
  [
    "Incorrect business information",
    "Use the report control on the relevant business page where available. A report does not overwrite business information automatically; it creates a reviewable correction record. If you own the business you can correct your own listing at any time from your dashboard.",
  ],
  [
    "Editorial corrections",
    "Identify the page, the statement and the evidence supporting the correction you want. We record material corrections, and do not silently disguise them.",
  ],
  [
    "Account or moderation decisions",
    "Give the reference or page address and explain the outcome you want. We will ask someone able to reconsider the original evidence and decision to review it.",
  ],
  [
    "Reporting illegal content",
    `If you believe content on OurValleys is illegal, ${CONTACT}, and give the page address, what you believe is unlawful and why. We look at reports of illegal content first and may remove content while we decide.`,
  ],
  [
    "How to complain",
    "To make a complaint, use the contact form on vexi.co.uk and say you are writing about OurValleys. Include the page address, what went wrong and what you would like us to do. We aim to acknowledge a complaint within 5 working days and to send a full reply within 20 working days.",
  ],
  [
    "Privacy and data requests",
    "Questions about your personal data, or a request to see, correct or delete it, are covered by the privacy policy, which also explains how to complain to the Information Commissioner's Office.",
  ],
  [
    "If you are still not satisfied",
    "You can ask us to review our reply again. We cannot settle a dispute between you and a business, but Citizens Advice (citizensadvice.org.uk) can help with consumer problems, and the Equality Advisory and Support Service (equalityadvisoryservice.com) with accessibility and equality.",
  ],
  [
    "Urgent risk",
    "Do not use an ordinary correction form for an immediate threat to life or safety. Contact the appropriate emergency service first.",
  ],
];

export const advertisingSections: readonly PolicySection[] = [
  [
    "Clear labels",
    "Paid placements, sponsorship and commercial partnerships must be labelled so a reasonable user can distinguish them from organic results and editorial selections.",
  ],
  [
    "No hidden pay-to-rank",
    "Payment must not secretly alter organic search ranking. Sponsored inventory should use a separate, documented placement rule.",
  ],
  [
    "Paid is not verified",
    "Payment never earns a verified label. Verification is separate, and is based on the checks described on the listing.",
  ],
  [
    "Eligibility",
    "Advertising must follow the content guidelines, must be legal, honest and truthful, and must not imply verification or endorsement by OurValleys. We may refuse or remove advertising that misleads, or that is aimed at children where that would be inappropriate.",
  ],
  [
    "Editorial independence",
    "Guides and stories are written independently of advertisers. A sponsored guide or story carries a clear disclosure of the sponsorship.",
  ],
  [
    "Measurement",
    "Commercial reporting uses proportionate, privacy-conscious events and does not need unnecessary personal profiling. We do not sell personal data and we do not use it for third-party advertising.",
  ],
  [
    "Where things stand",
    "At the time of writing OurValleys does not take payment for placement. If that changes, this policy applies from the first paid placement and we will update it.",
  ],
  [
    "Reporting a concern",
    `If you think something is advertising and is not labelled, or an advert is misleading, ${CONTACT}.`,
  ],
];
