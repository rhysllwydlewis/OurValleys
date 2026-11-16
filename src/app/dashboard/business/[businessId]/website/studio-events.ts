/**
 * Fired on `document` to open the live preview as a sheet (narrow screens).
 * The detail is the element that asked, so focus can return to it.
 */
export const PREVIEW_OPEN_EVENT = "ov-designer-preview-open";

/**
 * From this width the preview sits beside the controls instead of opening as
 * a sheet. designer.module.css uses the same 77rem; keep the two in step.
 */
export const SIDE_BY_SIDE_QUERY = "(min-width: 77rem)";

/**
 * Fired on `document` by the live preview after it shows a page: for each
 * section that is switched on, whether the page had anything to show in it.
 * Sections that are switched off are left out (the page cannot tell).
 */
export const SECTION_CONTENT_EVENT = "ov-designer-section-content";

export type SectionContent = Record<string, "filled" | "empty">;
