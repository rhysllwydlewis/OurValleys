import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/i18n/[asset]/route";
import {
  catalogueAssetBody,
  catalogueAssetPath,
  parseCatalogueAsset,
  publishServerMessages,
} from "./catalogue-asset";
import { CLIENT_MESSAGES_GLOBAL, readClientMessages } from "./client-messages";
import { cy } from "./messages/cy";
import { en } from "./messages/en";
import { createTranslator } from "./translator";

function load(locale: "en" | "cy") {
  const sandbox: Record<string, unknown> = {};
  sandbox.globalThis = sandbox;
  runInNewContext(catalogueAssetBody(locale).body, sandbox);
  return sandbox[CLIENT_MESSAGES_GLOBAL] as Record<
    string,
    Record<string, string>
  >;
}

describe("catalogue asset", () => {
  it("publishes every English string for the English page", () => {
    const store = load("en");
    expect(Object.keys(store)).toEqual(["en"]);
    expect(store.en).toEqual({ ...en });
  });

  it("publishes Welsh with English filling any gap, and only Welsh", () => {
    const store = load("cy");
    expect(Object.keys(store)).toEqual(["cy"]);
    expect(store.cy).toEqual({ ...en, ...cy });
    const key = Object.keys(cy)[0] as keyof typeof cy;
    expect(store.cy?.[key]).toBe(cy[key]);
  });

  it("addresses each language by a content hash", () => {
    const path = catalogueAssetPath("cy");
    expect(path).toMatch(/^\/i18n\/cy\.[0-9a-f]{12}\.js$/);
    expect(catalogueAssetPath("cy")).toBe(path);
    expect(catalogueAssetPath("en")).not.toBe(path);
    const parsed = parseCatalogueAsset(path.replace("/i18n/", ""));
    expect(parsed?.locale).toBe("cy");
  });

  it("rejects anything that is not a catalogue address", () => {
    for (const asset of [
      "cy.js",
      "fr.0123456789ab.js",
      "cy.0123456789ab.json",
      "../cy.0123456789ab.js",
      "cy.0123456789AB.js",
      "",
    ]) {
      expect(parseCatalogueAsset(asset)).toBeNull();
    }
  });

  it("is readable by client components rendered on the server", () => {
    publishServerMessages();
    expect(readClientMessages("en")).toEqual({ ...en });
    const key = Object.keys(cy)[0] as keyof typeof cy;
    expect(readClientMessages("cy")?.[key]).toBe(cy[key]);
  });
});

describe("catalogue route", () => {
  const call = (asset: string) =>
    GET(new Request(`http://localhost/i18n/${asset}`), {
      params: Promise.resolve({ asset }),
    });

  it("caches a current address forever", async () => {
    const asset = catalogueAssetPath("cy").replace("/i18n/", "");
    const response = await call(asset);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(response.headers.get("Content-Type")).toContain("text/javascript");
    expect(await response.text()).toBe(catalogueAssetBody("cy").body);
  });

  it("compresses for browsers that accept it and varies on the request", async () => {
    const asset = catalogueAssetPath("en").replace("/i18n/", "");
    const get = (encoding?: string) =>
      GET(
        new Request("http://localhost/i18n/x", {
          headers: encoding ? { "accept-encoding": encoding } : {},
        }),
        { params: Promise.resolve({ asset }) },
      );
    const plain = await (await get()).arrayBuffer();
    const gzipped = await get("gzip, deflate");
    const brotli = await get("gzip, br");
    expect(gzipped.headers.get("Content-Encoding")).toBe("gzip");
    expect(brotli.headers.get("Content-Encoding")).toBe("br");
    expect(gzipped.headers.get("Vary")).toBe("Accept-Encoding");
    expect((await gzipped.arrayBuffer()).byteLength).toBeLessThan(
      plain.byteLength / 3,
    );
    expect((await get()).headers.get("Content-Encoding")).toBeNull();
  });

  it("serves current strings for an unknown hash but never caches them", async () => {
    const response = await call("cy.000000000000.js");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("answers 404 for a malformed address", async () => {
    expect((await call("whatever")).status).toBe(404);
    expect((await call("zz.0123456789ab.js")).status).toBe(404);
  });
});

describe("catalogue-free translator", () => {
  it("shows the key rather than crashing when a string is missing", () => {
    expect(createTranslator({})("no.such.key" as never)).toBe("no.such.key");
  });

  it("falls back, then fills parameters", () => {
    const t = createTranslator({}, { "x.y": "Hello {name}" } as never);
    expect(t("x.y" as never, { name: "Gwen" })).toBe("Hello Gwen");
  });
});
