/**
 * Strings for the "nearby" page and the distance filter on offers (doc 119).
 * Spread into the main catalogues. Counts sit beside their labels rather than
 * inside sentences, so no string depends on plural forms. Welsh is first-draft
 * and needs review by a fluent Welsh speaker before launch.
 */
export const nearbyEn = {
  "nearby.metaTitle": "Nearby",
  "nearby.metaDescription":
    "Choose a town, or use your location, to see businesses open now, events and offers close by.",
  "nearby.eyebrow": "Nearby",
  "nearby.title": "What is near you?",
  "nearby.titlePlace": "Near {place}",
  "nearby.lead":
    "Choose a town or press “Near me” to see what is open, what is on and what is on offer close by.",
  "nearby.leadPlace":
    "Businesses, events and offers within {radius}km of the centre of {place}.",
  "nearby.formAria": "Choose where to look",
  "nearby.nearLabel": "Near",
  "nearby.choosePlace": "Choose a town",
  "nearby.withinLabel": "Within",
  "nearby.km": "{radius}km",
  "nearby.submit": "Show what is near",
  "nearby.privacy":
    "“Near me” uses your location once, on this device, to pick the nearest town. Your location is never sent to OurValleys or stored.",
  "nearby.nearMeFound": "Showing what is near {place}.",
  "nearby.nearMeDenied":
    "Location is turned off for this site. Choose a town instead.",
  "nearby.nearMeUnsupported":
    "This device cannot share its location. Choose a town instead.",
  "nearby.nearMeTimeout":
    "We could not find your location in time. Try again, or choose a town.",
  "nearby.nearMeOutside":
    "You appear to be outside the valleys. Choose a town to browse from there.",
  "nearby.chooseEyebrow": "Start here",
  "nearby.chooseTitle": "Pick a town to begin",
  "nearby.chooseBody":
    "Or choose one of these towns. You can change the distance once you are there.",
  "nearby.townsAria": "Towns to start from",
  "nearby.unknownEyebrow": "Place not found",
  "nearby.unknownTitle": "We do not know that place",
  "nearby.unknownBody":
    "The link may be out of date. Choose a town from the list, or use “Near me”.",
  "nearby.unavailableEyebrow": "Temporarily unavailable",
  "nearby.unavailableTitle": "We cannot show what is nearby right now",
  "nearby.unavailableBody":
    "Nothing is wrong with your device. Please try again in a moment.",
  "nearby.tryAgain": "Try again",
  "nearby.browseBusinesses": "Browse all businesses",
  "nearby.summaryAria": "What is within {radius}km of {place}",
  "nearby.statOpenNow": "Open now",
  "nearby.statBusinesses": "Businesses",
  "nearby.statEvents": "Events coming up",
  "nearby.statOffers": "Current offers",
  "nearby.radiusAria": "Distance",
  "nearby.radiusLabel": "Within",
  "nearby.emptyEyebrow": "Nothing yet",
  "nearby.emptyTitle": "Nothing is listed within {radius}km of {place}",
  "nearby.emptyBody":
    "Businesses, events and offers will appear here as they are added.",
  "nearby.widen": "Look within {radius}km",
  "nearby.openTitle": "Open now",
  "nearby.openLead": "Nearest first, by the opening hours each business keeps.",
  "nearby.closedTitle": "Nearest businesses",
  "nearby.closedLead":
    "Nothing nearby says it is open right now. These are the closest businesses.",
  "nearby.noBusinesses":
    "No businesses are listed within {radius}km of {place}.",
  "nearby.seeAllOpen": "See all open now ({count})",
  "nearby.seeAllBusinesses": "See all businesses ({count})",
  "nearby.eventsTitle": "What is on",
  "nearby.eventsLead": "The next events hosted close by.",
  "nearby.noEvents": "No events are coming up within {radius}km of {place}.",
  "nearby.seeAllEvents": "See all events ({count})",
  "nearby.allEvents": "Events across the valleys",
  "nearby.offersTitle": "Offers",
  "nearby.offersLead": "Ending soonest first.",
  "nearby.noOffers": "No offers are running within {radius}km of {place}.",
  "nearby.seeAllOffers": "See all offers ({count})",
  "nearby.allOffers": "Offers across the valleys",
  "nearby.placesTitle": "Places close by",
  "nearby.placesLead": "Move to a neighbouring town, or read about this one.",
  "nearby.placeDistance": "{name} · {km}km",
  "nearby.placeAria": "What is near {name}, {km}km away",
  "nearby.aboutPlace": "About {place}",
  "nearby.onMap": "See the valleys map",
  "nearby.footerLink": "Nearby",
  "nearby.heroLink": "Near me",
  "nearby.placeLink": "Everything near {place}",
  "nearby.loadingTitle": "Finding what is nearby",
  "nearby.loadingHint": "Loading businesses, events and offers nearby.",
  "offersNear.legend": "Distance",
  "offersNear.hint":
    "Only show offers from businesses within a distance of a town.",
  "offersNear.nearLabel": "Near",
  "offersNear.withinLabel": "Within",
  "offersNear.anyDistance": "Anywhere",
  "offersNear.chip": "Near {value} (within {radius}km)",
  "offersNear.remove": "Remove near {value} filter",
  "offersNear.nearMeFound": "Showing offers near {place}.",
  "offersNear.nearMeDenied":
    "Location is turned off for this site. Choose a town under “Distance” instead.",
  "offersNear.nearMeUnsupported":
    "This device cannot share its location. Choose a town under “Distance” instead.",
  "offersNear.nearMeTimeout":
    "We could not find your location in time. Try again, or choose a town under “Distance”.",
  "offersNear.nearMeOutside":
    "You appear to be outside the valleys. Choose a town under “Distance” to browse from there.",
  "offersNear.emptyHint":
    "No offers are running within {radius}km of {place}. Try a wider distance or remove the filter.",
  "offersNear.everything": "Everything near {place}",
} as const satisfies Record<string, string>;

