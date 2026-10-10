/**
 * Strings for the news page, the policies pages, the not-found and error pages
 * and the route loading states. Kept in their own module and spread into the
 * main catalogues. Welsh is first-draft and needs review by a fluent Welsh
 * speaker before launch.
 */
export const publicPagesEn = {
  "news.metaTitle": "Latest Welsh news",
  "news.metaDescription":
    "Read attributed Welsh news headlines and feed-supplied story imagery from WalesOnline.",
  "news.eyebrow": "Latest news",
  "news.title": "News from across the Valleys and Wales.",
  "news.leadBefore":
    "A rolling feed of Welsh headlines, refreshed through the day and linked straight to ",
  "news.updated": "Updated {time}",
  "news.headlineCountOne": "1 headline",
  "news.headlineCountMany": "{count} headlines",
  "news.recentlyPublished": "Recently published",
  "news.readOn": "Read on WalesOnline",
  "news.unavailableKicker": "External feed unavailable",
  "news.unavailableTitle": "News headlines cannot be loaded just now.",
  "news.unavailableBody":
    "WalesOnline remains available directly. OurValleys will try the RSS feed again automatically without blocking local business, event or guide discovery.",
  "news.visitSource": "Visit WalesOnline News",
  "news.returnHome": "Return home",
  "news.emptyKicker": "No feed items",
  "news.emptyTitle": "No WalesOnline headlines are available in the feed.",
  "news.emptyBody":
    "This honest empty state remains until the external publisher adds another item or changes the feed.",
  "news.featuredLabel": "Featured headline",
  "news.fromSource": "From WalesOnline",
  "news.latestHeadlines": "Latest headlines",
  "news.filterLabel": "Filter headlines by category",
  "news.filterAll": "All",
  "news.category.news": "News",
  "news.category.traffic": "Traffic",
  "news.category.crime": "Crime",
  "news.category.weather": "Weather",
  "news.category.business": "Business",
  "news.category.travel": "Travel",
  "news.category.politics": "Politics",
  "news.showMore": "View more headlines",
  "news.showFewer": "Show fewer headlines",
  "news.feedStatus":
    "Headlines and images are supplied by WalesOnline and open the original article on their site. Headlines are in English, as published.",
  "news.calloutTitle": "Discover local businesses in your area",
  "news.calloutBody":
    "Search trusted businesses across the Valleys and support local.",
  "news.calloutAction": "Browse businesses",
  "news.loadingEyebrow": "Latest Welsh news",
  "news.loadingTitle": "Finding the latest headlines…",
  "news.loadingHint": "Loading news headlines",

  "policies.metaTitle": "Policies",
  "policies.metaDescription":
    "Privacy, accessibility, content, corrections, advertising and platform rules for OurValleys.",
  "policies.eyebrow": "Trust and accountability",
  "policies.title": "OurValleys policies.",
  "policies.lead":
    "Plain-language rules for how the platform handles information, accessibility, local content, complaints and commercial promotion.",
  "policies.listLabel": "Policy documents",
  "policies.read": "Read policy",
  "policies.privacy": "Privacy notice",
  "policies.terms": "Platform terms",
  "policies.accessibility": "Accessibility statement",
  "policies.contentGuidelines": "Content guidelines",
  "policies.corrections": "Complaints and corrections",
  "policies.advertising": "Advertising policy",
  "policies.detailEyebrow": "OurValleys policies",
  "policies.baselineNote":
    "This baseline policy is part of the controlled launch-readiness system. Final public approval remains recorded through the release gate and does not replace specialist advice where required.",
  "policies.englishOnlyNote":
    "The wording of this policy is currently available in English only. A Welsh version will be published once it has been checked by a fluent Welsh speaker.",
  "policies.summary.privacy":
    "How OurValleys handles account, business, enquiry and usage information.",
  "policies.summary.terms":
    "The baseline rules for using OurValleys accounts, discovery and business website tools.",
  "policies.summary.accessibility":
    "Our commitment to an inclusive, keyboard-friendly and understandable local platform.",
  "policies.summary.content-guidelines":
    "What businesses, organisers and contributors may publish through OurValleys.",
  "policies.summary.corrections":
    "How to report inaccurate local information and challenge platform decisions.",
  "policies.summary.advertising":
    "How paid promotion must remain distinct from organic local discovery.",
  "policies.viewAll": "View all OurValleys policies",
  "policies.loadingEyebrow": "Trust and accountability",
  "policies.loadingTitle": "Finding OurValleys policies…",
  "policies.loadingHint": "Loading policy documents",

  "notFound.metaTitle": "Page not found",
  "notFound.eyebrow": "Page not found",
  "notFound.title": "We could not find that page.",
  "notFound.body":
    "The link may be out of date or the page may have moved. Try browsing local businesses or head back to the homepage.",
  "notFound.home": "Return home",
  "notFound.browse": "Browse businesses",

  "error.eyebrow": "Something went wrong",
  "error.title": "We could not load this page.",
  "error.body":
    "No information has been lost. Retry or browse local businesses.",
  "error.retry": "Retry",
  "error.home": "Return home",
  "error.browse": "Browse businesses",
  "error.businessesTitle": "We could not load business discovery.",
  "error.businessesBody":
    "No information has been lost. Retry or return to the homepage.",
  "error.globalTitle": "OurValleys hit an unexpected error.",
  "error.globalBody":
    "No information has been lost. Try again, or return to the homepage.",
  "error.globalRetry": "Try again",

  "loading.places.eyebrow": "Explore by place",
  "loading.places.title": "Finding local places…",
  "loading.places.hint": "Loading place results",
  "loading.businesses.eyebrow": "Local business discovery",
  "loading.businesses.title": "Finding useful local businesses…",
  "loading.businesses.hint": "Loading business results",
  "loading.offers.eyebrow": "Supplied by local businesses",
  "loading.offers.title": "Finding local offers…",
  "loading.offers.hint": "Loading local offers",
  "loading.categories.eyebrow": "Explore by category",
  "loading.categories.title": "Finding local categories…",
  "loading.categories.hint": "Loading category results",
  "loading.events.eyebrow": "What is happening locally",
  "loading.events.title": "Finding local events…",
  "loading.events.hint": "Loading local event results",
  "loading.guides.eyebrow": "Explore local guide concepts",
  "loading.guides.title": "Finding local guides…",
  "loading.guides.hint": "Loading local guides",
  "loading.register.eyebrow": "Free business website and listing",
  "loading.register.title": "Loading registration…",
  "loading.register.hint": "Loading the registration page",
  "loading.login.eyebrow": "Secure account access",
  "loading.login.title": "Loading sign in…",
  "loading.login.hint": "Loading the sign-in page",
  "loading.reset.eyebrow": "Account recovery",
  "loading.reset.title": "Loading password reset…",
  "loading.reset.hint": "Loading the password reset page",
} as const satisfies Record<string, string>;

