import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { businessEvent } from "@/lib/database/schema";
import { foldedMatch, FOLDED_SIMILARITY_THRESHOLD } from "./folded-sql";

const dialect = new PgDialect();
const render = (query: string, fuzzy = false) =>
  dialect.sqlToQuery(foldedMatch(businessEvent.title, query, { fuzzy }));

describe("foldedMatch", () => {
  it("folds accents and case in the bound pattern and unaccents the column", () => {
    const { sql, params } = render("Café RHÔNDDA");
    expect(sql).toContain("public.ourvalleys_unaccent");
    expect(sql).toContain("like");
    expect(params).toContain("%cafe rhondda%");
  });

  it("escapes LIKE wildcards so typed text is literal", () => {
    expect(render("50%_off").params).toContain("%50\\%\\_off%");
  });

  it("adds trigram similarity only when fuzzy", () => {
    expect(render("bakry").sql).not.toContain("similarity");
    const fuzzy = render("bakry", true);
    expect(fuzzy.sql).toContain("similarity");
    expect(fuzzy.params).toContain(FOLDED_SIMILARITY_THRESHOLD);
  });
});
