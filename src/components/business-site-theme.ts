import type { CSSProperties } from "react";
import {
  getAccent,
  type BusinessAppearanceConfig,
} from "@/modules/businesses/appearance";

/**
 * Everything a business website root element needs to carry its chosen look:
 * the accent colours as custom properties and the approved template, corner
 * and typeface choices as data attributes the stylesheet keys on. Only values
 * from the approved lists ever reach the page.
 */
export function businessSiteTheme(
  appearance: Pick<
    BusinessAppearanceConfig,
    "templateKey" | "accentKey" | "cornerKey" | "typefaceKey"
  >,
) {
  const accent = getAccent(appearance.accentKey);
  return {
    style: {
      "--business-primary": accent.primary,
      "--business-strong": accent.strong,
      "--business-soft": accent.soft,
    } as CSSProperties,
    attributes: {
      "data-template": appearance.templateKey,
      "data-corners": appearance.cornerKey,
      "data-typeface": appearance.typefaceKey,
    },
  };
}
