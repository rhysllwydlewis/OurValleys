import { authoredTextLang, memberRoleTag } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { businessPermissions } from "@/modules/businesses/permissions";
import { businessMembershipRoles } from "@/modules/identity/access-policy";
import {
  businessInvitationRoles,
  listBusinessTeam,
} from "@/modules/businesses/team";
import {
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
  transferOwnershipAction,
} from "../actions";
import styles from "../operations.module.css";
import { formatDate, hidden, hasPermission } from "./shared";

const invitationRoleLabels: Record<string, MessageKey> = {
  manager: "account.role.manager",
  editor: "account.role.editor",
  viewer: "account.role.viewer",
};

export async function TeamSection({
  businessId,
  businessName,
  userId,
}: {
  businessId: string;
  businessName: string;
  userId: string;
}) {
  const i18n = await getTranslator();
  const { t } = i18n;
  const canManageMembersPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageMembers,
  );
  const team = await listBusinessTeam(businessId);
  const canManageMembers = await canManageMembersPromise;

  return (
    <section className={styles.section} id="team" aria-labelledby="team-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.team.eyebrow")}</p>
          <h2 id="team-title">{t("ops.team.title")}</h2>
        </div>
        <p className={styles.meta}>{t("ops.team.intro")}</p>
      </div>
      {team.state === "unavailable" ? (
        <p className={styles.empty}>{t("ops.team.unavailable")}</p>
      ) : (
        <>
          <ol className={styles.list}>
            {team.members.map((member) => (
              <li className={styles.inboxItem} key={member.membershipId}>
                <div>
                  <strong lang={authoredTextLang}>{member.name}</strong> ·{" "}
                  {member.email}
                </div>
                <p className={styles.meta}>
                  {t("ops.team.role", { role: memberRoleTag(t, member.role) })}
                </p>
                {canManageMembers ? (
                  <div className={styles.actions}>
                    <form action={changeMemberRoleAction}>
                      {hidden("businessId", businessId)}
                      {hidden("membershipId", member.membershipId)}
                      <label htmlFor={`role-${member.membershipId}`}>
                        {t("ops.team.roleLabel")}
                      </label>
                      <select
                        id={`role-${member.membershipId}`}
                        name="role"
                        defaultValue={member.role}
                      >
                        {businessMembershipRoles
                          .filter(
                            (role) =>
                              role !== "owner" || member.role === "owner",
                          )
                          .map((role) => (
                            <option key={role} value={role}>
                              {memberRoleTag(t, role)}
                            </option>
                          ))}
                      </select>
                      <button className="button" type="submit">
                        {t("ops.team.updateRole")}
                      </button>
                    </form>
                    <form action={removeMemberAction}>
                      {hidden("businessId", businessId)}
                      {hidden("membershipId", member.membershipId)}
                      <button
                        className={`button ${styles.danger}`}
                        type="submit"
                      >
                        {t("ops.team.remove")}
                      </button>
                    </form>
                  </div>
                ) : null}
                {canManageMembers && member.role !== "owner" ? (
                  <details className={styles.card}>
                    <summary>{t("ops.team.ownerTitle")}</summary>
                    <form action={transferOwnershipAction}>
                      {hidden("businessId", businessId)}
                      {hidden("membershipId", member.membershipId)}
                      <p>{t("ops.team.ownerIntro")}</p>
                      <div className={styles.field}>
                        <label htmlFor={`owner-mode-${member.membershipId}`}>
                          {t("ops.team.ownerMode")}
                        </label>
                        <select
                          id={`owner-mode-${member.membershipId}`}
                          name="mode"
                          defaultValue="transfer"
                        >
                          <option value="transfer">
                            {t("ops.team.ownerModeTransfer")}
                          </option>
                          <option value="share">
                            {t("ops.team.ownerModeShare")}
                          </option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`owner-confirm-${member.membershipId}`}>
                          {t("ops.team.ownerConfirm", { name: businessName })}
                        </label>
                        <input
                          id={`owner-confirm-${member.membershipId}`}
                          name="confirmName"
                          required
                          autoComplete="off"
                          maxLength={200}
                          lang={authoredTextLang}
                        />
                      </div>
                      <button
                        className={`button ${styles.danger}`}
                        type="submit"
                      >
                        {t("ops.team.ownerSubmit")}
                      </button>
                    </form>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
          {team.invitations.length > 0 ? (
            <>
              <h3>{t("ops.team.pending")}</h3>
              <ol className={styles.list}>
                {team.invitations.map((invitation) => (
                  <li className={styles.inboxItem} key={invitation.id}>
                    <div>
                      <strong>{invitation.email}</strong> ·{" "}
                      {invitationRoleLabels[invitation.role]
                        ? t(invitationRoleLabels[invitation.role]!)
                        : invitation.role}
                    </div>
                    <p className={styles.meta}>
                      {invitation.isExpired
                        ? t("ops.team.expired")
                        : t("ops.team.expires", {
                            date: formatDate(invitation.expiresAt, i18n),
                          })}
                      {invitation.invitedByName
                        ? t("ops.team.invitedBy", {
                            name: invitation.invitedByName,
                          })
                        : ""}
                    </p>
                    {canManageMembers ? (
                      <form action={revokeInvitationAction}>
                        {hidden("businessId", businessId)}
                        {hidden("invitationId", invitation.id)}
                        <button
                          className={`button ${styles.danger}`}
                          type="submit"
                        >
                          {t("ops.team.revoke")}
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          {canManageMembers ? (
            <form className={styles.card} action={inviteMemberAction}>
              {hidden("businessId", businessId)}
              <h3>{t("ops.team.inviteTitle")}</h3>
              <div className={styles.field}>
                <label htmlFor="invite-email">{t("ops.team.email")}</label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="invite-role">{t("ops.team.roleLabel")}</label>
                <select id="invite-role" name="role" defaultValue="editor">
                  {businessInvitationRoles.map((role) => (
                    <option key={role} value={role}>
                      {invitationRoleLabels[role]
                        ? t(invitationRoleLabels[role]!)
                        : role}
                    </option>
                  ))}
                </select>
              </div>
              <button className="button primary" type="submit">
                {t("ops.team.send")}
              </button>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}
