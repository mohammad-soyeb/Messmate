import {
  useEffect,
  useState,
} from "react";
import {
  Database,
  Moon,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import useTheme from "../hooks/useTheme";
import {
  resetActivityData,
} from "../services/dataService";
import {
  getCurrentMessState,
  updateMessSettings,
} from "../services/messService";
import "../styles/settings.css";

const Settings = () => {
  const [
    messName,
    setMessName,
  ] = useState("MessMate");

  const [
    currency,
    setCurrency,
  ] = useState("৳");

  const [
    currentMember,
    setCurrentMember,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    resetting,
    setResetting,
  ] = useState(false);

  const {
    darkMode,
    toggleTheme,
  } = useTheme();

  const currentUserIsManager =
    currentMember?.role ===
    "manager";

  useEffect(() => {
    let active = true;

    const loadSettings =
      async () => {
        try {
          const state =
            await getCurrentMessState();

          if (!active) {
            return;
          }

          if (!state) {
            toast.error(
              "No active mess found."
            );

            return;
          }

          setMessName(
            state.mess.name ||
              "MessMate"
          );

          setCurrency(
            state.mess.currency ||
              "৳"
          );

          setCurrentMember(
            state.member
          );
        } catch (error) {
          console.error(
            "Unable to load settings:",
            error
          );

          toast.error(
            error.message ||
              "Unable to load settings."
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

  const saveSettings =
    async () => {
      if (
        !currentUserIsManager
      ) {
        toast.error(
          "Only a manager can change mess settings."
        );

        return;
      }

      const cleanMessName =
        messName.trim();

      if (!cleanMessName) {
        toast.error(
          "Mess name is required."
        );

        return;
      }

      if (
        cleanMessName.length < 2
      ) {
        toast.error(
          "Mess name must contain at least 2 characters."
        );

        return;
      }

      setSaving(true);

      try {
        const updatedMess =
          await updateMessSettings({
            name:
              cleanMessName,

            currency,
          });

        setMessName(
          updatedMess.name
        );

        setCurrency(
          updatedMess.currency
        );

        toast.success(
          "Settings saved successfully."
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to save settings."
        );
      } finally {
        setSaving(false);
      }
    };

  const resetData =
    async () => {
      if (
        !currentUserIsManager
      ) {
        toast.error(
          "Only a manager can reset activity data."
        );

        return;
      }

      const shouldReset =
        window.confirm(
          "Delete all meal and bazaar records? Member accounts and profiles will remain. This action cannot be undone."
        );

      if (!shouldReset) {
        return;
      }

      setResetting(true);

      try {
        await resetActivityData();

        toast.success(
          "Activity data has been reset."
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to reset activity data."
        );
      } finally {
        setResetting(false);
      }
    };

  if (loading) {
    return (
      <div className="page-container settings-page">
        <div className="settings-page-header">
          <div className="settings-heading-icon">
            <Settings2
              size={24}
            />
          </div>

          <div>
            <span>
              WORKSPACE PREFERENCES
            </span>

            <h1>Settings</h1>

            <p>
              Loading workspace
              settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container settings-page">
      <div className="settings-page-header">
        <div className="settings-heading-icon">
          <Settings2
            size={24}
          />
        </div>

        <div>
          <span>
            WORKSPACE PREFERENCES
          </span>

          <h1>Settings</h1>

          <p>
            Personalize how
            MessMate looks and
            displays your records.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-section-icon">
              <Save size={20} />
            </div>

            <div>
              <h2>
                General settings
              </h2>

              <p>
                Choose the workspace
                name and preferred
                currency.
              </p>
            </div>
          </div>

          <label>
            Mess name

            <input
              type="text"
              value={messName}
              onChange={(
                event
              ) =>
                setMessName(
                  event.target
                    .value
                )
              }
              disabled={
                !currentUserIsManager ||
                saving
              }
              maxLength={80}
              placeholder="Enter mess name"
            />
          </label>

          <label>
            Currency

            <select
              value={currency}
              onChange={(
                event
              ) =>
                setCurrency(
                  event.target
                    .value
                )
              }
              disabled={
                !currentUserIsManager ||
                saving
              }
            >
              <option value="৳">
                ৳ BDT
              </option>

              <option value="$">
                $ USD
              </option>

              <option value="₹">
                ₹ INR
              </option>
            </select>
          </label>

          <div className="settings-toggle-row">
            <div className="settings-toggle-copy">
              <span className="settings-section-icon theme">
                <Moon
                  size={19}
                />
              </span>

              <div>
                <strong>
                  Dark mode
                </strong>

                <small>
                  Use a darker
                  interface across
                  the dashboard.
                </small>
              </div>
            </div>

            <label className="premium-switch">
              <input
                type="checkbox"
                checked={
                  darkMode
                }
                onChange={
                  toggleTheme
                }
              />

              <span />
            </label>
          </div>

          {currentUserIsManager ? (
            <button
              type="button"
              className="save-btn"
              onClick={
                saveSettings
              }
              disabled={saving}
            >
              <Save
                size={17}
              />

              {saving
                ? "Saving..."
                : "Save settings"}
            </button>
          ) : (
            <div className="settings-data-note">
              <strong>
                Manager permission
                required
              </strong>

              <span>
                Only a manager can
                change the mess name
                and currency.
              </span>
            </div>
          )}
        </section>

        {currentUserIsManager && (
          <section className="settings-card danger-zone">
            <div className="settings-card-heading">
              <div className="settings-section-icon data">
                <Database
                  size={20}
                />
              </div>

              <div>
                <h2>
                  Activity data
                </h2>

                <p>
                  Clear stored meal
                  and bazaar activity.
                </p>
              </div>
            </div>

            <div className="settings-data-note">
              <strong>
                Manager-only action
              </strong>

              <span>
                Member accounts,
                profiles and mess
                membership records
                will not be deleted.
              </span>
            </div>

            <button
              type="button"
              className="reset-btn"
              onClick={resetData}
              disabled={resetting}
            >
              <Trash2
                size={17}
              />

              {resetting
                ? "Resetting..."
                : "Reset activity data"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;