export const publicPagesCy: Record<keyof typeof publicPagesEn, string> = {
  "news.metaTitle": "Newyddion diweddaraf o Gymru",
  "news.metaDescription":
    "Darllenwch benawdau newyddion o Gymru a delweddau straeon o WalesOnline, gyda chydnabyddiaeth lawn i’r ffynhonnell.",
  "news.eyebrow": "Newyddion diweddaraf",
  "news.title": "Newyddion o’r Cymoedd ac o bob rhan o Gymru.",
  "news.leadBefore":
    "Llif parhaus o benawdau o Gymru, wedi’i adnewyddu drwy’r dydd ac yn cysylltu’n syth â ",
  "news.updated": "Diweddarwyd {time}",
  "news.headlineCountOne": "1 pennawd",
  "news.headlineCountMany": "{count} pennawd",
  "news.recentlyPublished": "Cyhoeddwyd yn ddiweddar",
  "news.readOn": "Darllen ar WalesOnline",
  "news.unavailableKicker": "Porthiant allanol ddim ar gael",
  "news.unavailableTitle": "Does dim modd llwytho’r penawdau ar hyn o bryd.",
  "news.unavailableBody":
    "Mae WalesOnline ar gael yn uniongyrchol o hyd. Bydd OurValleys yn ceisio’r porthiant RSS eto’n awtomatig heb rwystro’r gwaith o ddarganfod busnesau, digwyddiadau na chanllawiau lleol.",
  "news.visitSource": "Ymweld â Newyddion WalesOnline",
  "news.returnHome": "Yn ôl i’r hafan",
  "news.emptyKicker": "Dim eitemau yn y porthiant",
  "news.emptyTitle": "Does dim penawdau WalesOnline ar gael yn y porthiant.",
  "news.emptyBody":
    "Bydd y neges onest hon yn aros nes bydd y cyhoeddwr allanol yn ychwanegu eitem arall neu’n newid y porthiant.",
  "news.featuredLabel": "Pennawd dan sylw",
  "news.fromSource": "O WalesOnline",
  "news.latestHeadlines": "Penawdau diweddaraf",
  "news.filterLabel": "Hidlo penawdau yn ôl categori",
  "news.filterAll": "Pob un",
  "news.category.news": "Newyddion",
  "news.category.traffic": "Traffig",
  "news.category.crime": "Trosedd",
  "news.category.weather": "Tywydd",
  "news.category.business": "Busnes",
  "news.category.travel": "Teithio",
  "news.category.politics": "Gwleidyddiaeth",
  "news.showMore": "Gweld mwy o benawdau",
  "news.showFewer": "Dangos llai o benawdau",
  "news.feedStatus":
    "Daw’r penawdau a’r delweddau gan WalesOnline ac maen nhw’n agor yr erthygl wreiddiol ar eu gwefan nhw. Mae’r penawdau yn Saesneg, fel y’u cyhoeddwyd.",
  "news.calloutTitle": "Darganfyddwch fusnesau lleol yn eich ardal",
  "news.calloutBody":
    "Chwiliwch am fusnesau y gallwch ymddiried ynddynt ar draws y Cymoedd a chefnogwch fusnesau lleol.",
  "news.calloutAction": "Pori busnesau",
  "news.loadingEyebrow": "Newyddion diweddaraf o Gymru",
  "news.loadingTitle": "Dod o hyd i’r penawdau diweddaraf…",
  "news.loadingHint": "Yn llwytho’r penawdau newyddion",

  "policies.metaTitle": "Polisïau",
  "policies.metaDescription":
    "Rheolau preifatrwydd, hygyrchedd, cynnwys, cywiriadau, hysbysebu a’r platfform ar gyfer OurValleys.",
  "policies.eyebrow": "Ymddiriedaeth ac atebolrwydd",
  "policies.title": "Polisïau OurValleys.",
  "policies.lead":
    "Rheolau mewn iaith glir ynglŷn â sut mae’r platfform yn trin gwybodaeth, hygyrchedd, cynnwys lleol, cwynion a hyrwyddo masnachol.",
  "policies.listLabel": "Dogfennau polisi",
  "policies.read": "Darllen y polisi",
  "policies.privacy": "Hysbysiad preifatrwydd",
  "policies.terms": "Telerau’r platfform",
  "policies.accessibility": "Datganiad hygyrchedd",
  "policies.contentGuidelines": "Canllawiau cynnwys",
  "policies.corrections": "Cwynion a chywiriadau",
  "policies.advertising": "Polisi hysbysebu",
  "policies.detailEyebrow": "Polisïau OurValleys",
  "policies.baselineNote":
    "Mae’r polisi sylfaenol hwn yn rhan o’r system parodrwydd i lansio dan reolaeth. Caiff y cymeradwyo cyhoeddus terfynol ei gofnodi drwy’r porth rhyddhau ac nid yw’n disodli cyngor arbenigol lle bo angen.",
  "policies.englishOnlyNote":
    "Ar hyn o bryd mae geiriad y polisi hwn ar gael yn Saesneg yn unig. Cyhoeddir fersiwn Gymraeg ar ôl i siaradwr Cymraeg rhugl ei wirio.",
  "policies.summary.privacy":
    "Sut mae OurValleys yn trin gwybodaeth cyfrif, busnes, ymholiadau a defnydd.",
  "policies.summary.terms":
    "Y rheolau sylfaenol ar gyfer defnyddio cyfrifon OurValleys, y gwaith darganfod ac offer gwefan busnes.",
  "policies.summary.accessibility":
    "Ein hymrwymiad i blatfform lleol cynhwysol, hawdd ei ddefnyddio gyda bysellfwrdd ac sy’n ddealladwy.",
  "policies.summary.content-guidelines":
    "Beth gaiff busnesau, trefnwyr a chyfranwyr ei gyhoeddi drwy OurValleys.",
  "policies.summary.corrections":
    "Sut i adrodd am wybodaeth leol anghywir a herio penderfyniadau’r platfform.",
  "policies.summary.advertising":
    "Sut mae’n rhaid i hyrwyddo taledig barhau’n wahanol i’r gwaith darganfod lleol naturiol.",
  "policies.viewAll": "Gweld holl bolisïau OurValleys",
  "policies.loadingEyebrow": "Ymddiriedaeth ac atebolrwydd",
  "policies.loadingTitle": "Dod o hyd i bolisïau OurValleys…",
  "policies.loadingHint": "Yn llwytho’r dogfennau polisi",

  "notFound.metaTitle": "Heb ddod o hyd i’r dudalen",
  "notFound.eyebrow": "Heb ddod o hyd i’r dudalen",
  "notFound.title": "Doedd dim modd dod o hyd i’r dudalen honno.",
  "notFound.body":
    "Efallai fod y ddolen yn hen neu fod y dudalen wedi symud. Rhowch gynnig ar bori busnesau lleol neu ewch yn ôl i’r hafan.",
  "notFound.home": "Yn ôl i’r hafan",
  "notFound.browse": "Pori busnesau",

  "error.eyebrow": "Aeth rhywbeth o’i le",
  "error.title": "Doedd dim modd llwytho’r dudalen hon.",
  "error.body":
    "Dydy dim gwybodaeth wedi’i cholli. Rhowch gynnig arall arni neu porwch fusnesau lleol.",
  "error.retry": "Ceisio eto",
  "error.home": "Yn ôl i’r hafan",
  "error.browse": "Pori busnesau",
  "error.businessesTitle":
    "Doedd dim modd llwytho’r dudalen darganfod busnesau.",
  "error.businessesBody":
    "Dydy dim gwybodaeth wedi’i cholli. Rhowch gynnig arall arni neu ewch yn ôl i’r hafan.",
  "error.globalTitle": "Daeth OurValleys ar draws gwall annisgwyl.",
  "error.globalBody":
    "Dydy dim gwybodaeth wedi’i cholli. Rhowch gynnig arall arni, neu ewch yn ôl i’r hafan.",
  "error.globalRetry": "Rhowch gynnig arall arni",

  "loading.places.eyebrow": "Archwilio yn ôl lle",
  "loading.places.title": "Dod o hyd i leoedd lleol…",
  "loading.places.hint": "Yn llwytho canlyniadau lleoedd",
  "loading.businesses.eyebrow": "Darganfod busnesau lleol",
  "loading.businesses.title": "Dod o hyd i fusnesau lleol defnyddiol…",
  "loading.businesses.hint": "Yn llwytho canlyniadau busnesau",
  "loading.offers.eyebrow": "Gan fusnesau lleol",
  "loading.offers.title": "Dod o hyd i gynigion lleol…",
  "loading.offers.hint": "Yn llwytho cynigion lleol",
  "loading.categories.eyebrow": "Archwilio yn ôl categori",
  "loading.categories.title": "Dod o hyd i gategorïau lleol…",
  "loading.categories.hint": "Yn llwytho canlyniadau categorïau",
  "loading.events.eyebrow": "Beth sy’n digwydd yn lleol",
  "loading.events.title": "Dod o hyd i ddigwyddiadau lleol…",
  "loading.events.hint": "Yn llwytho canlyniadau digwyddiadau lleol",
  "loading.guides.eyebrow": "Archwilio syniadau canllawiau lleol",
  "loading.guides.title": "Dod o hyd i ganllawiau lleol…",
  "loading.guides.hint": "Yn llwytho canllawiau lleol",
  "loading.register.eyebrow": "Gwefan a rhestriad busnes am ddim",
  "loading.register.title": "Yn llwytho’r dudalen cofrestru…",
  "loading.register.hint": "Yn llwytho’r dudalen cofrestru",
  "loading.login.eyebrow": "Mynediad diogel i’r cyfrif",
  "loading.login.title": "Yn llwytho’r dudalen mewngofnodi…",
  "loading.login.hint": "Yn llwytho’r dudalen mewngofnodi",
  "loading.reset.eyebrow": "Adfer cyfrif",
  "loading.reset.title": "Yn llwytho’r dudalen ailosod cyfrinair…",
  "loading.reset.hint": "Yn llwytho’r dudalen ailosod cyfrinair",
};
