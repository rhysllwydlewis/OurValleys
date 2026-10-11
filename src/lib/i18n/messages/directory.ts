/**
 * Strings added by the business directory overhaul (`/businesses`): category
 * rail, collapsible filter panel, richer result cards and numbered paging.
 * Spread into the main catalogues. Welsh is first-draft and needs review by a
 * fluent Welsh speaker before launch.
 */
export const directoryEn = {
  "dirx.moreFilters": "More filters",
  "dirx.moreFiltersCount": "More filters ({count})",
  "dirx.panelNear": "Near a place",
  "dirx.panelGoodToKnow": "Good to know",
  "dirx.panelNearHint":
    "Show businesses within a distance of a town or village, nearest first.",
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
  "dirx.moreFilters": "Rhagor o hidlwyr",
  "dirx.moreFiltersCount": "Rhagor o hidlwyr ({count})",
  "dirx.panelNear": "Yn agos at le",
  "dirx.panelGoodToKnow": "Da gwybod",
  "dirx.panelNearHint":
    "Dangos busnesau o fewn pellter i dref neu bentref, y rhai agosaf yn gyntaf.",
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
