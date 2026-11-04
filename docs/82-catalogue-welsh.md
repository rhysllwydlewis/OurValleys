# Catalogue in Welsh: a Welsh name and description for each entry

Builds on `docs/79`–`81` (catalogue entries, pages, index) and doc 32 §8, §11.3.

## What it does

- **Owner editor.** Every row of a products, treatments, team, FAQ, areas or facilities list has a collapsible "Welsh version (optional)" with a Welsh name and (where the list has descriptions) a Welsh description. It opens by itself when Welsh text exists.
- **Welsh readers.** On the business website, `/b/[slug]/catalogue` (including search) and each entry page, a list is shown in the owner's Welsh when it is _fully_ translated: every row has a Welsh name, and a Welsh description wherever the English one has words. Anything less stays wholly English, so a list never mixes languages row by row. English readers are unaffected.
- **Language marking.** A translated list is not tagged `en-GB`; prices, detail notes, category names and the list heading stay tagged as the owner's English because they are not translated.
- Searching the catalogue in Welsh matches the Welsh name and description.

## Rules

- **No migration.** `titleCy` and `descriptionCy` live in the section JSON beside the other entry fields (additive; the stored schema makes them optional, 160 and 1200 characters).
- A Welsh description without a Welsh name is refused with a row-specific message; an empty row with only Welsh text is refused as "name missing" so nothing typed disappears silently.
- Pure rules (`isSectionWelsh`, `localiseSections`, `localiseCataloguePage`) are unit tested; ids and pictures are untouched by localisation.
- Authorisation is unchanged: the existing `manageContent` check on the save action covers the new fields.
- **Rollback caveat.** The previous release ignores the Welsh fields and drops them on the next section save; the English text is unaffected.

## Not done

Welsh category names and Welsh section headings for lists (they stay as the owner's English), Welsh text for the price/detail line, sort options and drag-reorder, structured data in Welsh, Welsh review by a fluent speaker (the new strings are unreviewed).
