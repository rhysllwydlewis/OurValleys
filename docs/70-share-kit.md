# Share kit

Status: shipped with the overhaul programme (see `docs/36-overhaul-programme-log.md`). Delivers the sharing half of work package WP-13 in `docs/32-free-business-website-product-brief.md` (stable QR code, simple counts of where visits come from).

## What an owner gets

`/dashboard/business/[id]/share`, a **Share** tab on every business dashboard page and a hub tile that replaced the old bare "QR code" tile:

- **Links to share**: a plain link and one labelled link per channel (WhatsApp and messages, Facebook, Instagram, email, print), each with a ready-written message in English or Welsh and, for WhatsApp, Facebook and email, a button that opens that app's own share screen. Nothing is sent by the platform.
- **Printable sheets**: A4 poster, A5 window sticker sheet, table card (two to an A4 sheet) and business cards (eight to an A4 sheet), each with a QR code and in English or Welsh, at `/dashboard/business/[id]/share/print/[kind]?lang=en|cy`. Paper size is set with `@page`, so the browser prints the sheet at real size.
- **Share pictures**: `/b/[slug]/share-image?shape=wide|square|story` draws the business name, category and place in the owner's chosen accent colour. The wide picture is also the link-preview image (`og:image` and the Twitter card) when the business has no cover photo.
- **Results**: visits in the last 30 days by sharing channel, for members whose role includes analytics.

## How labelled links work

A shared link carries `?source=<label>`. The business page accepts only the labels in `campaignSources` (`src/modules/businesses/traffic-source.ts`): `qr`, `print`, `whatsapp`, `facebook`, `instagram`, `email`. Anything else is ignored, so a crafted link cannot put free text into an owner's results, and the label is never shown to visitors. `qr` and `print` also count as a QR visit. The label is stored as the existing `source` text of a `website_view` event; no migration.

The QR image route accepts the same labels (`/b/[slug]/qr/image?source=print`) and falls back to the plain code.

## Access

| Surface                    | Who                                                                          |
| -------------------------- | ---------------------------------------------------------------------------- |
| Share page, print sheets   | Any active member of the business (the dashboard layout enforces `view`)     |
| Results table              | Members with the `viewAnalytics` permission; never the public demo account   |
| Share image, QR image      | Public, but only for a published business; otherwise 404                     |

A business that is not published shows "Publish your page first", and its print sheets return not-found, so nobody prints a code that goes nowhere. Share images draw only public text.

## Left for later

Per-link custom labels, a short link, scheduled social posts, A3 and flyer layouts, server-side PDF export, Welsh review by a fluent speaker.
