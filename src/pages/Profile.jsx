import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Save,
  ShoppingBasket,
  ShieldCheck,
  UserRound,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../hooks/useAuth";
import { getWorkspaceData } from "../services/dataService";
import "../styles/profile.css";

const getCurrentMonth = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
};

const normalizeText = (value = "") =>
  String(value).trim().toLowerCase();

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

const isPersonalBazaarPayment = (entry) =>
  !entry.paymentSource ||
  entry.paymentSource === "personal";

const formatNumber = (value) => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits:
      Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatMonthName = (monthValue) => {
  const [year, month] = monthValue.split("-");

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
};

const Profile = () => {
  const {
    user: accountUser,
    updateProfile,
  } = useAuth();

  const createUserState = () => ({
    name: accountUser?.name || "",
    email: accountUser?.email || "",
    phone: accountUser?.phone || "",
    room: accountUser?.room || "",
  });

  const [user, setUser] = useState(
    createUserState
  );

  const [originalUser, setOriginalUser] =
    useState(createUserState);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [workspace, setWorkspace] = useState({
    mess: null,
    member: null,
  });

  const [stats, setStats] = useState({
    totalMeal: 0,
    mealRate: 0,
    mealBill: 0,
    openingBalance: 0,
    deposits: 0,
    bazaarPaid: 0,
    balance: 0,
  });

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    setUser((currentUser) => ({
      ...currentUser,
      name: accountUser?.name || "",
      email: accountUser?.email || "",
      phone: accountUser?.phone || "",
      room: accountUser?.room || "",
    }));
  }, [accountUser]);

  useEffect(() => {
    let active = true;

    const loadProfileData = async () => {
      try {
        setLoading(true);

        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        const currentMember =
          data.member ||
          data.members.find(
            (member) =>
              member.userId === accountUser?.id
          ) ||
          data.members.find((member) => {
            const sameEmail =
              accountUser?.email &&
              member.email &&
              normalizeText(member.email) ===
                normalizeText(
                  accountUser.email
                );

            const sameName =
              accountUser?.name &&
              member.name &&
              normalizeText(member.name) ===
                normalizeText(
                  accountUser.name
                );

            return sameEmail || sameName;
          }) ||
          null;

        const monthlyMeals = data.meals.filter(
          (meal) =>
            meal.date?.startsWith(currentMonth)
        );

        const monthlyBazaar =
          data.bazaarEntries.filter((entry) =>
            entry.date?.startsWith(currentMonth)
          );

        const monthlyFinancialEntries =
          (data.financialEntries || []).filter(
            (entry) => entry.month === currentMonth
          );

        const messTotalMeals =
          monthlyMeals.reduce(
            (total, meal) =>
              total + getMealTotal(meal),
            0
          );

        const messTotalBazaar =
          monthlyBazaar.reduce(
            (total, entry) =>
              total + getBazaarTotal(entry),
            0
          );

        const mealRate =
          messTotalMeals > 0
            ? messTotalBazaar /
              messTotalMeals
            : 0;

        const memberId = currentMember?.id;

        const myMeals = memberId
          ? monthlyMeals
              .filter(
                (meal) =>
                  meal.memberId === memberId
              )
              .reduce(
                (total, meal) =>
                  total + getMealTotal(meal),
                0
              )
          : 0;

        const myBazaar = memberId
          ? monthlyBazaar
              .filter(
                (entry) =>
                  entry.memberId === memberId &&
                  isPersonalBazaarPayment(entry)
              )
              .reduce(
                (total, entry) =>
                  total +
                  getBazaarTotal(entry),
                0
              )
          : 0;

        const myFinancialEntries = memberId
          ? monthlyFinancialEntries.filter(
              (entry) =>
                entry.memberId === memberId
            )
          : [];

        const openingBalance =
          myFinancialEntries
            .filter(
              (entry) =>
                entry.type === "opening_balance"
            )
            .reduce(
              (total, entry) =>
                total + Number(entry.amount || 0),
              0
            );

        const deposits = myFinancialEntries
          .filter(
            (entry) => entry.type === "deposit"
          )
          .reduce(
            (total, entry) =>
              total + Number(entry.amount || 0),
            0
          );

        const mealBill = myMeals * mealRate;
        const balance =
          openingBalance +
          deposits +
          myBazaar -
          mealBill;

        const nextUser = {
          name:
            accountUser?.name ||
            currentMember?.name ||
            "",
          email:
            accountUser?.email ||
            currentMember?.email ||
            "",
          phone:
            accountUser?.phone ||
            currentMember?.phone ||
            "",
          room:
            accountUser?.room ||
            currentMember?.room ||
            "",
        };

        setUser(nextUser);
        setOriginalUser(nextUser);

        setWorkspace({
          mess: data.mess || null,
          member: currentMember,
        });

        setStats({
          totalMeal: myMeals,
          mealRate,
          mealBill,
          openingBalance,
          deposits,
          bazaarPaid: myBazaar,
          balance,
        });
      } catch (error) {
        console.error(
          "Unable to load profile:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load profile information."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (accountUser?.id) {
      loadProfileData();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [
    accountUser?.id,
    accountUser?.email,
    accountUser?.name,
    accountUser?.phone,
    accountUser?.room,
    currentMonth,
  ]);

  const displayName = useMemo(() => {
    return user.name?.trim() || "Member";
  }, [user.name]);

  const balanceStatus = useMemo(() => {
    if (stats.balance > 0.005) {
      return {
        label: "You will receive",
        shortLabel: "পাবেন",
        type: "positive",
      };
    }

    if (stats.balance < -0.005) {
      return {
        label: "You need to pay",
        shortLabel: "দিতে হবে",
        type: "negative",
      };
    }

    return {
      label: "Balance settled",
      shortLabel: "সমান",
      type: "neutral",
    };
  }, [stats.balance]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setUser((currentUser) => ({
      ...currentUser,
      [name]: value,
    }));
  };

  const startEditing = () => {
    setOriginalUser({ ...user });
    setEditing(true);
  };

  const cancelEditing = () => {
    setUser({ ...originalUser });
    setEditing(false);
  };

  const saveProfile = async () => {
    const updatedUser = {
      name: user.name.trim(),
      email: user.email.trim(),
      phone: user.phone.trim(),
      room: user.room.trim(),
    };

    if (!updatedUser.name) {
      toast.error("Name is required.");
      return;
    }

    if (!updatedUser.email) {
      toast.error("Email is required.");
      return;
    }

    try {
      setSaving(true);

      const savedAccount = await updateProfile({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        room: updatedUser.room,
      });

      const nextUser = {
        name:
          savedAccount?.name ||
          updatedUser.name,
        email:
          savedAccount?.email ||
          updatedUser.email,
        phone:
          savedAccount?.phone ||
          updatedUser.phone,
        room:
          savedAccount?.room ||
          updatedUser.room,
      };

      setUser(nextUser);
      setOriginalUser(nextUser);

      setEditing(false);

      toast.success(
        "Profile updated successfully."
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loader" />

        <span>Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-page-heading">
        <div>
          <span>MY ACCOUNT</span>
          <h1>Profile</h1>

          <p>
            Personal details and current monthly
            statement.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            className="profile-edit-button"
            onClick={startEditing}
          >
            <Edit3 size={16} />
            Edit profile
          </button>
        )}
      </header>

      <section className="profile-card">
        <div className="profile-top">
          <div className="profile-avatar">
            {displayName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="profile-identity">
            <span>
              {workspace.member?.role ===
              "manager"
                ? "Mess manager"
                : "Mess member"}
            </span>

            <h2>{user.name || "Your name"}</h2>

            <div className="profile-identity-meta">
              <p>
                {user.email ||
                  "Email unavailable"}
              </p>
            </div>
          </div>

          <div
            className={`profile-balance-status ${balanceStatus.type}`}
          >
            <CheckCircle2 size={15} />

            <div>
              <span>
                {balanceStatus.label}
              </span>

              <strong>
                {balanceStatus.shortLabel}
              </strong>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="profile-form">
            <label>
              <span>Full name</span>

              <input
                name="name"
                value={user.name}
                onChange={handleChange}
                placeholder="Your full name"
                autoComplete="name"
              />
            </label>

            <label>
              <span>Email address</span>

              <input
                name="email"
                type="email"
                value={user.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label>
              <span>Phone number</span>

              <input
                name="phone"
                value={user.phone}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
              />
            </label>

            <label>
              <span>Room</span>

              <input
                name="room"
                value={user.room}
                onChange={handleChange}
                placeholder="Room number"
              />
            </label>
          </div>
        ) : (
          <div className="profile-info">
            <article className="info-box">
              <div className="profile-info-icon">
                <UserRound size={15} />
              </div>

              <div>
                <h4>Display name</h4>
                <p>{displayName}</p>
              </div>
            </article>

            <article className="info-box">
              <div className="profile-info-icon">
                <Phone size={15} />
              </div>

              <div>
                <h4>Phone number</h4>

                <p>
                  {user.phone ||
                    "Not added yet"}
                </p>
              </div>
            </article>

            <article className="info-box">
              <div className="profile-info-icon">
                <MapPin size={15} />
              </div>

              <div>
                <h4>Room</h4>

                <p>
                  {user.room ||
                    "Not added yet"}
                </p>
              </div>
            </article>

            <article className="info-box">
              <div className="profile-info-icon">
                <Mail size={15} />
              </div>

              <div>
                <h4>Email</h4>

                <p>
                  {user.email ||
                    "Not available"}
                </p>
              </div>
            </article>

            <article className="info-box">
              <div className="profile-info-icon">
                <ShieldCheck size={15} />
              </div>

              <div>
                <h4>Role</h4>

                <p>
                  {workspace.member?.role ===
                  "manager"
                    ? "Manager"
                    : "Member"}
                </p>
              </div>
            </article>

            <article className="info-box">
              <div className="profile-info-icon">
                <ReceiptText size={15} />
              </div>

              <div>
                <h4>Mess</h4>

                <p>
                  {workspace.mess?.name ||
                    "Not available"}
                </p>
              </div>
            </article>

            <article className="info-box">
              <div className="profile-info-icon">
                <CalendarDays size={15} />
              </div>

              <div>
                <h4>Joined</h4>

                <p>
                  {formatDate(
                    workspace.member?.joinedAt
                  )}
                </p>
              </div>
            </article>
          </div>
        )}
      </section>

      <div className="profile-statement-heading">
        <div>
          <span>Current statement</span>

          <h2>
            {formatMonthName(currentMonth)}
          </h2>
        </div>

        <small>
          Meal rate: ৳
          {formatMoney(stats.mealRate)}
        </small>
      </div>

      <section className="profile-stats">
        <article className="stat-box">
          <span className="profile-stat-icon bill">
            <Wallet size={19} />
          </span>

          <div>
            <span>Opening balance</span>

            <h2>
              {stats.openingBalance > 0 ? "+" : ""}
              {stats.openingBalance < 0 ? "−" : ""}
              ৳
              {formatMoney(
                Math.abs(stats.openingBalance)
              )}
            </h2>
          </div>
        </article>

        <article className="stat-box">
          <span className="profile-stat-icon balance">
            <CircleDollarSign size={19} />
          </span>

          <div>
            <span>Advance deposit</span>

            <h2>
              ৳{formatMoney(stats.deposits)}
            </h2>
          </div>
        </article>

        <article className="stat-box">
          <span className="profile-stat-icon meals">
            <UtensilsCrossed size={19} />
          </span>

          <div>
            <span>My total meals</span>

            <h2>
              {formatNumber(stats.totalMeal)}
            </h2>
          </div>
        </article>

        <article className="stat-box">
          <span className="profile-stat-icon bill">
            <ReceiptText size={19} />
          </span>

          <div>
            <span>My meal bill</span>

            <h2>
              ৳{formatMoney(stats.mealBill)}
            </h2>
          </div>
        </article>

        <article className="stat-box">
          <span className="profile-stat-icon bazaar">
            <ShoppingBasket size={19} />
          </span>

          <div>
            <span>
              My bazaar contribution
            </span>

            <h2>
              ৳{formatMoney(stats.bazaarPaid)}
            </h2>
          </div>
        </article>

        <article
          className={`stat-box balance-card ${balanceStatus.type}`}
        >
          <span className="profile-stat-icon balance">
            <CircleDollarSign size={19} />
          </span>

          <div>
            <span>
              Current month balance
            </span>

            <h2>
              {stats.balance > 0 ? "+" : ""}
              {stats.balance < 0 ? "−" : ""}
              ৳
              {formatMoney(
                Math.abs(stats.balance)
              )}
            </h2>

            <small>
              {balanceStatus.shortLabel}
            </small>
          </div>
        </article>
      </section>

      {editing && (
        <div className="profile-actions">
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
          >
            <Save size={16} />

            {saving
              ? "Saving..."
              : "Save changes"}
          </button>

          <button
            type="button"
            onClick={cancelEditing}
            disabled={saving}
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