export const nearbyCy: Record<keyof typeof nearbyEn, string> = {
  "nearby.metaTitle": "Gerllaw",
  "nearby.metaDescription":
    "Dewiswch dref, neu defnyddiwch eich lleoliad, i weld busnesau sydd ar agor nawr, digwyddiadau a chynigion gerllaw.",
  "nearby.eyebrow": "Gerllaw",
  "nearby.title": "Beth sydd yn agos atoch chi?",
  "nearby.titlePlace": "Ger {place}",
  "nearby.lead":
    "Dewiswch dref neu pwyswch “Yn agos ataf” i weld beth sydd ar agor, beth sydd ymlaen a pha gynigion sydd gerllaw.",
  "nearby.leadPlace":
    "Busnesau, digwyddiadau a chynigion o fewn {radius}km i ganol {place}.",
  "nearby.formAria": "Dewis ble i edrych",
  "nearby.nearLabel": "Ger",
  "nearby.choosePlace": "Dewiswch dref",
  "nearby.withinLabel": "O fewn",
  "nearby.km": "{radius}km",
  "nearby.submit": "Dangos beth sydd gerllaw",
  "nearby.privacy":
    "Mae “Yn agos ataf” yn defnyddio eich lleoliad unwaith, ar y ddyfais hon, i ddewis y dref agosaf. Nid yw eich lleoliad byth yn cael ei anfon at OurValleys na’i gadw.",
  "nearby.nearMeFound": "Yn dangos beth sydd yn agos at {place}.",
  "nearby.nearMeDenied":
    "Mae lleoliad wedi’i ddiffodd ar gyfer y wefan hon. Dewiswch dref yn lle hynny.",
  "nearby.nearMeUnsupported":
    "Ni all y ddyfais hon rannu ei lleoliad. Dewiswch dref yn lle hynny.",
  "nearby.nearMeTimeout":
    "Ni fu modd dod o hyd i’ch lleoliad mewn pryd. Rhowch gynnig arall arni, neu dewiswch dref.",
  "nearby.nearMeOutside":
    "Mae’n ymddangos eich bod y tu allan i’r cymoedd. Dewiswch dref i bori oddi yno.",
  "nearby.chooseEyebrow": "Dechreuwch yma",
  "nearby.chooseTitle": "Dewiswch dref i ddechrau",
  "nearby.chooseBody":
    "Neu dewiswch un o’r trefi hyn. Gallwch newid y pellter wedyn.",
  "nearby.townsAria": "Trefi i ddechrau ohonynt",
  "nearby.unknownEyebrow": "Heb ddod o hyd i’r lle",
  "nearby.unknownTitle": "Nid ydym yn adnabod y lle hwnnw",
  "nearby.unknownBody":
    "Efallai fod y ddolen wedi dyddio. Dewiswch dref o’r rhestr, neu defnyddiwch “Yn agos ataf”.",
  "nearby.unavailableEyebrow": "Ddim ar gael dros dro",
  "nearby.unavailableTitle": "Ni allwn ddangos beth sydd gerllaw ar hyn o bryd",
  "nearby.unavailableBody":
    "Nid oes dim o’i le ar eich dyfais. Rhowch gynnig arall arni mewn eiliad.",
  "nearby.tryAgain": "Rhoi cynnig arall arni",
  "nearby.browseBusinesses": "Pori pob busnes",
  "nearby.summaryAria": "Beth sydd o fewn {radius}km i {place}",
  "nearby.statOpenNow": "Ar agor nawr",
  "nearby.statBusinesses": "Busnesau",
  "nearby.statEvents": "Digwyddiadau i ddod",
  "nearby.statOffers": "Cynigion cyfredol",
  "nearby.radiusAria": "Pellter",
  "nearby.radiusLabel": "O fewn",
  "nearby.emptyEyebrow": "Dim byd eto",
  "nearby.emptyTitle": "Nid oes dim wedi’i restru o fewn {radius}km i {place}",
  "nearby.emptyBody":
    "Bydd busnesau, digwyddiadau a chynigion yn ymddangos yma wrth iddynt gael eu hychwanegu.",
  "nearby.widen": "Edrych o fewn {radius}km",
  "nearby.openTitle": "Ar agor nawr",
  "nearby.openLead":
    "Yr agosaf yn gyntaf, yn ôl yr oriau agor y mae pob busnes yn eu cadw.",
  "nearby.closedTitle": "Y busnesau agosaf",
  "nearby.closedLead":
    "Nid oes dim gerllaw yn dweud ei fod ar agor ar hyn o bryd. Dyma’r busnesau agosaf.",
  "nearby.noBusinesses":
    "Nid oes busnesau wedi’u rhestru o fewn {radius}km i {place}.",
  "nearby.seeAllOpen": "Gweld popeth sydd ar agor nawr ({count})",
  "nearby.seeAllBusinesses": "Gweld pob busnes ({count})",
  "nearby.eventsTitle": "Beth sydd ymlaen",
  "nearby.eventsLead": "Y digwyddiadau nesaf a gynhelir gerllaw.",
  "nearby.noEvents":
    "Nid oes digwyddiadau ar y gweill o fewn {radius}km i {place}.",
  "nearby.seeAllEvents": "Gweld pob digwyddiad ({count})",
  "nearby.allEvents": "Digwyddiadau ar draws y cymoedd",
  "nearby.offersTitle": "Cynigion",
  "nearby.offersLead": "Y rhai sy’n dod i ben gyntaf yn gyntaf.",
  "nearby.noOffers": "Nid oes cynigion ar gael o fewn {radius}km i {place}.",
  "nearby.seeAllOffers": "Gweld pob cynnig ({count})",
  "nearby.allOffers": "Cynigion ar draws y cymoedd",
  "nearby.placesTitle": "Lleoedd gerllaw",
  "nearby.placesLead": "Symudwch i dref gyfagos, neu darllenwch am hon.",
  "nearby.placeDistance": "{name} · {km}km",
  "nearby.placeAria": "Beth sydd yn agos at {name}, {km}km i ffwrdd",
  "nearby.aboutPlace": "Ynglŷn â {place}",
  "nearby.onMap": "Gweld map y cymoedd",
  "nearby.footerLink": "Gerllaw",
  "nearby.heroLink": "Yn agos ataf",
  "nearby.placeLink": "Popeth ger {place}",
  "nearby.loadingTitle": "Yn chwilio am beth sydd gerllaw",
  "nearby.loadingHint":
    "Yn llwytho busnesau, digwyddiadau a chynigion gerllaw.",
  "offersNear.legend": "Pellter",
  "offersNear.hint":
    "Dangos dim ond cynigion gan fusnesau o fewn pellter i dref.",
  "offersNear.nearLabel": "Ger",
  "offersNear.withinLabel": "O fewn",
  "offersNear.anyDistance": "Unrhyw le",
  "offersNear.chip": "Ger {value} (o fewn {radius}km)",
  "offersNear.remove": "Dileu’r hidlydd ger {value}",
  "offersNear.nearMeFound": "Yn dangos cynigion yn agos at {place}.",
  "offersNear.nearMeDenied":
    "Mae lleoliad wedi’i ddiffodd ar gyfer y wefan hon. Dewiswch dref dan “Pellter” yn lle hynny.",
  "offersNear.nearMeUnsupported":
    "Ni all y ddyfais hon rannu ei lleoliad. Dewiswch dref dan “Pellter” yn lle hynny.",
  "offersNear.nearMeTimeout":
    "Ni fu modd dod o hyd i’ch lleoliad mewn pryd. Rhowch gynnig arall arni, neu dewiswch dref dan “Pellter”.",
  "offersNear.nearMeOutside":
    "Mae’n ymddangos eich bod y tu allan i’r cymoedd. Dewiswch dref dan “Pellter” i bori oddi yno.",
  "offersNear.emptyHint":
    "Nid oes cynigion o fewn {radius}km i {place}. Rhowch gynnig ar bellter ehangach neu dilëwch yr hidlydd.",
  "offersNear.everything": "Popeth ger {place}",
} as const;
