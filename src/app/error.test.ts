import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RouteError from "./error";

describe("root route error boundary", () => {
  it("renders an alert with retry and recovery links", () => {
    const html = renderToStaticMarkup(
      createElement(RouteError, { reset: () => undefined }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Retry");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/businesses"');
  });
});
