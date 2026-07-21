"use client";

import { useState } from "react";
import { resolveTicketAction } from "./actions";

const actionLabels: Record<string, string> = {
  approve_claim: "Approve claim as manager",
  add_manager: "Add claimant as manager",
  transfer_control: "Transfer ownership control",
  keep_separate: "Keep records separate",
  merge_duplicate: "Retire duplicate and redirect",
  restore_duplicate: "Restore retired duplicate",
  accept_correction: "Accept correction",
  approve_slug_change: "Approve slug change",
  request_information: "Request more information",
  reject: "Reject",
  dismiss: "Dismiss with no action",
};

export function TicketActions({
  ticketId,
  type,
  hasReporterUser,
  hasRelatedBusiness,
  terminal,
}: {
  ticketId: string;
  type: string;
  hasReporterUser: boolean;
  hasRelatedBusiness: boolean;
  terminal: boolean;
}) {
  const options = terminal
    ? hasRelatedBusiness
      ? ["restore_duplicate"]
      : []
    : [
        ...(type === "claim" && hasReporterUser
          ? ["approve_claim", "add_manager", "transfer_control"]
          : []),
        ...(type === "duplicate" && hasRelatedBusiness
          ? ["merge_duplicate", "keep_separate"]
          : []),
        ...(type === "correction" ? ["accept_correction"] : []),
        ...(type === "slug_change" ? ["approve_slug_change"] : []),
        "request_information",
        "reject",
        "dismiss",
      ];
  const [result, setResult] = useState("");
  if (options.length === 0) return <span>—</span>;

  return (
    <form
      className="admin-row-actions"
      action={async (formData) => {
        setResult("");
        const response = await resolveTicketAction(formData);
        setResult(
          response.status === "resolved"
            ? "Action completed."
            : response.status === "invalid" && "message" in response
              ? response.message
              : "The action could not be completed.",
        );
      }}
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <label>
        <span className="sr-only">Resolution action</span>
        <select name="action" defaultValue={options[0]}>
          {options.map((action) => (
            <option value={action} key={action}>
              {actionLabels[action] ?? action}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Resolution note</span>
        <textarea
          name="note"
          minLength={3}
          maxLength={1000}
          placeholder="Required audit note"
          required
        />
      </label>
      <button className="button" type="submit">
        Apply action
      </button>
      <span role="status" aria-live="polite">
        {result}
      </span>
    </form>
  );
}
