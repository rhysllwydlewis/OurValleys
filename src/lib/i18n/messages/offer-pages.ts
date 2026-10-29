/**
 * Strings for the offer page (`/offers/[offerId]`), saving offers and the
 * "ends soon" notice. Spread into the main catalogues. Welsh is first-draft
 * and needs review by a fluent Welsh speaker before launch.
 */
export const offerPagesEn = {
  "offerPage.metaTitle": "{title} at {business}",
  "offerPage.metaDescription":
    "A local offer from {business} in {place}: {title}. See what it includes, the terms and how long is left.",
  "offerPage.metaTitleNotFound": "Offer not found",
  "offerPage.metaDescriptionNotFound":
    "This offer is not available. It may have ended or been withdrawn.",
  "offerPage.unavailableEyebrow": "Offer",
  "offerPage.unavailableTitle": "This offer could not be loaded",
  "offerPage.unavailableBody":
    "Try again in a moment, or browse current offers.",
  "offerPage.allOffers": "All local offers",
  "offerPage.browseBusinesses": "Browse businesses",

  "offerPage.ended": "Ended",
  "offerPage.endedTitle": "This offer has ended",
  "offerPage.endedBody":
    "{business} finished this offer on {date}. There may be a newer one.",
  "offerPage.seeCurrent": "See current offers",
  "offerPage.viewBusiness": "Visit {business}",
  "offerPage.actionDefault": "Find out more",
  "offerPage.opensNewTab": "(opens in a new tab)",

  "offerPage.save.button": "Save this offer",
  "offerPage.save.remove": "Remove from saved",
  "offerPage.save.hint":
    "Saved offers are kept in your account, and we will let you know shortly before one ends.",
  "offerPage.save.hintSignedOut":
    "Sign in to keep this offer and be told shortly before it ends.",
  "offerPage.save.savedHint":
    "Saved. We will let you know shortly before it ends.",
  "offerPage.save.outcomeSaved": "Offer saved to your account.",
  "offerPage.save.outcomeRemoved": "Offer removed from your saved list.",
  "offerPage.save.outcomeGone":
    "That offer is not available to save, or it was already off your list.",
  "offerPage.save.outcomeFailed":
    "That did not work just now. The offer may have ended, or your account cannot save items.",
  "offerPage.share": "Share this offer",

  "offerPage.detailsAria": "Offer details",
  "offerPage.when.title": "When",
  "offerPage.when.from": "Started",
  "offerPage.when.until": "Ends",
  "offerPage.when.noEnd": "No end date set by the business",
  "offerPage.when.times": "Dates are in UK time.",
  "offerPage.terms.title": "Terms and conditions",
  "offerPage.terms.none": "The business has not listed any terms.",
  "offerPage.terms.check":
    "Offers are set by the business, not by OurValleys. Check the details with them before you go.",
  "offerPage.related": "More offers in {place}",
  "offerPage.report": "Report a problem with this business or offer",

  "resident.saved.tab.offers": "Offers",
  "saved.offers.title": "Saved offers",
  "saved.offers.view": "View offer",
  "saved.offers.endsOn": "Ends {date}",
  "resident.saved.emptyTab.offers":
    "You have not saved any offers yet. Save one from its page to keep it here.",
  "resident.saved.browseOffers": "Browse offers",

  "notif.kind.savedOfferEnding.title": "A saved offer ends soon",
  "notif.kind.savedOfferEnding.body": "{title} from {business}",
  "privacy.kind.savedOfferEnding.label": "Saved offers ending soon",
  "privacy.kind.savedOfferEnding.hint":
    "A notice shortly before an offer you saved ends.",
  "privacy.holding.savedOffers": "Saved offers",
} as const;

