import fs from "node:fs";

const path = "src/app/page.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  'import Image from "next/image";',
  'import type { Route } from "next";\nimport Image from "next/image";',
);
source = source.replace(
  'demoBusiness ? `/b/${demoBusiness.slug}` : "/businesses"',
  '(demoBusiness ? `/b/${demoBusiness.slug}` : "/businesses") as Route',
);
source = source.replace(
  'href={`/events/${event.id}`}',
  'href={`/events/${event.id}` as Route}',
);
source = source.replace(
  'href={`/places/${area.slug}`}',
  'href={`/places/${area.slug}` as Route}',
);
source = source.replace(
  'href={`/guides/${guide.slug}`}',
  'href={`/guides/${guide.slug}` as Route}',
);
source = source.replace(
  'src={guideImages[index % guideImages.length]}',
  'src={guideImages[index % guideImages.length] ?? guideImages[0]}',
);

fs.writeFileSync(path, source);
