import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Check,
  Copy,
  Crown,
  DoorOpen,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../context/AuthContext";
import {
  getWorkspaceData,
  removeMember,
  updateMember,
} from "../services/dataService";
import { regenerateMessCode } from "../services/messService";
import "../styles/members.css";

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const formatJoinedDate = (dateString) => {
  if (!dateString) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
};

const Members = () => {
  const { user } = useContext(AuthContext);

  const [mess, setMess] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("all");
  const [editingMember, setEditingMember] =
    useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    room: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] =
    useState(null);
  const [regenerating, setRegenerating] =
    useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMembers = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        setMess(data.mess || null);
        setMembers(data.members || []);
      } catch (error) {
        console.error(
          "Unable to load members:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load members."
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

  const isManager =
    currentMember?.role === "manager";

  const managerCount = useMemo(() => {
    return members.filter(
      (member) =>
        member.role === "manager" &&
        member.isActive !== false &&
        Boolean(member.userId)
    ).length;
  }, [members]);

  const connectedCount = useMemo(() => {
    return members.filter((member) =>
      Boolean(member.userId)
    ).length;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const query = normalizeText(searchText);

    return members.filter((member) => {
      const matchesRole =
        roleFilter === "all"
          ? true
          : member.role === roleFilter;

      const searchableText = [
        member.name,
        member.email,
        member.phone,
        member.room,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = query
        ? searchableText.includes(query)
        : true;

      return matchesRole && matchesSearch;
    });
  }, [members, roleFilter, searchText]);

  const copyMessCode = async () => {
    if (!mess?.code) {
      toast.error("Mess code is not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        mess.code
      );

      setCopied(true);
      toast.success("Mess code copied.");

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      toast.error(
        "Unable to copy the mess code."
      );
    }
  };

  const handleRegenerateCode = async () => {
    if (!isManager) {
      toast.error(
        "Only a manager can generate a new code."
      );
      return;
    }

    const confirmed = window.confirm(
      "Generate a new mess code? The previous code will stop working."
    );

    if (!confirmed) {
      return;
    }

    setRegenerating(true);

    try {
      const result =
        await regenerateMessCode();

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Unable to generate a new code."
        );
      }

      setMess((currentMess) => ({
        ...currentMess,
        code:
          result.code ||
          result.mess?.code ||
          currentMess?.code,
      }));

      toast.success(
        "New mess code generated."
      );
    } catch (error) {
      console.error(
        "Code regeneration error:",
        error
      );

      toast.error(
        error.message ||
          "Unable to regenerate mess code."
      );
    } finally {
      setRegenerating(false);
    }
  };

  const openEditModal = (member) => {
    if (!isManager) {
      toast.error(
        "Only a manager can edit a member."
      );
      return;
    }

    setEditingMember(member);

    setEditForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      room: member.room || "",
    });
  };

  const closeEditModal = () => {
    if (saving) {
      return;
    }

    setEditingMember(null);
  };

  const handleEditInput = (event) => {
    const { name, value } = event.target;

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const saveMemberChanges = async (
    event
  ) => {
    event.preventDefault();

    if (!isManager || !editingMember) {
      return;
    }

    if (!editForm.name.trim()) {
      toast.error(
        "Member name is required."
      );
      return;
    }

    const email = normalizeText(
      editForm.email
    );

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      toast.error(
        "Please enter a valid email address."
      );
      return;
    }

    const duplicateEmail = members.some(
      (member) =>
        member.id !== editingMember.id &&
        email &&
        normalizeText(member.email) === email
    );

    if (duplicateEmail) {
      toast.error(
        "Another member already uses this email."
      );
      return;
    }

    setSaving(true);

    try {
      const updatedMember = await updateMember(
        editingMember.id,
        {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          room: editForm.room,
        }
      );

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === updatedMember.id
            ? updatedMember
            : member
        )
      );

      setEditingMember(null);

      toast.success(
        "Member information updated."
      );
    } catch (error) {
      console.error(
        "Unable to update member:",
        error
      );

      toast.error(
        error.message ||
          "Unable to update member."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (
    member
  ) => {
    if (!isManager) {
      toast.error(
        "Only a manager can remove a member."
      );
      return;
    }

    if (member.id === currentMember?.id) {
      toast.error(
        "You cannot remove your own manager profile."
      );
      return;
    }

    if (
      member.role === "manager" &&
      managerCount <= 1
    ) {
      toast.error(
        "Assign another manager before removing the last manager."
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${member.name} from this mess? Their previous meal and bazaar records will be preserved.`
    );

    if (!confirmed) {
      return;
    }

    setRemovingId(member.id);

    try {
      await removeMember(member.id);

      setMembers((currentMembers) =>
        currentMembers.filter(
          (current) =>
            current.id !== member.id
        )
      );

      toast.success(
        `${member.name} removed successfully.`
      );
    } catch (error) {
      console.error(
        "Unable to remove member:",
        error
      );

      toast.error(
        error.message ||
          "Unable to remove member."
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="member-list-page">
      <header className="members-subpage-header">
        <div>
          <span className="members-subpage-eyebrow">
            <Users size={15} />
            Active member directory
          </span>

          <h2>Member List</h2>

          <p>
            View active members and manage their
            contact information.
          </p>
        </div>

        <div className="member-list-count">
          <UserCheck size={18} />

          <div>
            <span>Active members</span>

            <strong>{members.length}</strong>
          </div>
        </div>
      </header>

      <section className="mess-code-card">
        <div className="mess-code-information">
          <div className="mess-code-icon">
            <KeyRound size={22} />
          </div>

          <div>
            <span>Mess joining code</span>

            <strong>
              {mess?.code || "Unavailable"}
            </strong>

            <p>
              Share this code with members who need
              to join the mess.
            </p>
          </div>
        </div>

        <div className="mess-code-actions">
          <button
            type="button"
            className="mess-code-copy"
            disabled={!mess?.code}
            onClick={copyMessCode}
          >
            {copied ? (
              <Check size={17} />
            ) : (
              <Copy size={17} />
            )}

            {copied ? "Copied" : "Copy Code"}
          </button>

          {isManager && (
            <button
              type="button"
              className="mess-code-regenerate"
              disabled={regenerating}
              onClick={handleRegenerateCode}
            >
              <RefreshCw
                size={17}
                className={
                  regenerating
                    ? "spinning"
                    : ""
                }
              />

              {regenerating
                ? "Generating..."
                : "New Code"}
            </button>
          )}
        </div>
      </section>

      <section className="member-summary-grid">
        <article>
          <span>Total members</span>
          <strong>{members.length}</strong>
          <small>Currently active</small>
        </article>

        <article>
          <span>Managers</span>
          <strong>{managerCount}</strong>
          <small>Active mess managers</small>
        </article>

        <article>
          <span>Connected accounts</span>
          <strong>{connectedCount}</strong>
          <small>Joined login accounts</small>
        </article>
      </section>

      <section className="member-filter-card">
        <div className="member-search-control">
          <Search size={18} />

          <input
            type="search"
            value={searchText}
            placeholder="Search name, email, phone or room"
            onChange={(event) =>
              setSearchText(event.target.value)
            }
          />
        </div>

        <select
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(event.target.value)
          }
          aria-label="Filter members by role"
        >
          <option value="all">All roles</option>
          <option value="manager">
            Managers
          </option>
          <option value="member">
            Members
          </option>
        </select>
      </section>

      <section className="member-directory-card">
        <div className="member-directory-heading">
          <div>
            <h3>Active members</h3>

            <p>
              {filteredMembers.length} member
              {filteredMembers.length === 1
                ? ""
                : "s"}{" "}
              found.
            </p>
          </div>

          {!isManager && (
            <span className="member-readonly-label">
              View only
            </span>
          )}
        </div>

        <div className="member-list-grid">
          {loading ? (
            <div className="members-page-state">
              Loading members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="members-page-state">
              No members match your search.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isCurrentMember =
                member.id === currentMember?.id;

              return (
                <article
                  key={member.id}
                  className={`member-profile-card ${
                    isCurrentMember
                      ? "current"
                      : ""
                  }`}
                >
                  <div className="member-profile-top">
                    <div className="member-profile-avatar">
                      {member.name
                        ?.charAt(0)
                        .toUpperCase() || "M"}
                    </div>

                    <div className="member-profile-title">
                      <div>
                        <h4>{member.name}</h4>

                        {isCurrentMember && (
                          <span>You</span>
                        )}
                      </div>

                      {member.role ===
                      "manager" ? (
                        <div className="member-manager-role">
                          <Crown size={13} />
                          Manager
                        </div>
                      ) : (
                        <div className="member-normal-role">
                          Member
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="member-contact-list">
                    <div>
                      <Mail size={15} />

                      <span>
                        {member.email ||
                          "No email added"}
                      </span>
                    </div>

                    <div>
                      <Phone size={15} />

                      <span>
                        {member.phone ||
                          "No phone added"}
                      </span>
                    </div>

                    <div>
                      <DoorOpen size={15} />

                      <span>
                        {member.room
                          ? `Room ${member.room}`
                          : "No room added"}
                      </span>
                    </div>
                  </div>

                  <div className="member-account-status">
                    {member.userId ? (
                      <span className="connected">
                        <UserCheck size={14} />
                        Account connected
                      </span>
                    ) : (
                      <span className="pending">
                        Account not connected
                      </span>
                    )}

                    <small>
                      Joined{" "}
                      {formatJoinedDate(
                        member.joinedAt
                      )}
                    </small>
                  </div>

                  {isManager && (
                    <div className="member-card-actions">
                      <button
                        type="button"
                        className="member-edit-button"
                        onClick={() =>
                          openEditModal(member)
                        }
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="member-remove-button"
                        disabled={
                          removingId === member.id ||
                          isCurrentMember
                        }
                        onClick={() =>
                          handleRemoveMember(member)
                        }
                      >
                        <Trash2 size={15} />

                        {removingId === member.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      {editingMember && (
        <div
          className="member-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeEditModal();
            }
          }}
        >
          <form
            className="member-edit-modal"
            onSubmit={saveMemberChanges}
          >
            <div className="member-edit-heading">
              <div>
                <span>Edit member</span>

                <h3>{editingMember.name}</h3>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={closeEditModal}
                aria-label="Close edit modal"
              >
                <X size={18} />
              </button>
            </div>

            <label>
              <span>Full name</span>

              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleEditInput}
                required
              />
            </label>

            <label>
              <span>Email address</span>

              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditInput}
              />
            </label>

            <div className="member-edit-row">
              <label>
                <span>Phone number</span>

                <input
                  type="tel"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditInput}
                />
              </label>

              <label>
                <span>Room number</span>

                <input
                  type="text"
                  name="room"
                  value={editForm.room}
                  onChange={handleEditInput}
                />
              </label>
            </div>

            <div className="member-edit-note">
              <ShieldCheck size={16} />

              Role পরিবর্তন করতে Manager Control
              page ব্যবহার করো।
            </div>

            <div className="member-edit-footer">
              <button
                type="button"
                className="member-modal-cancel"
                disabled={saving}
                onClick={closeEditModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="member-modal-save"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Members;