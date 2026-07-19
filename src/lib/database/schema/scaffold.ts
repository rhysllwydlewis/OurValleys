import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const scaffoldProof = pgTable(
  "scaffold_proof",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    proofKey: text("proof_key").notNull(),
    proofValue: text("proof_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("scaffold_proof_key_unique").on(table.proofKey)],
);
