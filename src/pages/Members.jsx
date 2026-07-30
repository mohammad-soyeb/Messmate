import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Check,
  Copy,
  Edit3,
  KeyRound,
  Mail,
  Phone,
  Search,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../context/AuthContext";
import {
  addMember,
  getWorkspaceData,
  removeMember,
  updateMember,
} from "../services/dataService";
import {
  regenerateMessCode as requestNewMessCode,
} from "../services/messService";
import "../styles/members.css";

const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const getMealTotal = (meal) => {
  if (
    meal.breakfast !== undefined ||
    meal.lunch !== undefined ||
    meal.dinner !== undefined
  ) {
    return (
      Number(meal.breakfast || 0) +
      Number(meal.lunch || 0) +
      Number(meal.dinner || 0)
    );
  }

  return Number(meal.quantity || 0);
};

const getBazaarTotal = (entry) => {
  if (entry.grandTotal !== undefined) {
    return Number(entry.grandTotal || 0);
  }

  return Number(entry.price || 0);
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const formatMeal = (amount) => {
  const number = Number(amount) || 0;

  return Number.isInteger(number)
    ? String(number)
    : number
        .toFixed(2)
        .replace(/0+$/, "")
        .replace(/\.$/, "");
};

const Members = () => {
  const { user } = useContext(AuthContext);

  const [members, setMembers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [bazaarEntries, setBazaarEntries] =
    useState([]);

  const [messInfo, setMessInfo] = useState(null);
  const [codeCopied, setCodeCopied] =
    useState(false);

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [searchText, setSearchText] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  const [joinForm, setJoinForm] = useState({
    name: "",
    email: "",
    phone: "",
    room: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    room: "",
    role: "member",
  });

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        setMessInfo(data.mess);
        setMembers(data.members);
        setMeals(data.meals);
        setBazaarEntries(data.bazaarEntries);
      } catch (error) {
        console.error(
          "Unable to load members:",
          error
        );
        toast.error(
          error.message ||
            "Unable to load workspace data."
        );
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [user]);

  const currentMember = useMemo(() => {
    return (
      members.find((member) => {
        if (member.userId && user?.id) {
          return member.userId === user.id;
        }

        const sameEmail =
          user?.email &&
          member.email &&
          normalizeText(member.email) ===
            normalizeText(user.email);

        const sameName =
          user?.name &&
          member.name &&
          normalizeText(member.name) ===
            normalizeText(user.name);

        return sameEmail || sameName;
      }) || null
    );
  }, [members, user]);

  const currentUserIsManager =
    currentMember?.role === "manager";

  const monthlyMeals = useMemo(() => {
    return meals.filter((meal) =>
      meal.date?.startsWith(selectedMonth)
    );
  }, [meals, selectedMonth]);

  const monthlyBazaar = useMemo(() => {
    return bazaarEntries.filter((entry) =>
      entry.date?.startsWith(selectedMonth)
    );
  }, [bazaarEntries, selectedMonth]);

  const totalMonthlyMeal = useMemo(() => {
    return monthlyMeals.reduce(
      (total, meal) =>
        total + getMealTotal(meal),
      0
    );
  }, [monthlyMeals]);

  const totalMonthlyBazaar = useMemo(() => {
    return monthlyBazaar.reduce(
      (total, entry) =>
        total + getBazaarTotal(entry),
      0
    );
  }, [monthlyBazaar]);

  const mealRate =
    totalMonthlyMeal > 0
      ? totalMonthlyBazaar /
        totalMonthlyMeal
      : 0;

  const memberSummaries = useMemo(() => {
    return members.map((member) => {
      const memberMeals = monthlyMeals
        .filter((meal) => {
          if (meal.memberId) {
            return meal.memberId === member.id;
          }

          return (
            normalizeText(
              meal.memberName || meal.member
            ) === normalizeText(member.name)
          );
        })
        .reduce(
          (total, meal) =>
            total + getMealTotal(meal),
          0
        );

      const bazaarPaid = monthlyBazaar
        .filter((entry) => {
          if (entry.memberId) {
            return entry.memberId === member.id;
          }

          return (
            normalizeText(
              entry.memberName || entry.member
            ) === normalizeText(member.name)
          );
        })
        .reduce(
          (total, entry) =>
            total + getBazaarTotal(entry),
          0
        );

      const mealCost =
        memberMeals * mealRate;

      return {
        ...member,
        totalMeal: memberMeals,
        bazaarPaid,
        mealCost,
        balance: bazaarPaid - mealCost,
      };
    });
  }, [
    members,
    monthlyMeals,
    monthlyBazaar,
    mealRate,
  ]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch =
      normalizeText(searchText);

    if (!normalizedSearch) {
      return memberSummaries;
    }

    return memberSummaries.filter(
      (member) =>
        normalizeText(member.name).includes(
          normalizedSearch
        ) ||
        normalizeText(member.email).includes(
          normalizedSearch
        ) ||
        normalizeText(member.phone).includes(
          normalizedSearch
        ) ||
        normalizeText(member.room).includes(
          normalizedSearch
        )
    );
  }, [memberSummaries, searchText]);

  const handleJoinChange = (event) => {
    const { name, value } = event.target;

    setJoinForm((previousForm) => ({
      ...previousForm,
      [name]:
        name === "messCode"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const resetJoinForm = () => {
    setJoinForm({
      name: "",
      email: "",
      phone: "",
      room: "",
    });
  };

  const resetEditForm = () => {
    setEditingId(null);

    setEditForm({
      name: "",
      email: "",
      phone: "",
      room: "",
      role: "member",
    });
  };

  const handleJoinMess = async (event) => {
    event.preventDefault();

    const cleanName = joinForm.name.trim();
    const cleanEmail = joinForm.email.trim();
    const cleanPhone = joinForm.phone.trim();
    const cleanRoom = joinForm.room.trim();

    if (!cleanName) {
      toast.error("Member name is required.");
      return;
    }

    const duplicateMember = members.find(
      (member) => {
        const sameEmail =
          cleanEmail &&
          member.email &&
          normalizeText(member.email) ===
            normalizeText(cleanEmail);

        const samePhone =
          cleanPhone &&
          member.phone &&
          member.phone === cleanPhone;

        const sameName =
          normalizeText(member.name) ===
          normalizeText(cleanName);

        return sameEmail || samePhone || sameName;
      }
    );

    if (duplicateMember) {
      toast.error(
        "This member has already joined the mess."
      );
      return;
    }

    try {
      const newMember = await addMember({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        room: cleanRoom,
      });

      setMembers((currentMembers) => [
        ...currentMembers,
        newMember,
      ]);
      resetJoinForm();
      toast.success(
        `${cleanName} was added successfully.`
      );
    } catch (error) {
      toast.error(
        error.message || "Unable to add member."
      );
    }
  };

  const copyMessCode = async () => {
    if (!messInfo?.code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        messInfo.code
      );

      setCodeCopied(true);
      toast.success("Mess code copied.");

      setTimeout(() => {
        setCodeCopied(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error("Could not copy mess code.");
    }
  };

  const regenerateMessCode = async () => {
    if (!currentUserIsManager) {
      toast.error(
        "Only the manager can generate a new code."
      );
      return;
    }

    const shouldRegenerate = window.confirm(
      "Generate a new mess code? The previous code will stop working."
    );

    if (!shouldRegenerate) {
      return;
    }

    try {
      const code = await requestNewMessCode();
      setMessInfo((currentMess) => ({
        ...currentMess,
        code,
      }));
      setCodeCopied(false);
      toast.success("New mess code generated.");
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to regenerate the code."
      );
    }
  };

  const editMember = (member) => {
    if (
      !currentUserIsManager &&
      member.id !== currentMember?.id
    ) {
      toast.error(
        "You cannot edit another member."
      );
      return;
    }

    setEditingId(member.id);

    setEditForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      room: member.room || "",
      role: member.role || "member",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleUpdateMember = async (event) => {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    const cleanName = editForm.name.trim();

    if (!cleanName) {
      toast.error("Member name is required.");
      return;
    }

    const editingMember = members.find(
      (member) => member.id === editingId
    );
    const isLastManagerDemotion =
      editingMember?.role === "manager" &&
      editForm.role === "member" &&
      managerCount <= 1;

    if (isLastManagerDemotion) {
      toast.error(
        "Assign another manager before changing your role."
      );
      return;
    }

    try {
      const savedMember = await updateMember(
        editingId,
        {
          name: cleanName,
          email: editForm.email,
          phone: editForm.phone,
          room: editForm.room,
          role: currentUserIsManager
            ? editForm.role
            : undefined,
        }
      );

      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === editingId
            ? savedMember
            : member
        )
      );
      resetEditForm();
      toast.success(
        "Member updated successfully."
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to update member."
      );
    }
  };

  const deleteMember = async (member) => {
    if (!currentUserIsManager) {
      toast.error(
        "Only the manager can remove members."
      );
      return;
    }

    if (member.id === currentMember?.id) {
      toast.error(
        "You cannot remove your own manager profile."
      );
      return;
    }

    const shouldDelete = window.confirm(
      `Remove ${member.name} from this mess?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await removeMember(member.id);
      setMembers((currentMembers) =>
        currentMembers.filter(
          (savedMember) =>
            savedMember.id !== member.id
        )
      );

      if (editingId === member.id) {
        resetEditForm();
      }

      toast.success("Member removed.");
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to remove member."
      );
    }
  };

  const managerCount = members.filter(
    (member) =>
      member.role === "manager" &&
      member.userId
  ).length;

  return (
    <div className="page-container members-page">
      <div className="members-page-header">
        <div>
          <div className="members-heading-icon">
            <Users size={25} />
          </div>

          <div>
            <h1>Mess Members</h1>

            <p>
              Invite members with your mess code
              and manage joined members.
            </p>
          </div>
        </div>

        <div className="members-month-field">
          <label htmlFor="membersMonth">
            Summary month
          </label>

          <input
            id="membersMonth"
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(
                event.target.value
              )
            }
          />
        </div>
      </div>

      <div className="members-summary-grid">
        <div className="members-summary-card">
          <span>Total Members</span>
          <strong>{members.length}</strong>
          <small>Joined mess members</small>
        </div>

        <div className="members-summary-card">
          <span>Managers</span>
          <strong>{managerCount}</strong>
          <small>Manager accounts</small>
        </div>

        <div className="members-summary-card">
          <span>Monthly Meal</span>
          <strong>
            {formatMeal(totalMonthlyMeal)}
          </strong>
          <small>All members combined</small>
        </div>

        <div className="members-summary-card featured">
          <span>Meal Rate</span>
          <strong>
            ৳ {formatMoney(mealRate)}
          </strong>
          <small>
            Bazaar divided by meal
          </small>
        </div>
      </div>

      <section className="member-form-card">
        <div className="member-form-header">
          <div>
            <h2>Invite Members</h2>

            <p>
              Share this code with members to join
              the mess.
            </p>
          </div>

          {currentUserIsManager && (
            <button
              type="button"
              className="member-cancel-edit"
              onClick={regenerateMessCode}
            >
              <KeyRound size={17} />
              New Code
            </button>
          )}
        </div>

        <div
          style={{
            padding: "24px",
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) auto",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#64748b",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              YOUR MESS CODE
            </span>

            <strong
              style={{
                display: "block",
                color: "#2563eb",
                fontSize: "30px",
                letterSpacing: "3px",
              }}
            >
              {messInfo?.code || "Loading..."}
            </strong>
          </div>

          <button
            type="button"
            className="member-submit-button"
            onClick={copyMessCode}
          >
            {codeCopied ? (
              <Check size={18} />
            ) : (
              <Copy size={18} />
            )}

            {codeCopied ? "Copied" : "Copy Code"}
          </button>
        </div>
      </section>

      {editingId ? (
        <section className="member-form-card">
          <div className="member-form-header">
            <div>
              <h2>Update Member</h2>
              <p>Edit member information.</p>
            </div>

            <button
              type="button"
              className="member-cancel-edit"
              onClick={resetEditForm}
            >
              <X size={17} />
              Cancel Edit
            </button>
          </div>

          <form onSubmit={handleUpdateMember}>
            <div className="member-form-field">
              <label>
                Member name <span>*</span>
              </label>

              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleEditChange}
                required
              />
            </div>

            <div className="member-form-field">
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditChange}
              />
            </div>

            <div className="member-form-field">
              <label>Phone</label>

              <input
                type="tel"
                name="phone"
                value={editForm.phone}
                onChange={handleEditChange}
              />
            </div>

            <div className="member-form-field">
              <label>Room</label>

              <input
                type="text"
                name="room"
                value={editForm.room}
                onChange={handleEditChange}
              />
            </div>

            <div className="member-form-field">
              <label>Role</label>

              <select
                name="role"
                value={editForm.role}
                onChange={handleEditChange}
                disabled={!currentUserIsManager}
              >
                <option
                  value="member"
                  disabled={
                    members.find(
                      (member) =>
                        member.id === editingId
                    )?.role === "manager" &&
                    managerCount <= 1
                  }
                >
                  Member
                </option>

                <option
                  value="manager"
                  disabled={
                    !members.find(
                      (member) =>
                        member.id === editingId
                    )?.userId
                  }
                >
                  Manager
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="member-submit-button"
            >
              <Edit3 size={18} />
              Update Member
            </button>
          </form>
        </section>
      ) : currentUserIsManager ? (
        <section className="member-form-card">
          <div className="member-form-header">
            <div>
              <h2>Add an Offline Member</h2>

              <p>
                Add someone who does not need their
                own login yet.
              </p>
            </div>
          </div>

          <form onSubmit={handleJoinMess}>
            <div className="member-form-field">
              <label>
                Member name <span>*</span>
              </label>

              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={joinForm.name}
                onChange={handleJoinChange}
                required
              />
            </div>

            <div className="member-form-field">
              <label>Email</label>

              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                value={joinForm.email}
                onChange={handleJoinChange}
              />
            </div>

            <div className="member-form-field">
              <label>Phone</label>

              <input
                type="tel"
                name="phone"
                placeholder="01XXXXXXXXX"
                value={joinForm.phone}
                onChange={handleJoinChange}
              />
            </div>

            <div className="member-form-field">
              <label>Room</label>

              <input
                type="text"
                name="room"
                placeholder="Example: 102"
                value={joinForm.room}
                onChange={handleJoinChange}
              />
            </div>

            <button
              type="submit"
              className="member-submit-button"
            >
              <UserPlus size={18} />
              Add Member
            </button>
          </form>
        </section>
      ) : null}

      <section className="members-table-card">
        <div className="members-table-header">
          <div>
            <h2>Joined Members</h2>

            <p>
              Members who joined this mess.
            </p>
          </div>

          <div className="members-search-field">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search member..."
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
            />
          </div>
        </div>

        <div className="members-table-wrapper">
          <table className="members-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Contact</th>
                <th>Room</th>
                <th>Role</th>
                <th>Meal</th>
                <th>Meal Cost</th>
                <th>Bazaar Paid</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="members-empty-state"
                  >
                    No joined members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map(
                  (member, index) => (
                    <tr key={member.id}>
                      <td>{index + 1}</td>

                      <td>
                        <div className="member-profile-cell">
                          <div className="member-avatar">
                            {member.name
                              ?.charAt(0)
                              .toUpperCase() || "M"}
                          </div>

                          <div>
                            <strong>
                              {member.name}
                            </strong>

                            {member.id ===
                              currentMember?.id && (
                              <span>
                                Current user
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="member-contact-cell">
                          {member.phone && (
                            <span>
                              <Phone size={13} />
                              {member.phone}
                            </span>
                          )}

                          {member.email && (
                            <span>
                              <Mail size={13} />
                              {member.email}
                            </span>
                          )}

                          {!member.phone &&
                            !member.email && (
                              <span>
                                No contact
                              </span>
                            )}
                        </div>
                      </td>

                      <td>
                        {member.room || "—"}
                      </td>

                      <td>
                        <span
                          className={`member-role-badge ${member.role}`}
                        >
                          {member.role ===
                          "manager" ? (
                            <UserCog size={13} />
                          ) : (
                            <Users size={13} />
                          )}

                          {member.role}
                        </span>
                      </td>

                      <td>
                        <span className="member-meal-badge">
                          {formatMeal(
                            member.totalMeal
                          )}
                        </span>
                      </td>

                      <td>
                        ৳{" "}
                        {formatMoney(
                          member.mealCost
                        )}
                      </td>

                      <td>
                        ৳{" "}
                        {formatMoney(
                          member.bazaarPaid
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            member.balance > 0
                              ? "member-balance positive"
                              : member.balance < 0
                                ? "member-balance negative"
                                : "member-balance neutral"
                          }
                        >
                          {member.balance > 0
                            ? "+"
                            : member.balance < 0
                              ? "-"
                              : ""}
                          ৳{" "}
                          {formatMoney(
                            Math.abs(
                              member.balance
                            )
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="member-action-buttons">
                          <button
                            type="button"
                            className="member-edit-button"
                            onClick={() =>
                              editMember(member)
                            }
                          >
                            <Edit3 size={16} />
                          </button>

                          {currentUserIsManager &&
                            member.id !==
                              currentMember?.id && (
                              <button
                                type="button"
                                className="member-delete-button"
                                onClick={() =>
                                  deleteMember(member)
                                }
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Members;
