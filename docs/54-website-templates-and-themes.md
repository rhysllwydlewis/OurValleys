# 54. Business website templates and themes

Implements WP-05 (template and theme model) and part of WP-07 of `docs/32-free-business-website-product-brief.md`.

## What an owner can choose

- **Template** (six): Fresh & clear (`standard`), Warm welcome (`warm`), Bold & direct (`bold`), and the new Quiet editorial (`editorial`, centred magazine-style opening with fine rules), Picture first (`immersive`, hero picture fills the opening with the welcome laid over it) and Simple & practical (`simple`, compact text-first opening that hides the placeholder panel until there is a picture).
- **Colour** (ten accents): the original four plus Lake teal, Dragon red, Gorse gold, Forest pine, Damson and Coal grey. Every `primary` and `strong` value keeps white text at WCAG AA (4.5:1) and the `strong` and `primary` values stay AA on their own soft tint (unit-tested).
- **Corners**: Soft (default), Crisp, Rounded. Driven by `--business-r-lg/md/sm` custom properties, so the hero, section panels and cards change together.
- **Headings**: Classic serif (default) or Modern sans, both from fonts the platform already loads (no new font requests).

There is no free colour input and no arbitrary CSS: every value is a key from an approved list and the stylesheet keys on `data-template`, `data-corners` and `data-typeface` attributes.

## Storage and compatibility

No migration. Template and accent keys use the existing `template_key` and `accent_key` text columns. Corners and headings are stored in the existing `section_layouts` text array as `theme.corners:<key>` and `theme.typeface:<key>` entries, only when they differ from the default (so an owner who never changes them is saved exactly as before). The previous release's layout and copy readers only look up section ids and `copy.` prefixes, so they ignore the entries.

**Rollback caveat.** The previous release validates `template_key` and `accent_key` against its own shorter lists. A business that saved one of the new templates or accents would, on a code rollback, fall back to the default look (and its section order and layouts would be ignored until the new release is redeployed). Nothing is lost or corrupted; redeploying restores the design.

## Where it is applied

`businessSiteTheme()` (`src/components/business-site-theme.ts`) is the single source of the root element's accent properties and data attributes, used by the generated website, the full menu page, the contact page and the QR page. The designer's `ThemePicker` is plain radio inputs (works without script, drives the live preview through the existing form-change listener and the `corners`/`typeface` draft parameters, validated by `applyAppearanceDraft`).

## Starting designs

Professional-services businesses now start on the editorial template (still saved nothing; reset returns to it). Other categories keep their previous starting designs.

## Known limits

Welsh strings are first drafts. The picker's selected and focus states use `:has()` (all current evergreen browsers). The picture-first template's text contrast relies on the overlay gradient plus a text shadow over arbitrary photographs.
