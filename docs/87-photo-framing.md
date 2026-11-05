# 87. Photo framing: zoom on top of the focal point

Status: built in the 2026-11-05 overhaul cycle (see `docs/36-overhaul-programme-log.md`).

## Problem

Owners could only choose a focal point, so a photo could be slid but never cropped tighter. A wide shop-front shot could not be framed on the door sign, and every crop on the website showed the whole picture.

## What shipped

- **Data.** Migration `0069` adds `business_media.zoom_pct integer not null default 100` with a `100..300` check. Additive; the previous app version ignores it and existing photos read as 100 (whole photo).
- **Rules (pure).** `normaliseZoom` (service-side validation: whole number, 100–300), `clampZoom` (display-side: steps of 10, bad values become 100) and `framingStyle({ focalX, focalY, zoom })` in `photo-studio-model.ts`. At 100% it returns exactly the old `object-position`; above that it adds `transform: scale(z)` with `transform-origin` equal to the focal point. An `object-position` percentage and a `transform-origin` percentage land on the same point, so the chosen spot stays where the owner put it while the picture crops in around it.
- **Service.** `saveBusinessMedia` and `updateBusinessMediaPresentation` take an optional `zoom`. Omitted means 100 on upload and "leave as saved" on update, so the website designer (which has no zoom control) never resets framing. An unusable value is refused, never clamped silently.
- **Photos studio.** A Zoom slider (100–300%, steps of 10, `aria-valuetext`) beside the two focus sliders for cover and gallery photos; every real crop preview (wide, tall, card, square) updates live; "Centre the focus" also resets zoom. Unsaved-change warning covers zoom.
- **Public site.** Hero image, logo and gallery tiles use `framingStyle`; the box clips (`overflow: hidden`; the logo gained a clipping frame). The lightbox and the directory card art are unchanged and show the whole photo / focal point only.
- **Language.** EN/CY strings under `photos.zoom.*` (Welsh is first-draft, needs review by a fluent speaker).

## Not changed

No authorisation logic (`readAuthorisedEditor` and `canUserAccessBusiness` untouched), no change to the public projection, no `/cy` URLs. Logos have no framing controls (fixed centre). Zoom is non-destructive: the stored image is never altered, so it can be changed back at any time.

## Tests

`photo-studio-model.test.ts` and `media-validation.test.ts` (rules), `tests/integration/business-appearance-media.test.ts` (real Postgres: save, leave-alone when omitted, invalid values, DB check, cross-business denial), `tests/e2e/business-photo-framing.spec.ts` (public tile transform, clipping, no horizontal scroll at 390px) and the zoom journey in `tests/e2e/account-photos-studio.spec.ts`.

## Next

Rotate 90°, directory card art with zoom, Welsh alt text for offer/event/update/catalogue pictures, Welsh review by a fluent speaker.
