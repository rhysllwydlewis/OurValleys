from pathlib import Path

path = Path("src/app/businesses/page.tsx")
text = path.read_text()
old = 'import { getInitials } from "@/lib/initials";\nimport { listPublishedBusinesses } from "@/modules/businesses/public";\n'
new = 'import { getInitials } from "@/lib/initials";\nimport { recordSearchAppearances } from "@/modules/businesses/analytics";\nimport { listPublishedBusinesses } from "@/modules/businesses/public";\n'
if text.count(old) != 1:
    raise SystemExit("businesses page import anchor changed")
text = text.replace(old, new, 1)
old = '  const resultCount = result.state === "ready" ? result.businesses.length : 0;\n\n  return (\n'
new = '  const resultCount = result.state === "ready" ? result.businesses.length : 0;\n  if (result.state === "ready" && result.businesses.length > 0) {\n    await recordSearchAppearances(result.businesses.map((item) => item.id));\n  }\n\n  return (\n'
if text.count(old) != 1:
    raise SystemExit("businesses page result anchor changed")
path.write_text(text.replace(old, new, 1))
