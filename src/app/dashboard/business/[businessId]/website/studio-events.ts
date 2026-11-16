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
