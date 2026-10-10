import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LocaleProvider } from "@/lib/i18n/client";
import { cy } from "@/lib/i18n/messages/cy";
import { en } from "@/lib/i18n/messages/en";
import RouteError from "./error";

function render(locale: "en" | "cy") {
  return renderToStaticMarkup(
    // The provider's props type requires `children`, so it is passed as a prop.
    // eslint-disable-next-line react/no-children-prop
    createElement(LocaleProvider, {
      locale,
      messages: locale === "cy" ? cy : en,
      children: createElement(RouteError, { reset: () => undefined }),
    }),
  );
}

describe("root route error boundary", () => {
  it("renders an alert with retry and recovery links", () => {
    const html = render("en");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Retry");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/businesses"');
  });

  it("speaks Welsh to a Welsh reader and marks the language", () => {
    const html = render("cy");
    expect(html).toContain('lang="cy-GB"');
    expect(html).toContain("Aeth rhywbeth o’i le");
    expect(html).toContain("Ceisio eto");
    expect(html).not.toContain("Retry");
    expect(html).toContain('href="/businesses"');
  });
});
