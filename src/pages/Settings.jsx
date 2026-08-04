import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Copy,
  Database,
  KeyRound,
  Lock,
  Moon,
  Save,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import useTheme from "../hooks/useTheme";
import {
  getCurrentMessState,
  updateMessSettings,
} from "../services/messService";
import "../styles/settings.css";

const Settings = () => {
  const { darkMode, toggleTheme } =
    useTheme();

  const [mess, setMess] = useState(null);
  const [currentMember, setCurrentMember] =
    useState(null);
  const [messName, setMessName] =
    useState("");
  const [currency, setCurrency] =
    useState("৳");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [copied, setCopied] =
    useState(false);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setLoading(true);

      try {
        const state =
          await getCurrentMessState();

        if (!active || !state) {
          return;
        }

        setMess(state.mess);
        setCurrentMember(state.member);
        setMessName(state.mess.name || "");
        setCurrency(
          state.mess.currency || "৳"
        );
      } catch (error) {
        console.error(
          "Unable to load settings:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load mess settings."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const isManager =
    currentMember?.role === "manager";

  const hasChanges = useMemo(() => {
    if (!mess) {
      return false;
    }

    return (
      messName.trim() !== mess.name ||
      currency !== mess.currency
    );
  }, [currency, mess, messName]);

  const copyMessCode = async () => {
    if (!mess?.code) {
      toast.error(
        "Mess code is unavailable."
      );
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
        "Unable to copy mess code."
      );
    }
  };

  const saveSettings = async (
    event
  ) => {
    event.preventDefault();

    if (!isManager) {
      toast.error(
        "Only a manager can update mess settings."
      );
      return;
    }

    const cleanName = messName.trim();

    if (cleanName.length < 2) {
      toast.error(
        "Mess name must contain at least 2 characters."
      );
      return;
    }

    if (cleanName.length > 80) {
      toast.error(
        "Mess name cannot exceed 80 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const updatedMess =
        await updateMessSettings({
          name: cleanName,
          currency,
        });

      setMess((currentMess) => ({
        ...currentMess,
        name:
          updatedMess?.name || cleanName,
        currency:
          updatedMess?.currency || currency,
      }));

      setMessName(
        updatedMess?.name || cleanName
      );

      toast.success(
        "Mess settings saved successfully."
      );
    } catch (error) {
      console.error(
        "Unable to save settings:",
        error
      );

      toast.error(
        error.message ||
          "Unable to save mess settings."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page-state">
        Loading mess settings...
      </div>
    );
  }

  return (
    <div className="general-settings-page">
      <header className="settings-subpage-header">
        <div>
          <span className="settings-subpage-eyebrow">
            <SlidersHorizontal size={14} />
            General preferences
          </span>

          <h2>Mess Settings</h2>

          <p>
            View workspace information and configure
            how your mess is displayed.
          </p>
        </div>

        <div
          className={`settings-role-badge ${
            isManager ? "manager" : "member"
          }`}
        >
          {isManager ? (
            <ShieldCheck size={17} />
          ) : (
            <Users size={17} />
          )}

          <div>
            <span>Your permission</span>

            <strong>
              {isManager
                ? "Manager"
                : "Member"}
            </strong>
          </div>
        </div>
      </header>

      <section className="settings-overview-grid">
        <article>
          <span>Mess name</span>
          <strong>{mess?.name}</strong>
        </article>

        <article>
          <span>Joining code</span>
          <strong>{mess?.code}</strong>
        </article>

        <article>
          <span>Currency</span>
          <strong>
            {mess?.currency || "৳"}
          </strong>
        </article>

        <article>
          <span>Your role</span>
          <strong>
            {isManager
              ? "Manager"
              : "Member"}
          </strong>
        </article>
      </section>

      <div className="settings-content-grid">
        <form
          className="mess-preferences-card"
          onSubmit={saveSettings}
        >
          <div className="settings-card-heading">
            <div className="settings-card-icon">
              <SlidersHorizontal size={18} />
            </div>

            <div>
              <h3>Workspace preferences</h3>

              <p>
                Only a manager can change these
                settings.
              </p>
            </div>
          </div>

          {!isManager && (
            <div className="settings-readonly-notice">
              <Lock size={15} />

              You can view these settings, but only a
              manager can update them.
            </div>
          )}

          <label className="settings-form-field">
            <span>Mess name</span>

            <input
              type="text"
              value={messName}
              maxLength={80}
              disabled={!isManager || saving}
              onChange={(event) =>
                setMessName(
                  event.target.value
                )
              }
            />
          </label>

          <label className="settings-form-field">
            <span>Currency</span>

            <select
              value={currency}
              disabled={!isManager || saving}
              onChange={(event) =>
                setCurrency(
                  event.target.value
                )
              }
            >
              <option value="৳">
                ৳ Bangladeshi Taka
              </option>

              <option value="$">
                $ US Dollar
              </option>

              <option value="₹">
                ₹ Indian Rupee
              </option>
            </select>
          </label>

          <button
            type="submit"
            className="settings-save-button"
            disabled={
              !isManager ||
              saving ||
              !hasChanges
            }
          >
            <Save size={16} />

            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </form>

        <div className="settings-side-column">
          <section className="settings-code-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon code">
                <KeyRound size={18} />
              </div>

              <div>
                <h3>Mess joining code</h3>

                <p>
                  Share this code with new members.
                </p>
              </div>
            </div>

            <div className="settings-code-value">
              <strong>{mess?.code}</strong>

              <button
                type="button"
                onClick={copyMessCode}
              >
                {copied ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}

                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </section>

          <section className="settings-theme-card">
            <div className="settings-theme-information">
              <div className="settings-card-icon theme">
                {darkMode ? (
                  <Moon size={18} />
                ) : (
                  <Sun size={18} />
                )}
              </div>

              <div>
                <h3>Dark mode</h3>

                <p>
                  Change your personal interface
                  appearance.
                </p>
              </div>
            </div>

            <label className="settings-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleTheme}
              />

              <span />
            </label>
          </section>
        </div>
      </div>

      {isManager && (
        <section className="settings-protected-links">
          <div className="settings-protected-heading">
            <div>
              <span>Manager controls</span>

              <h3>Protected workspace actions</h3>
            </div>

            <ShieldCheck size={20} />
          </div>

          <div className="settings-protected-grid">
            <Link to="/settings/data">
              <div className="settings-protected-icon data">
                <Database size={19} />
              </div>

              <div>
                <strong>
                  Data Management
                </strong>

                <span>
                  Reset this mess&apos;s activity
                  records.
                </span>
              </div>
            </Link>

            <Link
              to="/settings/danger"
              className="danger"
            >
              <div className="settings-protected-icon danger">
                <ShieldAlert size={19} />
              </div>

              <div>
                <strong>Danger Zone</strong>

                <span>
                  Permanently delete this mess.
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default Settings;