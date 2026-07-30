import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Link2,
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../../context/AuthContext";
import {
  getWorkspaceData,
  updateMember,
} from "../../services/dataService";

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const ManagerControl = () => {
  const { user } = useContext(AuthContext);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] =
    useState(null);

  useEffect(() => {
    let active = true;

    const loadMembers = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (active) {
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error(
          "Unable to load manager controls:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load manager controls."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      active = false;
    };
  }, []);

  const currentMember = useMemo(() => {
    if (!user) {
      return null;
    }

    return (
      members.find((member) => {
        if (member.userId && user.id) {
          return member.userId === user.id;
        }

        const sameEmail =
          user.email &&
          member.email &&
          normalizeText(member.email) ===
            normalizeText(user.email);

        const sameName =
          user.name &&
          member.name &&
          normalizeText(member.name) ===
            normalizeText(user.name);

        return sameEmail || sameName;
      }) || null
    );
  }, [members, user]);

  const managerCount = useMemo(() => {
    return members.filter(
      (member) =>
        member.role === "manager" &&
        member.isActive !== false &&
        Boolean(member.userId)
    ).length;
  }, [members]);

  const connectedMemberCount = useMemo(() => {
    return members.filter((member) =>
      Boolean(member.userId)
    ).length;
  }, [members]);

  const isManager =
    currentMember?.role === "manager";

  const changeMemberRole = async (
    member,
    newRole
  ) => {
    if (!isManager) {
      toast.error(
        "Only a manager can change member roles."
      );
      return;
    }

    if (member.id === currentMember?.id) {
      toast.error(
        "You cannot change your own manager role."
      );
      return;
    }

    if (
      newRole === "manager" &&
      !member.userId
    ) {
      toast.error(
        "This member must join with an account before becoming a manager."
      );
      return;
    }

    if (
      member.role === "manager" &&
      newRole === "member" &&
      managerCount <= 1
    ) {
      toast.error(
        "At least one active manager must remain."
      );
      return;
    }

    const actionText =
      newRole === "manager"
        ? `make ${member.name} a manager`
        : `change ${member.name} back to a member`;

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(member.id);

    try {
      const updatedMember = await updateMember(
        member.id,
        {
          name: member.name,
          email: member.email,
          phone: member.phone,
          room: member.room,
          role: newRole,
        }
      );

      setMembers((currentMembers) =>
        currentMembers.map((current) =>
          current.id === updatedMember.id
            ? updatedMember
            : current
        )
      );

      toast.success(
        newRole === "manager"
          ? `${member.name} is now a manager.`
          : `${member.name} is now a member.`
      );
    } catch (error) {
      console.error(
        "Unable to update member role:",
        error
      );

      toast.error(
        error.message ||
          "Unable to update member role."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="members-page-state">
        Loading manager controls...
      </div>
    );
  }

  if (!isManager) {
    return (
      <section className="members-access-card">
        <div className="members-access-icon">
          <Lock size={27} />
        </div>

        <span>Manager permission required</span>

        <h2>Access denied</h2>

        <p>
          Only an active manager can view and change
          manager permissions.
        </p>

        <Link
          to="/members"
          className="members-back-button"
        >
          <ArrowLeft size={17} />
          Back to Member List
        </Link>
      </section>
    );
  }

  return (
    <div className="manager-control-page">
      <header className="members-subpage-header">
        <div>
          <span className="members-subpage-eyebrow">
            <ShieldCheck size={15} />
            Protected permissions
          </span>

          <h2>Manager Control</h2>

          <p>
            Assign or remove manager permissions
            without leaving the mess unmanaged.
          </p>
        </div>

        <div className="members-manager-badge">
          <Crown size={18} />

          <div>
            <span>Current manager</span>

            <strong>
              {currentMember?.name}
            </strong>
          </div>
        </div>
      </header>

      <section className="manager-summary-grid">
        <article>
          <div className="manager-summary-icon">
            <Users size={21} />
          </div>

          <div>
            <span>Total members</span>

            <strong>{members.length}</strong>
          </div>
        </article>

        <article>
          <div className="manager-summary-icon connected">
            <Link2 size={21} />
          </div>

          <div>
            <span>Connected accounts</span>

            <strong>
              {connectedMemberCount}
            </strong>
          </div>
        </article>

        <article className="primary">
          <div className="manager-summary-icon manager">
            <ShieldCheck size={21} />
          </div>

          <div>
            <span>Active managers</span>

            <strong>{managerCount}</strong>
          </div>
        </article>
      </section>

      <section className="manager-rule-card">
        <Shield size={21} />

        <div>
          <strong>Manager safety rules</strong>

          <ul>
            <li>
              একটি mess-এ অন্তত একজন active manager
              থাকতেই হবে।
            </li>

            <li>
              কোনো manager নিজের role নিজে পরিবর্তন
              করতে পারবে না।
            </li>

            <li>
              account-এর সঙ্গে connected নয় এমন
              member-কে manager করা যাবে না।
            </li>
          </ul>
        </div>
      </section>

      <section className="manager-list-card">
        <div className="manager-list-heading">
          <div>
            <h3>Member permissions</h3>

            <p>
              Select who can manage the mess.
            </p>
          </div>

          <span>
            {managerCount}{" "}
            {managerCount === 1
              ? "manager"
              : "managers"}
          </span>
        </div>

        <div className="manager-member-list">
          {members.length === 0 ? (
            <div className="members-page-state">
              No active members found.
            </div>
          ) : (
            members.map((member) => {
              const memberIsManager =
                member.role === "manager";

              const isCurrentMember =
                member.id === currentMember?.id;

              const hasConnectedAccount =
                Boolean(member.userId);

              const isUpdating =
                updatingId === member.id;

              const cannotDemote =
                memberIsManager &&
                (managerCount <= 1 ||
                  isCurrentMember);

              return (
                <article
                  key={member.id}
                  className={`manager-member-card ${
                    memberIsManager
                      ? "manager"
                      : ""
                  }`}
                >
                  <div className="manager-member-profile">
                    <div className="manager-member-avatar">
                      {member.name
                        ?.charAt(0)
                        .toUpperCase() || "M"}
                    </div>

                    <div>
                      <div className="manager-member-name">
                        <h4>{member.name}</h4>

                        {isCurrentMember && (
                          <span>You</span>
                        )}
                      </div>

                      <p>
                        {member.email ||
                          "No email address"}
                      </p>

                      <div className="manager-member-status">
                        {hasConnectedAccount ? (
                          <span className="connected">
                            <UserCheck size={13} />
                            Account connected
                          </span>
                        ) : (
                          <span className="not-connected">
                            <UserX size={13} />
                            Not connected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="manager-member-action">
                    {memberIsManager ? (
                      <span className="manager-role-badge">
                        <Crown size={14} />
                        Manager
                      </span>
                    ) : (
                      <span className="member-role-badge">
                        Member
                      </span>
                    )}

                    {memberIsManager ? (
                      <button
                        type="button"
                        className="manager-demote-button"
                        disabled={
                          isUpdating ||
                          cannotDemote
                        }
                        title={
                          isCurrentMember
                            ? "You cannot change your own role"
                            : managerCount <= 1
                              ? "At least one manager must remain"
                              : "Change to member"
                        }
                        onClick={() =>
                          changeMemberRole(
                            member,
                            "member"
                          )
                        }
                      >
                        <ShieldOff size={16} />

                        {isUpdating
                          ? "Updating..."
                          : "Make Member"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="manager-promote-button"
                        disabled={
                          isUpdating ||
                          !hasConnectedAccount
                        }
                        title={
                          hasConnectedAccount
                            ? "Assign manager role"
                            : "Member account must be connected first"
                        }
                        onClick={() =>
                          changeMemberRole(
                            member,
                            "manager"
                          )
                        }
                      >
                        {hasConnectedAccount ? (
                          <ShieldCheck size={16} />
                        ) : (
                          <Lock size={16} />
                        )}

                        {isUpdating
                          ? "Updating..."
                          : "Make Manager"}
                      </button>
                    )}
                  </div>

                  {memberIsManager && (
                    <div className="manager-card-mark">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default ManagerControl;