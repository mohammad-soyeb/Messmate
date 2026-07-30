import {
  useEffect,
  useState,
} from "react";
import {
  Edit3,
  ListChecks,
  Save,
  ShoppingBasket,
  UtensilsCrossed,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../hooks/useAuth";
import { getWorkspaceData } from "../services/dataService";
import "../styles/profile.css";

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
  return Number(entry.grandTotal ?? entry.price ?? 0);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const Profile = () => {
  const { user: accountUser, updateProfile } = useAuth();
  const [user, setUser] = useState(() => ({
    name: accountUser?.name || "",
    email: accountUser?.email || "",
    phone: accountUser?.phone || "",
    room: accountUser?.room || "",
  }));
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({
    meals: 0,
    bazaar: 0,
    bazaarEntries: 0,
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

        setStats({
          meals: data.meals.reduce(
            (sum, meal) =>
              sum + getMealTotal(meal),
            0
          ),
          bazaar: data.bazaarEntries.reduce(
            (sum, entry) =>
              sum + getBazaarTotal(entry),
            0
          ),
          bazaarEntries:
            data.bazaarEntries.length,
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
  }, []);

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

    if (!updatedUser.name || !updatedUser.email) {
      toast.error("Name and email are required.");
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
          <p>Keep your personal and mess details up to date.</p>
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
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>

          <div className="profile-identity">
            <span>MessMate member</span>
            <h2>{user.name || "Your name"}</h2>
            <p>{user.email || "Add your email"}</p>
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
              <p>{user.phone || "Not added yet"}</p>
            </div>
            <div className="info-box">
              <h4>Room</h4>
              <p>{user.room || "Not added yet"}</p>
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
            <h2>৳ {formatNumber(stats.bazaar)}</h2>
          </div>
        </article>

        <article className="stat-box">
          <span className="profile-stat-icon entries">
            <ListChecks size={21} />
          </span>
          <div>
            <span>Bazaar entries</span>
            <h2>{stats.bazaarEntries}</h2>
          </div>
        </article>
      </div>

      {editing && (
        <div className="profile-actions">
          <button type="button" onClick={saveProfile}>
            <Save size={17} />
            Save changes
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
