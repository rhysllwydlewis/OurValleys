/**
 * Branded HTML for transactional email, generated from the plain-text body so
 * every existing message gets the same layout without changing its caller.
 * The plain text is still sent alongside it and stays the source of truth.
 *
 * Email clients ignore most CSS, so this is table layout with inline styles,
 * system fonts only, and no remote images (many clients block them).
 */

const colours = {
  canvas: "#f1f3ee",
  surface: "#ffffff",
  ink: "#101714",
  muted: "#52605a",
  primary: "#173f35",
  accent: "#b7774c",
  line: "#d3dad5",
} as const;

const fontStack =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Only absolute http(s) links are ever rendered as links. */
function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const urlOnlyLine = /^(https?:\/\/\S+)$/;
const labelledUrlLine = /^(.{1,120}?):\s+(https?:\/\/\S+)$/;
const footerLabel = /^(stop|unsubscribe|manage|change)\b/i;
const greeting = /^(hello|hi|hey|dear|thanks|thank you)\b[^.!?]{0,60}[,.!]?$/i;

type Block =
  | { kind: "button"; url: string }
  | { kind: "link"; label: string; url: string }
  | { kind: "footerLink"; label: string; url: string }
  | { kind: "paragraph"; lines: string[] };

function parseBlocks(text: string): { blocks: Block[]; preheader: string } {
  const blocks: Block[] = [];
  let buttonUsed = false;
  let preheader = "";

  for (const rawBlock of text.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = rawBlock
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== "");
    if (lines.length === 0) continue;

    // A block made only of one link line becomes a button (the first one) or a link.
    if (lines.length === 1) {
      const only = lines[0]!.trim();
      const bare = urlOnlyLine.exec(only);
      if (bare && safeUrl(bare[1]!)) {
        if (!buttonUsed) {
          buttonUsed = true;
          blocks.push({ kind: "button", url: bare[1]! });
        } else {
          blocks.push({ kind: "link", label: bare[1]!, url: bare[1]! });
        }
        continue;
      }
      const labelled = labelledUrlLine.exec(only);
      if (labelled && safeUrl(labelled[2]!)) {
        blocks.push({
          kind: footerLabel.test(labelled[1]!) ? "footerLink" : "link",
          label: labelled[1]!,
          url: labelled[2]!,
        });
        continue;
      }
    }

    if (!preheader && !greeting.test(lines[0]!.trim())) {
      preheader = lines[0]!.trim();
    }
    blocks.push({ kind: "paragraph", lines });
  }

  return { blocks, preheader: preheader.slice(0, 140) };
}

const bulletLine = /^\s*[-*\u2022]\s+(.*)$/;
const numberedOrLabelLine = /^(\s*\d+[.)]\s|[A-Za-z][A-Za-z ]{0,30}:\s)/;

/**
 * Renders one paragraph of the plain text. "- item" lines become a real
 * bulleted list. The text is hard-wrapped, which looks ragged in HTML, so
 * wrapped lines are joined, except around numbered or "Label: value" lines.
 */
function renderParagraphLines(lines: string[]): string {
  const parts: string[] = [];
  let text: string[] = [];
  let items: string[] = [];

  const flushText = () => {
    if (text.length === 0) return;
    let out = "";
    text.forEach((line, index) => {
      const html = renderParagraphLine(line);
      if (index === 0) {
        out = html;
        return;
      }
      const keepBreak =
        numberedOrLabelLine.test(line) ||
        numberedOrLabelLine.test(text[index - 1]!);
      out += keepBreak ? `<br>${html}` : ` ${html}`;
    });
    parts.push(out);
    text = [];
  };
  const flushItems = () => {
    if (items.length === 0) return;
    parts.push(
      `<ul style="margin:6px 0;padding-left:22px;">${items.map((item) => `<li style="margin:3px 0;">${item}</li>`).join("")}</ul>`,
    );
    items = [];
  };

  for (const line of lines) {
    const bullet = bulletLine.exec(line);
    if (bullet) {
      flushText();
      items.push(renderParagraphLine(bullet[1]!));
    } else {
      flushItems();
      text.push(line);
    }
  }
  flushText();
  flushItems();
  return parts.join("");
}

