import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeFromCookieString,
  negotiateLocale,
  parseAcceptLanguage,
} from "./config";
import { cy } from "./messages/cy";
import { en } from "./messages/en";
import { returnPathFromForm, returnPathFromReferer } from "./return-path";
import { createTranslator, translatorFor } from "./translate";

describe("catalogue parity", () => {
  it("has exactly the same keys in English and Welsh", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
  });

  it("never leaves a Welsh message empty and keeps placeholders aligned", () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const [key, english] of Object.entries(en)) {
      const welsh = cy[key as keyof typeof cy];
      expect(welsh.trim().length, key).toBeGreaterThan(0);
      expect(placeholders(welsh), key).toEqual(placeholders(english));
    }
  });
});

describe("locale negotiation", () => {
  it("recognises only supported locales", () => {
    expect(isLocale("cy")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("prefers the visitor's explicit cookie over the browser", () => {
    expect(
      negotiateLocale({ cookie: "en", acceptLanguage: "cy,en;q=0.5" }),
    ).toBe("en");
    expect(negotiateLocale({ cookie: "cy", acceptLanguage: "en-GB" })).toBe(
      "cy",
    );
  });

  it("ignores an invalid cookie and falls back to the browser language", () => {
    expect(
      negotiateLocale({ cookie: "xx", acceptLanguage: "cy-GB,cy;q=0.9" }),
    ).toBe("cy");
  });

  it("honours Accept-Language quality values", () => {
    expect(parseAcceptLanguage("en;q=0.4, cy;q=0.9")).toBe("cy");
    expect(parseAcceptLanguage("fr, cy-GB;q=0.8, en;q=0.7")).toBe("cy");
    expect(parseAcceptLanguage("cy;q=0, en")).toBe("en");
  });

  it("defaults to English for unsupported, empty or hostile headers", () => {
    expect(negotiateLocale({})).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale({ acceptLanguage: "fr-FR,de;q=0.8" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "cy;q=abc" })).toBe("en");
    expect(parseAcceptLanguage("cy,".repeat(400))).toBeUndefined();
  });
});

describe("translator", () => {
  it("returns Welsh text for the Welsh locale", () => {
    expect(translatorFor("cy")("nav.businesses")).toBe("Busnesau");
    expect(translatorFor("en")("nav.businesses")).toBe("Businesses");
  });

  it("interpolates parameters and leaves unknown placeholders visible", () => {
    const t = createTranslator({
      ...en,
      "common.switchLanguage": "Go {language} {x}",
    });
    expect(t("common.switchLanguage", { language: "Cymraeg" })).toBe(
      "Go Cymraeg {x}",
    );
  });
});

describe("returnPathFromReferer", () => {
  const host = "ourvalleys.test";

  it("returns the same-origin path and query", () => {
    expect(
      returnPathFromReferer(`https://${host}/businesses?q=cafe&place=x`, host),
    ).toBe("/businesses?q=cafe&place=x");
  });

  it("falls back to the homepage for missing, foreign or malformed referers", () => {
    expect(returnPathFromReferer(null, host)).toBe("/");
    expect(returnPathFromReferer("https://evil.example/path", host)).toBe("/");
    expect(returnPathFromReferer("not a url", host)).toBe("/");
    expect(returnPathFromReferer(`https://${host}//evil.example`, host)).toBe(
      "/",
    );
    expect(returnPathFromReferer(`https://${host}/x`, null)).toBe("/");
  });

  it("keeps /account when the visitor really was there", () => {
    expect(returnPathFromReferer(`https://${host}/account`, host)).toBe(
      "/account",
    );
  });
});

describe("returnPathFromForm", () => {
  const host = "ourvalleys.test";
  const referer = `https://${host}/events`;

  it("prefers a safe explicit path over the referer", () => {
    expect(returnPathFromForm("/businesses?q=cafe", referer, host)).toBe(
      "/businesses?q=cafe",
    );
  });

  it("works when the referer is withheld", () => {
    expect(returnPathFromForm("/guides", null, host)).toBe("/guides");
  });

  it("rejects unsafe explicit paths and falls back to the referer", () => {
    for (const bad of [
      "//evil.example",
      "https://evil.example",
      "/\\x",
      "/login",
    ]) {
      expect(returnPathFromForm(bad, referer, host), bad).toBe("/events");
    }
  });

  it("falls back to the homepage with nothing usable", () => {
    expect(returnPathFromForm("", null, null)).toBe("/");
  });
});

describe("localeFromCookieString", () => {
  it("reads the chosen language from a raw cookie string", () => {
    expect(localeFromCookieString("a=1; ov-locale=cy; b=2")).toBe("cy");
    expect(localeFromCookieString("ov-locale=en")).toBe("en");
  });

  it("falls back to English for a missing or unsupported value", () => {
    expect(localeFromCookieString("")).toBe("en");
    expect(localeFromCookieString("other=cy")).toBe("en");
    expect(localeFromCookieString("ov-locale=fr")).toBe("en");
    expect(localeFromCookieString("ov-locale=")).toBe("en");
  });
});
