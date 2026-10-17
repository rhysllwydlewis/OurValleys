"use server";

import { z } from "zod";
import { maxImportBytes } from "@/modules/businesses/csv-import";
import { importBusinessDrafts } from "@/modules/businesses/csv-import-service";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

export type ImportActionState =
  | { status: "idle" }
  | { status: "forbidden" }
  | { status: "invalid"; message: string }
  | { status: "unavailable" }
  | {
      status: "checked" | "imported";
      created: number;
      skipped: { line: number; message: string }[];
      errors: { line: number; message: string }[];
    };

const intentSchema = z.enum(["check", "import"]);

export async function importBusinessesAction(
  _previous: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const intent = intentSchema.safeParse(formData.get("intent"));
  if (!intent.success)
    return { status: "invalid", message: "Choose an action." };

  let csv = "";
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > maxImportBytes) {
      return { status: "invalid", message: "The file is too large to import." };
    }
    csv = await file.text();
  } else {
    const pasted = formData.get("csv");
    csv = typeof pasted === "string" ? pasted : "";
  }
  if (csv.trim() === "") {
    return { status: "invalid", message: "Paste CSV text or choose a file." };
  }

  const result = await importBusinessDrafts({
    csv,
    adminUserId: admin.userId,
    dryRun: intent.data === "check",
  });
  if (result.status === "unavailable") return { status: "unavailable" };

  if (result.status === "imported") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "business.imported",
      targetType: "business",
      metadata: {
        created: result.created,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
    });
  }
  return {
    status: result.status,
    created: result.created,
    skipped: result.skipped,
    errors: result.errors,
  };
}
