import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  Eraser,
  Lock,
  Receipt,
  ShieldCheck,
  ShoppingBasket,
  Utensils,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../../context/AuthContext";
import {
  getWorkspaceData,
  resetActivityData,
} from "../../services/dataService";

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const DataManagement = () => {
  const { user } = useContext(AuthContext);

  const [mess, setMess] = useState(null);
  const [members, setMembers] = useState([]);
  const [mealCount, setMealCount] = useState(0);
  const [bazaarCount, setBazaarCount] =
    useState(0);
  const [receiptCount, setReceiptCount] =
    useState(0);
  const [confirmation, setConfirmation] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] =
    useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        const bazaarEntries =
          data.bazaarEntries || [];

        setMess(data.mess || null);
        setMembers(data.members || []);
        setMealCount(data.meals?.length || 0);
        setBazaarCount(bazaarEntries.length);
        setReceiptCount(
          bazaarEntries.filter(
            (entry) =>
              entry.receiptPath ||
              entry.receipt
          ).length
        );
      } catch (error) {
        console.error(
          "Unable to load data management:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load activity information."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

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

  const confirmationIsValid =
    confirmation.trim().toUpperCase() ===
    "RESET";

  const handleReset = async () => {
    if (!isManager) {
      toast.error(
        "Only a manager can reset mess activity."
      );
      return;
    }

    if (!confirmationIsValid) {
      toast.error(
        'Type "RESET" to confirm this action.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Reset all meal and bazaar activity for "${mess?.name}"? Members and mess information will remain.`
    );

    if (!confirmed) {
      return;
    }

    setResetting(true);

    try {
      await resetActivityData();

      setMealCount(0);
      setBazaarCount(0);
      setReceiptCount(0);
      setConfirmation("");

      toast.success(
        "Mess activity data reset successfully."
      );
    } catch (error) {
      console.error(
        "Unable to reset activity:",
        error
      );

      toast.error(
        error.message ||
          "Unable to reset mess activity."
      );
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page-state">
        Loading data information...
      </div>
    );
  }

  if (!isManager) {
    return (
      <section className="settings-access-card">
        <div className="settings-access-icon">
          <Lock size={25} />
        </div>

        <span>Manager permission required</span>

        <h2>Data management is protected</h2>

        <p>
          Only an active manager of this mess can
          reset its activity data.
        </p>

        <Link
          to="/settings"
          className="settings-back-button"
        >
          <ArrowLeft size={16} />
          Back to Settings
        </Link>
      </section>
    );
  }

  return (
    <div className="data-management-page">
      <header className="settings-subpage-header">
        <div>
          <span className="settings-subpage-eyebrow">
            <Database size={14} />
            Current mess only
          </span>

          <h2>Data Management</h2>

          <p>
            Manage activity belonging only to{" "}
            <strong>
              {mess?.name || "this mess"}
            </strong>
            .
          </p>
        </div>

        <div className="settings-manager-badge">
          <ShieldCheck size={17} />

          <div>
            <span>Authorized manager</span>

            <strong>
              {currentMember?.name}
            </strong>
          </div>
        </div>
      </header>

      <section className="data-scope-notice">
        <ShieldCheck size={19} />

        <div>
          <strong>Mess-isolated action</strong>

          <p>
            এই action শুধু বর্তমান mess-এর data
            পরিবর্তন করবে। অন্য কোনো mess-এর data
            দেখা বা delete করা হবে না।
          </p>
        </div>
      </section>

      <section className="data-summary-grid">
        <article>
          <div className="data-summary-icon meals">
            <Utensils size={18} />
          </div>

          <div>
            <span>Meal records</span>
            <strong>{mealCount}</strong>
          </div>
        </article>

        <article>
          <div className="data-summary-icon bazaar">
            <ShoppingBasket size={18} />
          </div>

          <div>
            <span>Bazaar entries</span>
            <strong>{bazaarCount}</strong>
          </div>
        </article>

        <article>
          <div className="data-summary-icon receipt">
            <Receipt size={18} />
          </div>

          <div>
            <span>Receipts</span>
            <strong>{receiptCount}</strong>
          </div>
        </article>

        <article>
          <div className="data-summary-icon members">
            <Users size={18} />
          </div>

          <div>
            <span>Members preserved</span>
            <strong>{members.length}</strong>
          </div>
        </article>
      </section>

      <section className="activity-reset-card">
        <div className="activity-reset-heading">
          <div className="activity-reset-icon">
            <Eraser size={21} />
          </div>

          <div>
            <span>Protected manager action</span>

            <h3>Reset Mess Activity</h3>

            <p>
              Remove all meal and bazaar activity
              from this mess without deleting the
              mess or its members.
            </p>
          </div>
        </div>

        <div className="activity-reset-columns">
          <div>
            <strong>Data that will be deleted</strong>

            <ul className="reset-delete-list">
              <li>
                <Utensils size={14} />
                All meal records
              </li>

              <li>
                <ShoppingBasket size={14} />
                All bazaar entries and items
              </li>

              <li>
                <Receipt size={14} />
                All uploaded bazaar receipts
              </li>
            </ul>
          </div>

          <div>
            <strong>Data that will remain</strong>

            <ul className="reset-preserve-list">
              <li>
                <ShieldCheck size={14} />
                Mess information and joining code
              </li>

              <li>
                <Users size={14} />
                Members and manager roles
              </li>

              <li>
                <ShieldCheck size={14} />
                Login accounts and permissions
              </li>
            </ul>
          </div>
        </div>

        <div className="activity-reset-warning">
          <AlertTriangle size={18} />

          <div>
            <strong>
              This action cannot be undone
            </strong>

            <p>
              Reset করার আগে প্রয়োজনীয় report বা
              হিসাব সংরক্ষণ করে রাখো।
            </p>
          </div>
        </div>

        <div className="activity-reset-confirmation">
          <label htmlFor="resetConfirmation">
            Confirm by typing{" "}
            <strong>RESET</strong>
          </label>

          <div>
            <input
              id="resetConfirmation"
              type="text"
              value={confirmation}
              placeholder="Type RESET"
              autoComplete="off"
              disabled={resetting}
              onChange={(event) =>
                setConfirmation(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="activity-reset-button"
              disabled={
                resetting ||
                !confirmationIsValid
              }
              onClick={handleReset}
            >
              <Eraser size={16} />

              {resetting
                ? "Resetting..."
                : "Reset Activity"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DataManagement;