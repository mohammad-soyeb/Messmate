import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  Edit3,
  Save,
  ShoppingBasket,
  UtensilsCrossed,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../hooks/useAuth";
import { getWorkspaceData } from "../services/dataService";
import "../styles/profile.css";

const getMealTotal = (meal) => {
  return (
    Number(meal.breakfast || 0) +
    Number(meal.lunch || 0) +
    Number(meal.dinner || 0)
  );
};

const getBazaarTotal = (entry) => {
  return Number(entry.grandTotal || 0);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const getCurrentMonth = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
};

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const formatSignedMoney = (value) => {
  const amount = Number(value) || 0;

  const sign =
    amount > 0 ? "+" : amount < 0 ? "-" : "";

  return `${sign}৳ ${formatNumber(
    Math.abs(amount)
  )}`;
};

const Profile = () => {
  const {
    user: accountUser,
    updateProfile,
  } = useAuth();

  const [user, setUser] = useState({
    name: accountUser?.name || "",
    email: accountUser?.email || "",
    phone: accountUser?.phone || "",
    room: accountUser?.room || "",
  });

  const [editing, setEditing] = useState(false);

  const [stats, setStats] = useState({
    meals: 0,
    bazaar: 0,
    currentMonthBalance: 0,
  });

  useEffect(() => {
    setUser({
      name: accountUser?.name || "",
      email: accountUser?.email || "",
      phone: accountUser?.phone || "",
      room: accountUser?.room || "",
    });
  }, [accountUser]);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        const currentMonth = getCurrentMonth();

        const currentMember =
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
          });

        const monthlyMeals = data.meals.filter(
          (meal) =>
            meal.date?.startsWith(currentMonth)
        );

        const monthlyBazaar =
          data.bazaarEntries.filter((entry) =>
            entry.date?.startsWith(currentMonth)
          );

        const totalMonthlyMeals =
          monthlyMeals.reduce(
            (total, meal) =>
              total + getMealTotal(meal),
            0
          );

        const totalMonthlyBazaar =
          monthlyBazaar.reduce(
            (total, entry) =>
              total + getBazaarTotal(entry),
            0
          );

        const mealRate =
          totalMonthlyMeals > 0
            ? totalMonthlyBazaar /
              totalMonthlyMeals
            : 0;

        const myMonthlyMeals = currentMember
          ? monthlyMeals
              .filter(
                (meal) =>
                  meal.memberId ===
                  currentMember.id
              )
              .reduce(
                (total, meal) =>
                  total + getMealTotal(meal),
                0
              )
          : 0;

        const myMonthlyBazaar = currentMember
          ? monthlyBazaar
              .filter(
                (entry) =>
                  entry.memberId ===
                  currentMember.id
              )
              .reduce(
                (total, entry) =>
                  total +
                  getBazaarTotal(entry),
                0
              )
          : 0;

        const currentMonthBalance =
          myMonthlyBazaar -
          myMonthlyMeals * mealRate;

        setStats({
          meals: data.meals.reduce(
            (total, meal) =>
              total + getMealTotal(meal),
            0
          ),

          bazaar: data.bazaarEntries.reduce(
            (total, entry) =>
              total + getBazaarTotal(entry),
            0
          ),

          currentMonthBalance,
        });
      } catch (error) {
        console.error(
          "Unable to load profile stats:",
          error
        );
      }
    };

    loadStats();

    return () => {
      active = false;
    };
  }, [accountUser]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setUser((currentUser) => ({
      ...currentUser,
      [name]: value,
    }));
  };

  const saveProfile = async () => {
    const updatedUser = {
      ...user,
      name: user.name.trim(),
      email: user.email.trim(),
      phone: user.phone.trim(),
      room: user.room.trim(),
    };

    if (
      !updatedUser.name ||
      !updatedUser.email
    ) {
      toast.error(
        "Name and email are required."
      );
      return;
    }

    try {
      const savedUser = await updateProfile(
        updatedUser
      );

      setUser(savedUser);
      setEditing(false);

      toast.success(
        "Profile updated successfully."
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to update profile."
      );
    }
  };

  return (
    <div className="page-container profile-page">
      <div className="profile-page-heading">
        <div>
          <span>MY ACCOUNT</span>
          <h1>Profile</h1>

          <p>
            Keep your personal and mess details up
            to date.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            className="profile-edit-button"
            onClick={() => setEditing(true)}
          >
            <Edit3 size={17} />
            Edit profile
          </button>
        )}
      </div>

      <div className="profile-card">
        <div className="profile-top">
          <div className="profile-avatar">
            {user.name
              ? user.name.charAt(0).toUpperCase()
              : "U"}
          </div>

          <div className="profile-identity">
            <span>MessMate member</span>

            <h2>
              {user.name || "Your name"}
            </h2>

            <p>
              {user.email || "Add your email"}
            </p>
          </div>
        </div>

        {editing ? (
          <div className="profile-form">
            <label>
              Full name

              <input
                name="name"
                value={user.name}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </label>

            <label>
              Email address

              <input
                name="email"
                type="email"
                value={user.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Phone number

              <input
                name="phone"
                value={user.phone}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
              />
            </label>

            <label>
              Room

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
            <div className="info-box">
              <h4>Phone number</h4>
              <p>
                {user.phone || "Not added yet"}
              </p>
            </div>

            <div className="info-box">
              <h4>Room</h4>
              <p>
                {user.room || "Not added yet"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="profile-stats">
        <article className="stat-box">
          <span className="profile-stat-icon meals">
            <UtensilsCrossed size={21} />
          </span>

          <div>
            <span>Total recorded meals</span>
            <h2>{formatNumber(stats.meals)}</h2>
          </div>
        </article>

        <article className="stat-box">
          <span className="profile-stat-icon bazaar">
            <ShoppingBasket size={21} />
          </span>

          <div>
            <span>Total bazaar</span>

            <h2>
              ৳ {formatNumber(stats.bazaar)}
            </h2>
          </div>
        </article>

        <article className="stat-box">
          <span className="profile-stat-icon entries">
            <CircleDollarSign size={21} />
          </span>

          <div>
            <span>Current month balance</span>

            <h2
              style={{
                color:
                  stats.currentMonthBalance > 0
                    ? "#059669"
                    : stats.currentMonthBalance < 0
                      ? "#e11d48"
                      : "#d97706",
              }}
            >
              {formatSignedMoney(
                stats.currentMonthBalance
              )}
            </h2>
          </div>
        </article>
      </div>

      {editing && (
        <div className="profile-actions">
          <button
            type="button"
            onClick={saveProfile}
          >
            <Save size={17} />
            Save changes
          </button>

          <button
            type="button"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;