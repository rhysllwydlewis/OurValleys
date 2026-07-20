"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../admin.module.css";
import {
  banUserAction,
  removeMembershipAction,
  setMembershipStatusAction,
  setUserRoleAction,
  unbanUserAction,
} from "../actions";

type Membership = {
  membershipId: string;
  businessId: string;
  businessTradingName: string;
  role: string;
  status: string;
};

type UserControlsProps = {
  userId: string;
  role: string;
  banned: boolean;
  isSelf: boolean;
  memberships: Membership[];
};

export function UserControls({
  userId,
  role,
  banned,
  isSelf,
  memberships,
}: UserControlsProps) {
  const router = useRouter();
  const [banReason, setBanReason] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  async function run(action: () => Promise<{ status: string }>, ok: string) {
    setPending(true);
    setFeedback(null);
    try {
      const result = await action();
      if (result.status === "ok") {
        setFeedbackIsError(false);
        setFeedback(ok);
        router.refresh();
      } else if (result.status === "forbidden") {
        setFeedbackIsError(true);
        setFeedback("You do not have permission to do this.");
      } else {
        setFeedbackIsError(true);
        setFeedback("That action could not be completed.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className={styles.card}>
        <h3>Role and access</h3>
        {isSelf ? (
          <p className="inline-empty">
            You cannot change your own role or ban status from here.
          </p>
        ) : (
          <>
            <div className={styles.actionsRow}>
              <button
                className="button"
                type="button"
                disabled={pending || role === "admin"}
                onClick={() =>
                  run(
                    () => setUserRoleAction({ userId, role: "admin" }),
                    "Granted platform-admin access.",
                  )
                }
              >
                Make platform admin
              </button>
              <button
                className="button"
                type="button"
                disabled={pending || role === "user"}
                onClick={() =>
                  run(
                    () => setUserRoleAction({ userId, role: "user" }),
                    "Removed platform-admin access.",
                  )
                }
              >
                Remove admin access
              </button>
            </div>

            {banned ? (
              <div className={styles.actionsRow}>
                <button
                  className="button primary"
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => unbanUserAction({ userId }), "Account unbanned.")
                  }
                >
                  Unban account
                </button>
              </div>
            ) : (
              <>
                <div className={`${styles.formGrid} ${styles.spaced}`}>
                  <label htmlFor="ban-reason">Ban reason</label>
                  <textarea
                    id="ban-reason"
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    placeholder="Why is this account being banned?"
                  />
                </div>
                <div className={styles.actionsRow}>
                  <button
                    className={`button ${styles.buttonDanger}`}
                    type="button"
                    disabled={pending || banReason.trim().length < 5}
                    onClick={() =>
                      run(
                        () => banUserAction({ userId, reason: banReason }),
                        "Account banned.",
                      )
                    }
                  >
                    Ban account
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {feedback ? (
          <p
            className={`${styles.feedback} ${feedbackIsError ? styles.feedbackError : ""}`}
          >
            {feedback}
          </p>
        ) : null}
      </div>

      <div className={`${styles.card} ${styles.spaced}`}>
        <h3>Business memberships</h3>
        {memberships.length === 0 ? (
          <p className="inline-empty">No business memberships.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <tr key={membership.membershipId}>
                    <td>{membership.businessTradingName}</td>
                    <td>{membership.role}</td>
                    <td>{membership.status}</td>
                    <td>
                      <div className={styles.actionsRow}>
                        <button
                          className="button"
                          type="button"
                          disabled={
                            pending || membership.status === "suspended"
                          }
                          onClick={() =>
                            run(
                              () =>
                                setMembershipStatusAction({
                                  membershipId: membership.membershipId,
                                  status: "suspended",
                                }),
                              "Membership suspended.",
                            )
                          }
                        >
                          Suspend
                        </button>
                        <button
                          className="button"
                          type="button"
                          disabled={pending || membership.status === "active"}
                          onClick={() =>
                            run(
                              () =>
                                setMembershipStatusAction({
                                  membershipId: membership.membershipId,
                                  status: "active",
                                }),
                              "Membership reactivated.",
                            )
                          }
                        >
                          Reactivate
                        </button>
                        <button
                          className={`button ${styles.buttonDanger}`}
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () =>
                                removeMembershipAction({
                                  membershipId: membership.membershipId,
                                }),
                              "Membership removed.",
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
