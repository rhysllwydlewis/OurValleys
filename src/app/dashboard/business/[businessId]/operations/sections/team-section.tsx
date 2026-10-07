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
} from "../actions";
import styles from "../operations.module.css";
import { formatDate, hidden, hasPermission } from "./shared";

const invitationRoleLabels: Record<string, string> = {
  manager: "Manager",
  editor: "Editor",
  viewer: "Viewer",
};

export async function TeamSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
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
          <p className="eyebrow">Team</p>
          <h2 id="team-title">Members and invitations</h2>
        </div>
        <p className={styles.meta}>
          Owners can invite managers, editors and viewers, and can revoke access
          at any time. At least one owner always remains.
        </p>
      </div>
      {team.state === "unavailable" ? (
        <p className={styles.empty}>
          Team details are temporarily unavailable.
        </p>
      ) : (
        <>
          <ol className={styles.list}>
            {team.members.map((member) => (
              <li className={styles.inboxItem} key={member.membershipId}>
                <div>
                  <strong>{member.name}</strong> · {member.email}
                </div>
                <p className={styles.meta}>Role: {member.role}</p>
                {canManageMembers ? (
                  <div className={styles.actions}>
                    <form action={changeMemberRoleAction}>
                      {hidden("businessId", businessId)}
                      {hidden("membershipId", member.membershipId)}
                      <label htmlFor={`role-${member.membershipId}`}>
                        Role
                      </label>
                      <select
                        id={`role-${member.membershipId}`}
                        name="role"
                        defaultValue={member.role}
                      >
                        {businessMembershipRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button className="button" type="submit">
                        Update role
                      </button>
                    </form>
                    <form action={removeMemberAction}>
                      {hidden("businessId", businessId)}
                      {hidden("membershipId", member.membershipId)}
                      <button
                        className={`button ${styles.danger}`}
                        type="submit"
                      >
                        Remove from team
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          {team.invitations.length > 0 ? (
            <>
              <h3>Pending invitations</h3>
              <ol className={styles.list}>
                {team.invitations.map((invitation) => (
                  <li className={styles.inboxItem} key={invitation.id}>
                    <div>
                      <strong>{invitation.email}</strong> ·{" "}
                      {invitationRoleLabels[invitation.role]}
                    </div>
                    <p className={styles.meta}>
                      {invitation.isExpired
                        ? "Expired"
                        : `Expires ${formatDate(invitation.expiresAt)}`}
                      {invitation.invitedByName
                        ? ` · Invited by ${invitation.invitedByName}`
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
                          Revoke invitation
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
              <h3>Invite a team member</h3>
              <div className={styles.field}>
                <label htmlFor="invite-email">Email</label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="invite-role">Role</label>
                <select id="invite-role" name="role" defaultValue="editor">
                  {businessInvitationRoles.map((role) => (
                    <option key={role} value={role}>
                      {invitationRoleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>
              <button className="button primary" type="submit">
                Send invitation
              </button>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}
