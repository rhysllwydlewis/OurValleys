import fs from "node:fs";

const path = "src/app/page.tsx";
let source = fs.readFileSync(path, "utf8");
const before = `href={
                    demoBusiness ? \`/b/\${demoBusiness.slug}\` : "/businesses"
                  }`;
const after = `href={
                    (demoBusiness
                      ? \`/b/\${demoBusiness.slug}\`
                      : "/businesses") as Route
                  }`;
if (!source.includes(before)) throw new Error("Featured route shape not found");
source = source.replace(before, after);
fs.writeFileSync(path, source);
