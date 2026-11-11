/**
 * Strings for suggesting a change to a place page (doc 97). Welsh is
 * first-draft and needs review by a fluent Welsh speaker before launch.
 */
export const placeSuggestEn = {
  "placeSuggest.link": "Suggest a change",
  "placeSuggest.linkHint": "Know something we are missing about {name}?",
  "placeSuggest.metaTitle": "Suggest a change to {name}",
  "placeSuggest.metaDescription":
    "Tell us something that is missing or wrong on the {name} page.",
  "placeSuggest.eyebrow": "Help us get {name} right",
  "placeSuggest.title": "Suggest a change to {name}",
  "placeSuggest.lead":
    "Locals know best. Tell us about a market day, a bus route, a parking tip, something out of date or a better Welsh word. A person reads every suggestion before anything changes. We do not collect your name or email.",
  "placeSuggest.back": "Back to {name}",
  "placeSuggest.kindLegend": "What kind of suggestion is it?",
  "placeSuggest.kind.fact": "Something good to know",
  "placeSuggest.kind.correction": "Something is wrong or out of date",
  "placeSuggest.kind.welsh": "Better Welsh wording",
  "placeSuggest.kind.other": "Something else",
  "placeSuggest.factLabel": "Heading",
  "placeSuggest.factLabelHint":
    "A few words, such as “Market day” or “Parking”.",
  "placeSuggest.factValue": "Detail",
  "placeSuggest.factValueHint": "One or two sentences, up to 240 characters.",
  "placeSuggest.message": "Your suggestion",
  "placeSuggest.messageHint":
    "Up to 500 characters. Please do not include personal details.",
  "placeSuggest.counter": "{count} of {max} characters",
  "placeSuggest.submit": "Send suggestion",
  "placeSuggest.invalid":
    "Please check your suggestion: it needs a few words, and a fact also needs a heading.",
  "placeSuggest.rateLimited":
    "You have sent a few suggestions already. Please try again in an hour.",
  "placeSuggest.notFound":
    "We could not find that place, so the suggestion was not sent.",
  "placeSuggest.error":
    "Something went wrong and the suggestion was not sent. Please try again.",
  "placeSuggest.sentTitle": "Thank you, we have it",
  "placeSuggest.sentBody":
    "A person will read your suggestion and update the page if it checks out. We will not contact you about it.",
  "placeSuggest.sentAnother": "Send another suggestion",
  "placeSuggest.honeypot": "Leave this field empty",
  "placeSuggest.notFoundPageTitle": "Place not found",
} as const;

export const placeSuggestCy: Record<keyof typeof placeSuggestEn, string> = {
  "placeSuggest.link": "Awgrymu newid",
  "placeSuggest.linkHint": "Gwybod rhywbeth sydd ar goll am {name}?",
  "placeSuggest.metaTitle": "Awgrymu newid i {name}",
  "placeSuggest.metaDescription":
    "Dywedwch wrthym beth sydd ar goll neu’n anghywir ar dudalen {name}.",
  "placeSuggest.eyebrow": "Helpwch ni i gael {name} yn iawn",
  "placeSuggest.title": "Awgrymu newid i {name}",
  "placeSuggest.lead":
    "Y bobl leol sy’n gwybod orau. Dywedwch wrthym am ddiwrnod marchnad, llwybr bws, awgrym parcio, rhywbeth sydd wedi dyddio neu air Cymraeg gwell. Mae person yn darllen pob awgrym cyn i unrhyw beth newid. Nid ydym yn casglu eich enw na’ch e-bost.",
  "placeSuggest.back": "Yn ôl i {name}",
  "placeSuggest.kindLegend": "Pa fath o awgrym yw e?",
  "placeSuggest.kind.fact": "Rhywbeth da i’w wybod",
  "placeSuggest.kind.correction": "Mae rhywbeth yn anghywir neu wedi dyddio",
  "placeSuggest.kind.welsh": "Geiriad Cymraeg gwell",
  "placeSuggest.kind.other": "Rhywbeth arall",
  "placeSuggest.factLabel": "Pennawd",
  "placeSuggest.factLabelHint":
    "Ychydig eiriau, fel “Diwrnod marchnad” neu “Parcio”.",
  "placeSuggest.factValue": "Manylion",
  "placeSuggest.factValueHint": "Un neu ddwy frawddeg, hyd at 240 nod.",
  "placeSuggest.message": "Eich awgrym",
  "placeSuggest.messageHint":
    "Hyd at 500 nod. Peidiwch â chynnwys manylion personol.",
  "placeSuggest.counter": "{count} o {max} nod",
  "placeSuggest.submit": "Anfon yr awgrym",
  "placeSuggest.invalid":
    "Gwiriwch eich awgrym: mae angen ychydig eiriau arno, ac mae ffaith angen pennawd hefyd.",
  "placeSuggest.rateLimited":
    "Rydych chi wedi anfon sawl awgrym yn barod. Rhowch gynnig arall arni ymhen awr.",
  "placeSuggest.notFound":
    "Methwyd dod o hyd i’r lle hwnnw, felly ni anfonwyd yr awgrym.",
  "placeSuggest.error":
    "Aeth rhywbeth o’i le ac ni anfonwyd yr awgrym. Rhowch gynnig arall arni.",
  "placeSuggest.sentTitle": "Diolch, rydym wedi’i dderbyn",
  "placeSuggest.sentBody":
    "Bydd person yn darllen eich awgrym ac yn diweddaru’r dudalen os yw’n gywir. Ni fyddwn yn cysylltu â chi amdano.",
  "placeSuggest.sentAnother": "Anfon awgrym arall",
  "placeSuggest.honeypot": "Gadewch y maes hwn yn wag",
  "placeSuggest.notFoundPageTitle": "Heb ddod o hyd i’r lle",
};
