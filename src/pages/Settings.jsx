import {
  useEffect,
  useState,
} from "react";
import { Database, Moon, Save, Settings2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import useTheme from "../hooks/useTheme";
import { resetActivityData } from "../services/dataService";
import {
  getCurrentMessState,
  updateMessSettings,
} from "../services/messService";
import "../styles/settings.css";

const Settings = () => {
  const [messName, setMessName] =
    useState("MessMate");
  const [currency, setCurrency] =
    useState("৳");
  const [saving, setSaving] = useState(false);
  const { darkMode, toggleTheme } = useTheme();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const state = await getCurrentMessState();

        if (state?.mess) {
          setMessName(state.mess.name);
          setCurrency(
            state.mess.currency || "৳"
          );
        }
      } catch (error) {
        console.error(
          "Unable to load settings:",
          error
        );
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);

    try {
      await updateMessSettings({
        name: messName,
        currency,
      });
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

  const resetData = async () => {
    const shouldReset = window.confirm(
      "Delete all member, meal and bazaar records? This cannot be undone."
    );

    if (!shouldReset) {
      return;
    }

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
    }
  };

  return (
    <div className="page-container settings-page">
      <div className="settings-page-header">
        <div className="settings-heading-icon">
          <Settings2 size={24} />
        </div>
        <div>
          <span>WORKSPACE PREFERENCES</span>
          <h1>Settings</h1>
          <p>Personalize how MessMate looks and displays your records.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-section-icon">
              <Save size={20} />
            </div>
            <div>
              <h2>General settings</h2>
              <p>Choose the workspace name and preferred currency.</p>
            </div>
          </div>

          <label>
            Mess name
            <input
              type="text"
              value={messName}
              onChange={(event) => setMessName(event.target.value)}
            />
          </label>

          <label>
            Currency
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="৳">৳ BDT</option>
              <option value="$">$ USD</option>
              <option value="₹">₹ INR</option>
            </select>
          </label>

          <div className="settings-toggle-row">
            <div className="settings-toggle-copy">
              <span className="settings-section-icon theme">
                <Moon size={19} />
              </span>
              <div>
                <strong>Dark mode</strong>
                <small>Use a darker interface across the dashboard.</small>
              </div>
            </div>

            <label className="premium-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleTheme}
              />
              <span />
            </label>
          </div>

          <button
            type="button"
            className="save-btn"
            onClick={saveSettings}
            disabled={saving}
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save settings"}
          </button>
        </section>

        <section className="settings-card danger-zone">
          <div className="settings-card-heading">
            <div className="settings-section-icon data">
              <Database size={20} />
            </div>
            <div>
              <h2>Activity data</h2>
              <p>Clear stored member, meal and bazaar activity.</p>
            </div>
          </div>

          <div className="settings-data-note">
            <strong>Your account will stay signed in.</strong>
            <span>
              Only activity records are removed. Your profile and workspace
              preferences are kept.
            </span>
          </div>

          <button type="button" className="reset-btn" onClick={resetData}>
            <Trash2 size={17} />
            Reset activity data
          </button>
        </section>
      </div>
    </div>
  );
};

export default Settings;
