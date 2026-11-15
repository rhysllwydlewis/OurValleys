/**
 * Strings added by the business directory overhaul (`/businesses`): category
 * rail, collapsible filter panel, richer result cards and numbered paging.
 * Spread into the main catalogues. Welsh is first-draft and needs review by a
 * fluent Welsh speaker before launch.
 */
export const directoryEn = {
  "dirx.nearMeButton": "Near me",
  "dirx.nearMeLocating": "Finding where you are…",
  "dirx.nearMeFound": "Showing businesses near {place}.",
  "dirx.nearMeDenied":
    "Location is turned off for this site. Choose a town under “More filters” instead.",
  "dirx.nearMeUnsupported":
    "This device cannot share its location. Choose a town under “More filters” instead.",
  "dirx.nearMeTimeout":
    "We could not find your location in time. Try again, or choose a town under “More filters”.",
  "dirx.nearMeOutside":
    "You appear to be outside the valleys. Choose a town under “More filters” to browse from there.",
  "dirx.moreFilters": "More filters",
  "dirx.moreFiltersCount": "More filters ({count})",
  "dirx.panelNear": "Near a place",
  "dirx.panelGoodToKnow": "Good to know",
  "dirx.panelNearHint":
    "Only show businesses within a distance of a town or village.",
  "dirx.viewMap": "View on the map",
  "dirx.viewMapCategory": "View {category} on the map",
  "dirx.categoryRail": "Browse by category",
  "dirx.allCategoriesPill": "All",
  "dirx.closedNow": "Closed now",
  "dirx.offerBadge": "Offer",
  "dirx.offerLine": "Offer: {title}",
  "dirx.servicesLabel": "Services",
  "dirx.showing": "Showing {from}–{to} of {total}",
  "dirx.pageNumber": "Page {page}",
  "dirx.pageCurrent": "Page {page}, current page",
  "dirx.sortNavLabel": "Sort results",
  "dirx.resultsRegion": "Business results",
} as const satisfies Record<string, string>;

export const directoryCy: Record<keyof typeof directoryEn, string> = {
  "dirx.nearMeButton": "Yn agos ataf",
  "dirx.nearMeLocating": "Yn dod o hyd i le rydych chi…",
  "dirx.nearMeFound": "Yn dangos busnesau yn agos at {place}.",
  "dirx.nearMeDenied":
    "Mae lleoliad wedi’i ddiffodd ar gyfer y wefan hon. Dewiswch dref dan “Rhagor o hidlwyr” yn lle hynny.",
  "dirx.nearMeUnsupported":
    "Ni all y ddyfais hon rannu ei lleoliad. Dewiswch dref dan “Rhagor o hidlwyr” yn lle hynny.",
  "dirx.nearMeTimeout":
    "Ni fu modd dod o hyd i’ch lleoliad mewn pryd. Rhowch gynnig arall arni, neu dewiswch dref dan “Rhagor o hidlwyr”.",
  "dirx.nearMeOutside":
    "Mae’n ymddangos eich bod y tu allan i’r cymoedd. Dewiswch dref dan “Rhagor o hidlwyr” i bori oddi yno.",
  "dirx.moreFilters": "Rhagor o hidlwyr",
  "dirx.moreFiltersCount": "Rhagor o hidlwyr ({count})",
  "dirx.panelNear": "Yn agos at le",
  "dirx.panelGoodToKnow": "Da gwybod",
  "dirx.panelNearHint":
    "Dangos dim ond busnesau o fewn pellter i dref neu bentref.",
  "dirx.viewMap": "Gweld ar y map",
  "dirx.viewMapCategory": "Gweld {category} ar y map",
  "dirx.categoryRail": "Pori yn ôl categori",
  "dirx.allCategoriesPill": "Pob un",
  "dirx.closedNow": "Ar gau nawr",
  "dirx.offerBadge": "Cynnig",
  "dirx.offerLine": "Cynnig: {title}",
  "dirx.servicesLabel": "Gwasanaethau",
  "dirx.showing": "Yn dangos {from}–{to} o {total}",
  "dirx.pageNumber": "Tudalen {page}",
  "dirx.pageCurrent": "Tudalen {page}, y dudalen bresennol",
  "dirx.sortNavLabel": "Trefnu’r canlyniadau",
  "dirx.resultsRegion": "Canlyniadau busnesau",
};
