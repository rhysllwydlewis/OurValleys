import { describe, expect, it } from "vitest";
import { escapeHtml, renderEmailHtml } from "./email-template";

const verification = [
  "Hello Sam,",
  "",
  "Confirm this email address to unlock your OurValleys account.",
  "The link below is valid for 24 hours:",
  "",
  "https://ourvalleys.co.uk/api/auth/verify-email?token=abc123&callbackURL=%2Faccount",
  "",
  "If you did not create an OurValleys account, you can safely",
  "ignore this email and no account will be activated.",
].join("\n");

describe("renderEmailHtml", () => {
  it("renders a complete branded document with the message content", () => {
    const html = renderEmailHtml({
      subject: "Verify your email for OurValleys",
      text: verification,
      siteUrl: "https://ourvalleys.co.uk",
    });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Verify your email for OurValleys</title>");
    expect(html).toContain("Hello Sam,");
    expect(html).toContain("OurValleys");
    expect(html).toContain('href="https://ourvalleys.co.uk/"');
  });

  it("turns a lone link into a button and keeps the full link visible", () => {
    const html = renderEmailHtml({
      subject: "Verify your email for OurValleys",
      text: verification,
    });
    const button =
      'href="https://ourvalleys.co.uk/api/auth/verify-email?token=abc123&amp;callbackURL=%2Faccount"';
    expect(html).toContain(button);
    expect(html).toContain("Button not working?");
    expect(html).toContain(">Verify email address</a>");
  });

  it("makes only the first lone link a button", () => {
    const html = renderEmailHtml({
      subject: "x",
      text: "Hi\n\nhttps://a.example/one\n\nhttps://a.example/two",
    });
    expect(html.match(/>Open link<\/a>/g)).toHaveLength(1);
    expect(html).toContain("https://a.example/two");
  });

  it("renders labelled links and quiet footer links", () => {
    const html = renderEmailHtml({
      subject: "x",
      text: "Hello\n\nOpen the inbox: https://a.example/inbox\n\nStop these emails: https://a.example/stop",
    });
    expect(html).toContain('<a href="https://a.example/inbox"');
    expect(html).toContain("Stop these emails:");
  });

  it("escapes HTML in every part of the message", () => {
    const html = renderEmailHtml({
      subject: "<script>alert(1)</script>",
      text: 'Hello <img src=x onerror=alert(1)>\n\nA "quoted" & <b>bold</b> line',
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&amp;");
  });

  it("never renders non-http links as links", () => {
    const html = renderEmailHtml({
      subject: "x",
      text: "Hello\n\njavascript:alert(1)\n\nClick: javascript:alert(2)",
      siteUrl: "javascript:alert(3)",
    });
    expect(html).not.toContain('href="javascript:');
  });

  it("joins hard-wrapped lines into one flowing paragraph", () => {
    const html = renderEmailHtml({
      subject: "x",
      text: "Hello\n\nyou can safely\nignore this email.",
    });
    expect(html).toContain("you can safely ignore this email.");
  });

  it("links URLs that appear in the middle of a line", () => {
    const html = renderEmailHtml({
      subject: "x",
      text: 'Hello\n\n- "cafes": 2 new results (3 in total) \u2014 https://a.example/search?q=cafes&page=1.',
    });
    expect(html).toContain(
      '<a href="https://a.example/search?q=cafes&amp;page=1"',
    );
    // The sentence-ending full stop stays outside the link.
    expect(html).toContain("page=1</a>.");
  });

  it("links URLs in lines whose label is longer than a short label", () => {
    const label = "A very long business or event name ".repeat(5);
    const html = renderEmailHtml({
      subject: "x",
      text: `Hello\n\n${label}: https://a.example/event`,
    });
    expect(html).toContain('<a href="https://a.example/event"');
  });

  it("keeps breaks around list items and label lines", () => {
    const html = renderEmailHtml({
      subject: "x",
      text: "Hello\n\nThis week:\n- 12 views\n- 3 enquiries",
    });
    expect(html).toContain("This week:<br>- 12 views<br>- 3 enquiries");
  });

  it("labels the button for reset emails", () => {
    const html = renderEmailHtml({
      subject: "Reset your OurValleys password",
      text: "Hi\n\nhttps://a.example/reset",
    });
    expect(html).toContain(">Reset password</a>");
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});
