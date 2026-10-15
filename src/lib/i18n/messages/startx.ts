/**
 * Strings added by the start-your-business overhaul (`/account/new-business`
 * and `/claim/[businessId]`): the guided steps, the live "already listed?"
 * check, the starter-website preview and the claim page's explanation. Spread
 * into the main catalogues. Welsh is first-draft and needs review by a fluent
 * Welsh speaker before launch.
 */
export const startxEn = {
  "startx.progress": "{done} of {total} steps done",
  "startx.progressReady": "All steps done — ready to create",
  "startx.step.name.title": "Name your business",
  "startx.step.name.hint": "Use the name customers already know you by.",
  "startx.step.category.title": "What does it do?",
  "startx.step.category.hint":
    "Pick the closest fit. It sets how your starter website is laid out.",
  "startx.step.place.title": "Where is it based?",
  "startx.step.place.hint":
    "A town or area. Your private address is never published without your say-so.",
  "startx.step.reach.title": "How do customers reach you?",
  "startx.step.reach.hint":
    "This decides whether we show a location, a service area or neither.",
  "startx.welshToggle": "Add a Welsh name",
  "startx.categoryFilter": "Narrow the categories",
  "startx.categoryFilterPlaceholder": "Type, for example café or plumber",
  "startx.categoryNone": "No category matches “{query}”.",
  "startx.categoryGroupAria": "Business category",
  "startx.reach.premises.title": "Customers visit us",
  "startx.reach.premises.body":
    "A shop, café, salon or venue with a public address.",
  "startx.reach.serviceArea.title": "We travel to customers",
  "startx.reach.serviceArea.body":
    "Trades and mobile services across an area. Your home address stays private.",
  "startx.reach.online.title": "Mostly online",
  "startx.reach.online.body": "Customers find you, enquire and order online.",

  "startx.match.checking": "Checking whether it is already listed…",
  "startx.match.none":
    "No similar business is listed yet, so you are good to carry on.",
  "startx.match.limited":
    "Too many checks just now. You can carry on; we check again when you create it.",
  "startx.match.error":
    "We could not check for duplicates just now. You can carry on; we check again when you create it.",
  "startx.match.title": "Is your business already listed?",
  "startx.match.lead":
    "These published businesses look like it. If one is yours, claim it instead of starting a second listing.",
  "startx.match.exact": "Same name",
  "startx.match.close": "Very similar",
  "startx.match.possible": "Possible match",
  "startx.match.view": "View listing",
  "startx.match.claim": "Claim this business",
  "startx.match.notMine": "None of these is mine",
  "startx.match.confirmed":
    "Understood. We will create a separate listing for you.",
  "startx.match.mustConfirm":
    "Check whether your business is already listed, then choose “None of these is mine” to carry on.",
  "startx.match.count": "{count} similar businesses found.",
  "startx.error.category": "Choose what the business does to carry on.",

  "startx.preview.title": "Your starter website",
  "startx.preview.aria": "Preview of your starter website",
  "startx.preview.namePlaceholder": "Your business name",
  "startx.preview.categoryPlaceholder":
    "Pick a category to see how your site is laid out",
  "startx.preview.opensWith": "Sections, in this order",
  "startx.preview.design": "Design: {name}",
  "startx.preview.note":
    "This is how your starter site begins. Each section appears once you add its details, and you can change the design, words and pictures whenever you like.",
  "startx.template.standard": "Fresh & clear",
  "startx.template.warm": "Warm welcome",
  "startx.template.bold": "Bold & direct",
  "startx.variant.hospitality": "A warm local welcome",
  "startx.variant.trades": "Trusted local expertise",
  "startx.variant.wellbeing": "Care, confidence and wellbeing",
  "startx.variant.retail": "Independent local retail",
  "startx.variant.professional": "Local professional expertise",
  "startx.variant.community": "Rooted in the community",
  "startx.variant.general": "Independent local business",
  "startx.section.about": "About",
  "startx.section.services": "Services",
  "startx.section.gallery": "Gallery",
  "startx.section.location": "Location",
  "startx.section.hours": "Opening hours",
  "startx.section.contact": "Contact",
  "startx.section.offers": "Offers",
  "startx.section.events": "Events",
  "startx.section.menu": "Menu",
  "startx.section.accessibility": "Accessibility",

  "startx.benefits.title": "What you get, free",
  "startx.benefits.one":
    "A website of your own, listed in local search and on the map.",
  "startx.benefits.two":
    "A private preview first. Nothing is public until you publish.",
  "startx.benefits.three":
    "Your private address and contact details stay private unless you choose to show them.",
  "startx.benefits.four":
    "Edit any time in English and Welsh. No code and no fees.",
  "startx.submit.hint": "This creates a private draft. Nothing is public yet.",
  "startx.unverified.title": "Verify your email to carry on",
  "startx.unverified.body":
    "We need to confirm your email address before you can create a business. Use the link we emailed you, or send a fresh one.",
  "startx.unverified.cta": "Go to account settings",
  "startx.error.unverified":
    "Your email address is not verified yet. Verify it, then try again.",

  "startx.claim.summaryTitle": "You are claiming",
  "startx.claim.viewListing": "View the public listing",
  "startx.claim.nextTitle": "What happens next",
  "startx.claim.next1.title": "We review your request",
  "startx.claim.next1.body":
    "A member of the OurValleys team reads it and checks it against what is listed.",
  "startx.claim.next2.title": "We may ask for proof",
  "startx.claim.next2.body":
    "For example a link to your official page or a number to call back. We never publish what you send.",
  "startx.claim.next3.title": "You get access",
  "startx.claim.next3.body":
    "Once approved you can edit the listing and its website from your account.",
  "startx.claim.privacy":
    "What you write here is seen only by the review team.",
  "startx.claim.notYoursTitle": "Not the right business?",
  "startx.claim.notYoursCta": "Start a separate listing",
  "startx.claim.signInTitle": "Sign in to send your request",
  "startx.claim.signInBody":
    "You need an account so we know who to reply to. Sign in, or create a free account from the sign-in page, then come back to this page.",
  "startx.claim.signInCta": "Sign in",
  "startx.claim.reasonHint":
    "Say how you are connected, for example “I own it and have run it since 2019”.",
} as const;