export const offerPagesCy: Record<keyof typeof offerPagesEn, string> = {
  "offerPage.metaTitle": "{title} yn {business}",
  "offerPage.metaDescription":
    "Cynnig lleol gan {business} yn {place}: {title}. Gweler beth sydd ynddo, y telerau a faint o amser sydd ar ôl.",
  "offerPage.metaTitleNotFound": "Heb ddod o hyd i’r cynnig",
  "offerPage.metaDescriptionNotFound":
    "Nid yw’r cynnig hwn ar gael. Efallai ei fod wedi dod i ben neu wedi’i dynnu’n ôl.",
  "offerPage.unavailableEyebrow": "Cynnig",
  "offerPage.unavailableTitle": "Nid oedd modd llwytho’r cynnig hwn",
  "offerPage.unavailableBody":
    "Rhowch gynnig arall arni mewn eiliad, neu porwch y cynigion cyfredol.",
  "offerPage.allOffers": "Pob cynnig lleol",
  "offerPage.browseBusinesses": "Pori busnesau",

  "offerPage.ended": "Wedi dod i ben",
  "offerPage.endedTitle": "Mae’r cynnig hwn wedi dod i ben",
  "offerPage.endedBody":
    "Daeth y cynnig hwn gan {business} i ben ar {date}. Efallai fod un mwy newydd.",
  "offerPage.seeCurrent": "Gweld y cynigion cyfredol",
  "offerPage.viewBusiness": "Ymweld â {business}",
  "offerPage.actionDefault": "Dysgu mwy",
  "offerPage.opensNewTab": "(yn agor mewn tab newydd)",

  "offerPage.save.button": "Cadw’r cynnig hwn",
  "offerPage.save.remove": "Tynnu o’r rhestr a gadwyd",
  "offerPage.save.hint":
    "Cedwir cynigion yn eich cyfrif, a byddwn yn rhoi gwybod i chi ychydig cyn i un ddod i ben.",
  "offerPage.save.hintSignedOut":
    "Mewngofnodwch i gadw’r cynnig hwn a chael gwybod ychydig cyn iddo ddod i ben.",
  "offerPage.save.savedHint":
    "Wedi’i gadw. Byddwn yn rhoi gwybod i chi ychydig cyn iddo ddod i ben.",
  "offerPage.save.outcomeSaved": "Cadwyd y cynnig yn eich cyfrif.",
  "offerPage.save.outcomeRemoved": "Tynnwyd y cynnig o’ch rhestr a gadwyd.",
  "offerPage.save.outcomeGone":
    "Nid yw’r cynnig hwn ar gael i’w gadw, neu roedd eisoes oddi ar eich rhestr.",
  "offerPage.save.outcomeFailed":
    "Ni weithiodd hynny ar hyn o bryd. Efallai bod y cynnig wedi dod i ben, neu nad yw’ch cyfrif yn gallu cadw eitemau.",
  "offerPage.share": "Rhannu’r cynnig hwn",

  "offerPage.detailsAria": "Manylion y cynnig",
  "offerPage.when.title": "Pryd",
  "offerPage.when.from": "Dechreuodd",
  "offerPage.when.until": "Yn dod i ben",
  "offerPage.when.noEnd": "Dim dyddiad gorffen gan y busnes",
  "offerPage.when.times": "Mae’r dyddiadau yn amser y DU.",
  "offerPage.terms.title": "Telerau ac amodau",
  "offerPage.terms.none": "Nid yw’r busnes wedi rhestru unrhyw delerau.",
  "offerPage.terms.check":
    "Y busnes sy’n gosod y cynigion, nid OurValleys. Gwiriwch y manylion gyda nhw cyn mynd.",
  "offerPage.related": "Mwy o gynigion yn {place}",
  "offerPage.report": "Adrodd am broblem gyda’r busnes neu’r cynnig hwn",

  "resident.saved.tab.offers": "Cynigion",
  "saved.offers.title": "Cynigion a gadwyd",
  "saved.offers.view": "Gweld y cynnig",
  "saved.offers.endsOn": "Yn dod i ben {date}",
  "resident.saved.emptyTab.offers":
    "Nid ydych wedi cadw unrhyw gynigion eto. Cadwch un o’i dudalen i’w gadw yma.",
  "resident.saved.browseOffers": "Pori cynigion",

  "notif.kind.savedOfferEnding.title":
    "Mae cynnig a gadwyd yn dod i ben cyn bo hir",
  "notif.kind.savedOfferEnding.body": "{title} gan {business}",
  "privacy.kind.savedOfferEnding.label":
    "Cynigion a gadwyd sy’n dod i ben cyn bo hir",
  "privacy.kind.savedOfferEnding.hint":
    "Hysbysiad ychydig cyn i gynnig rydych wedi’i gadw ddod i ben.",
  "privacy.holding.savedOffers": "Cynigion a gadwyd",
};