/**
 * Subjects can contain a business's own name ("Verified Plumbing"), so only the
 * two fixed account subjects get a specific label; everything else is generic.
 */
function buttonLabel(subject: string): string {
  if (/^verify your email\b/i.test(subject)) return "Verify email address";
  if (/^reset your .*password\b/i.test(subject)) return "Reset password";
  return "Open link";
}

/** One place that builds a text link, so every link wraps the same way. */
function linkHtml(url: string, colour: string = colours.primary): string {
  return `<a href="${escapeHtml(url)}" style="color:${colour};text-decoration:underline;overflow-wrap:anywhere;word-break:normal;">${escapeHtml(url).replaceAll("/", "/<wbr>")}</a>`;
}

const embeddedUrl = /https?:\/\/[^\s<>"]+/g;

/**
 * Escapes a line of text and turns every http(s) URL inside it into a link,
 * wherever it appears in the line. Trailing sentence punctuation stays outside
 * the link.
 */
function renderParagraphLine(line: string): string {
  let out = "";
  let last = 0;
  for (const match of line.matchAll(embeddedUrl)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const url = raw.replace(/[.,;:!?)\]]+$/, "");
    const checked = safeUrl(url);
    if (!checked) continue;
    out += escapeHtml(line.slice(last, start));
    out += linkHtml(checked);
    last = start + url.length;
  }
  return out + escapeHtml(line.slice(last));
}

function renderBlock(block: Block, subject: string): string {
  switch (block.kind) {
    case "button":
      return `<tr><td style="padding:8px 32px 8px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:${colours.primary};border-radius:10px;"><a href="${escapeHtml(block.url)}" style="display:inline-block;padding:14px 26px;font:600 16px ${fontStack};color:#ffffff;text-decoration:none;">${escapeHtml(buttonLabel(subject))}</a></td></tr></table><p style="margin:14px 0 0;font:13px/1.5 ${fontStack};color:${colours.muted};">Button not working? Copy this link into your browser:<br>${linkHtml(block.url)}</p></td></tr>`;
    case "link": {
      const anchor = linkHtml(block.url);
      return `<tr><td style="padding:6px 32px;font:15px/1.6 ${fontStack};color:${colours.ink};">${block.label === block.url ? anchor : `${escapeHtml(block.label)}: ${anchor}`}</td></tr>`;
    }
    case "footerLink":
      return `<tr><td style="padding:6px 32px;font:13px/1.6 ${fontStack};color:${colours.muted};">${escapeHtml(block.label)}: ${linkHtml(block.url, colours.muted)}</td></tr>`;
    case "paragraph":
      return `<tr><td style="padding:6px 32px;font:16px/1.65 ${fontStack};color:${colours.ink};">${renderParagraphLines(block.lines)}</td></tr>`;
  }
}

export function renderEmailHtml(input: {
  subject: string;
  text: string;
  siteUrl?: string;
}): string {
  const { blocks, preheader } = parseBlocks(input.text);
  const home = input.siteUrl ? safeUrl(input.siteUrl) : null;
  const wordmark = `<span style="font:700 22px ${fontStack};color:#ffffff;letter-spacing:0.2px;">OurValleys</span>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${colours.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${colours.canvas};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${colours.surface};border:1px solid ${colours.line};border-radius:16px;overflow:hidden;">
<tr><td style="background:${colours.primary};padding:22px 32px;border-bottom:4px solid ${colours.accent};">${home ? `<a href="${escapeHtml(home)}" style="text-decoration:none;">${wordmark}</a>` : wordmark}</td></tr>
<tr><td style="padding:12px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
${blocks.map((block) => renderBlock(block, input.subject)).join("\n")}
<tr><td style="padding:24px 32px 8px;"><hr style="border:0;border-top:1px solid ${colours.line};margin:0;"></td></tr>
<tr><td style="padding:8px 32px 28px;font:12px/1.6 ${fontStack};color:${colours.muted};">OurValleys helps people find local businesses and events across the South Wales Valleys.<br>This email was sent by OurValleys. If it was not meant for you, you can ignore it.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