export const startxCy = {
  "startx.progress": "{done} o {total} cam wedi’u gwneud",
  "startx.progressReady": "Pob cam wedi’i wneud — barod i greu",
  "startx.step.name.title": "Enwch eich busnes",
  "startx.step.name.hint":
    "Defnyddiwch yr enw y mae cwsmeriaid eisoes yn eich adnabod wrtho.",
  "startx.step.category.title": "Beth mae’n ei wneud?",
  "startx.step.category.hint":
    "Dewiswch y mwyaf addas. Mae’n pennu cynllun eich gwefan gychwynnol.",
  "startx.step.place.title": "Ble mae wedi’i leoli?",
  "startx.step.place.hint":
    "Tref neu ardal. Ni chyhoeddir eich cyfeiriad preifat heb eich caniatâd.",
  "startx.step.reach.title": "Sut mae cwsmeriaid yn eich cyrraedd?",
  "startx.step.reach.hint":
    "Mae hyn yn penderfynu a ddangoswn leoliad, ardal wasanaeth neu’r un o’r ddau.",
  "startx.welshToggle": "Ychwanegu enw Cymraeg",
  "startx.categoryFilter": "Culhau’r categorïau",
  "startx.categoryFilterPlaceholder":
    "Teipiwch, er enghraifft caffi neu blymwr",
  "startx.categoryNone": "Does dim categori’n cyfateb i “{query}”.",
  "startx.categoryGroupAria": "Categori’r busnes",
  "startx.reach.premises.title": "Mae cwsmeriaid yn ymweld â ni",
  "startx.reach.premises.body":
    "Siop, caffi, salon neu leoliad â chyfeiriad cyhoeddus.",
  "startx.reach.serviceArea.title": "Rydym yn teithio at gwsmeriaid",
  "startx.reach.serviceArea.body":
    "Crefftwyr a gwasanaethau symudol ar draws ardal. Mae cyfeiriad eich cartref yn aros yn breifat.",
  "startx.reach.online.title": "Ar-lein yn bennaf",
  "startx.reach.online.body":
    "Mae cwsmeriaid yn eich canfod, yn holi ac yn archebu ar-lein.",

  "startx.match.checking": "Gwirio a yw eisoes wedi’i restru…",
  "startx.match.none":
    "Nid oes busnes tebyg wedi’i restru eto, felly gallwch fwrw ymlaen.",
  "startx.match.limited":
    "Gormod o wiriadau ar hyn o bryd. Gallwch fwrw ymlaen; byddwn yn gwirio eto pan fyddwch yn ei greu.",
  "startx.match.error":
    "Ni allem wirio am ddyblygiadau ar hyn o bryd. Gallwch fwrw ymlaen; byddwn yn gwirio eto pan fyddwch yn ei greu.",
  "startx.match.title": "A yw eich busnes eisoes wedi’i restru?",
  "startx.match.lead":
    "Mae’r busnesau cyhoeddedig hyn yn edrych fel eich busnes chi. Os yw un yn eiddo i chi, hawliwch ef yn hytrach na dechrau ail restriad.",
  "startx.match.exact": "Yr un enw",
  "startx.match.close": "Tebyg iawn",
  "startx.match.possible": "Cyfatebiaeth bosibl",
  "startx.match.view": "Gweld y rhestriad",
  "startx.match.claim": "Hawlio’r busnes hwn",
  "startx.match.notMine": "Nid yw’r un o’r rhain yn eiddo i mi",
  "startx.match.confirmed": "Deall. Byddwn yn creu rhestriad ar wahân i chi.",
  "startx.match.mustConfirm":
    "Gwiriwch a yw eich busnes eisoes wedi’i restru, yna dewiswch “Nid yw’r un o’r rhain yn eiddo i mi” i fwrw ymlaen.",
  "startx.match.count": "Daethpwyd o hyd i {count} o fusnesau tebyg.",
  "startx.error.category":
    "Dewiswch beth mae’r busnes yn ei wneud i fwrw ymlaen.",

  "startx.preview.title": "Eich gwefan gychwynnol",
  "startx.preview.aria": "Rhagolwg o’ch gwefan gychwynnol",
  "startx.preview.namePlaceholder": "Enw eich busnes",
  "startx.preview.categoryPlaceholder":
    "Dewiswch gategori i weld cynllun eich gwefan",
  "startx.preview.opensWith": "Adrannau, yn y drefn hon",
  "startx.preview.design": "Dyluniad: {name}",
  "startx.preview.note":
    "Dyma sut mae eich gwefan gychwynnol yn dechrau. Mae pob adran yn ymddangos unwaith i chi ychwanegu ei manylion, a gallwch newid y dyluniad, y geiriau a’r lluniau pryd bynnag y mynnwch.",
  "startx.template.standard": "Ffres a chlir",
  "startx.template.warm": "Croeso cynnes",
  "startx.template.bold": "Beiddgar a chyfeiriedig",
  "startx.variant.hospitality": "Croeso lleol cynnes",
  "startx.variant.trades": "Arbenigedd lleol dibynadwy",
  "startx.variant.wellbeing": "Gofal, hyder a lles",
  "startx.variant.retail": "Manwerthu lleol annibynnol",
  "startx.variant.professional": "Arbenigedd proffesiynol lleol",
  "startx.variant.community": "Wedi’i wreiddio yn y gymuned",
  "startx.variant.general": "Busnes lleol annibynnol",
  "startx.section.about": "Amdanom",
  "startx.section.services": "Gwasanaethau",
  "startx.section.gallery": "Oriel",
  "startx.section.location": "Lleoliad",
  "startx.section.hours": "Oriau agor",
  "startx.section.contact": "Cysylltu",
  "startx.section.offers": "Cynigion",
  "startx.section.events": "Digwyddiadau",
  "startx.section.menu": "Bwydlen",
  "startx.section.accessibility": "Hygyrchedd",

  "startx.benefits.title": "Yr hyn a gewch, am ddim",
  "startx.benefits.one":
    "Gwefan eich hun, wedi’i rhestru mewn chwiliad lleol ac ar y map.",
  "startx.benefits.two":
    "Rhagolwg preifat yn gyntaf. Nid oes dim yn gyhoeddus nes i chi gyhoeddi.",
  "startx.benefits.three":
    "Mae eich cyfeiriad a’ch manylion cyswllt preifat yn aros yn breifat oni ddewiswch eu dangos.",
  "startx.benefits.four":
    "Golygwch unrhyw bryd yn Gymraeg ac yn Saesneg. Dim cod a dim ffioedd.",
  "startx.submit.hint":
    "Mae hyn yn creu drafft preifat. Nid oes dim yn gyhoeddus eto.",
  "startx.unverified.title": "Gwiriwch eich e-bost i fwrw ymlaen",
  "startx.unverified.body":
    "Mae angen i ni gadarnhau eich cyfeiriad e-bost cyn i chi greu busnes. Defnyddiwch y ddolen a anfonwyd atoch, neu anfonwch un newydd.",
  "startx.unverified.cta": "Mynd i osodiadau’r cyfrif",
  "startx.error.unverified":
    "Nid yw eich cyfeiriad e-bost wedi’i wirio eto. Gwiriwch ef, yna rhowch gynnig arall arni.",

  "startx.claim.summaryTitle": "Rydych yn hawlio",
  "startx.claim.viewListing": "Gweld y rhestriad cyhoeddus",
  "startx.claim.nextTitle": "Beth sy’n digwydd nesaf",
  "startx.claim.next1.title": "Rydym yn adolygu eich cais",
  "startx.claim.next1.body":
    "Mae aelod o dîm OurValleys yn ei ddarllen ac yn ei wirio yn erbyn yr hyn sydd wedi’i restru.",
  "startx.claim.next2.title": "Efallai y gofynnwn am brawf",
  "startx.claim.next2.body":
    "Er enghraifft dolen i’ch tudalen swyddogol neu rif i’ch ffonio’n ôl. Ni chyhoeddwn byth yr hyn a anfonwch.",
  "startx.claim.next3.title": "Cewch fynediad",
  "startx.claim.next3.body":
    "Unwaith y caiff ei gymeradwyo gallwch olygu’r rhestriad a’i wefan o’ch cyfrif.",
  "startx.claim.privacy":
    "Dim ond y tîm adolygu sy’n gweld yr hyn a ysgrifennwch yma.",
  "startx.claim.notYoursTitle": "Ddim y busnes cywir?",
  "startx.claim.notYoursCta": "Dechrau rhestriad ar wahân",
  "startx.claim.signInTitle": "Mewngofnodwch i anfon eich cais",
  "startx.claim.signInBody":
    "Mae angen cyfrif arnoch fel y gwyddom ble i ateb. Mewngofnodwch, neu crëwch gyfrif am ddim o’r dudalen mewngofnodi, yna dychwelwch i’r dudalen hon.",
  "startx.claim.signInCta": "Mewngofnodi",
  "startx.claim.reasonHint":
    "Dywedwch sut rydych yn gysylltiedig, er enghraifft “Fi sy’n berchen arno ac rwyf wedi ei redeg ers 2019”.",
} as const;
