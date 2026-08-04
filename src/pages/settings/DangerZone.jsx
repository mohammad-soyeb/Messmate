import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertOctagon,
  Database,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";

import { AuthContext } from "../../context/AuthContext";
import {
  deleteMessWorkspace,
  getWorkspaceData,
} from "../../services/dataService";

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const DangerZone = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mess, setMess] = useState(null);
  const [members, setMembers] = useState([]);
  const [mealCount, setMealCount] = useState(0);
  const [bazaarCount, setBazaarCount] =
    useState(0);
  const [confirmation, setConfirmation] =
    useState("");
  const [understood, setUnderstood] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] =
    useState(false);

  useEffect(() => {
    let active = true;

    const loadWorkspace = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (!active) {
          return;
        }

        setMess(data.mess || null);
        setMembers(data.members || []);
        setMealCount(data.meals?.length || 0);
        setBazaarCount(
          data.bazaarEntries?.length || 0
        );
      } catch (error) {
        console.error(
          "Unable to load danger zone:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load workspace information."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadWorkspace();

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

  const expectedConfirmation =
    mess?.name?.trim() || "";

  const confirmationIsValid =
    confirmation.trim() ===
    expectedConfirmation;

  const canDelete =
    isManager &&
    understood &&
    confirmationIsValid &&
    !deleting;

  const handleDeleteWorkspace = async () => {
    if (!isManager) {
      toast.error(
        "Only a manager can delete this mess."
      );
      return;
    }

    if (!understood) {
      toast.error(
        "Confirm that you understand the consequences."
      );
      return;
    }

    if (!confirmationIsValid) {
      toast.error(
        "Enter the exact mess name to continue."
      );
      return;
    }

    const finalConfirmation = window.confirm(
      `Permanently delete "${mess.name}" and all of its data? This cannot be undone.`
    );

    if (!finalConfirmation) {
      return;
    }

    setDeleting(true);

    try {
      await deleteMessWorkspace({
        messId: mess.id,
        confirmationName:
          confirmation.trim(),
      });

      toast.success(
        "Mess workspace permanently deleted."
      );

      navigate("/mess-setup", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Unable to delete mess workspace:",
        error
      );

      toast.error(
        error.message ||
          "Unable to delete the mess workspace."
      );

      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page-state">
        Loading protected workspace...
      </div>
    );
  }

  if (!isManager) {
    return (
      <section className="settings-access-card danger">
        <div className="settings-access-icon">
          <Lock size={25} />
        </div>

        <span>Manager permission required</span>

        <h2>Danger Zone is protected</h2>

        <p>
          Only an active manager of this mess can
          permanently delete its workspace.
        </p>

        <Link
          to="/settings"
          className="settings-back-button"
        >
          Back to Settings
        </Link>
      </section>
    );
  }

  return (
    <div className="danger-zone-page">
      <header className="settings-subpage-header danger">
        <div>
          <span className="settings-subpage-eyebrow danger">
            <ShieldAlert size={14} />
            Irreversible actions
          </span>

          <h2>Danger Zone</h2>

          <p>
            Permanently delete only the current mess
            and all data that belongs to it.
          </p>
        </div>

        <div className="settings-danger-badge">
          <ShieldCheck size={17} />

          <div>
            <span>Authorized manager</span>

            <strong>
              {currentMember?.name}
            </strong>
          </div>
        </div>
      </header>

      <section className="danger-isolation-notice">
        <ShieldCheck size={19} />

        <div>
          <strong>
            Other messes will not be affected
          </strong>

          <p>
            এই action শুধু{" "}
            <b>{mess?.name}</b> mess-এর records
            delete করবে। অন্য কোনো mess বা user-এর
            data পরিবর্তন হবে না।
          </p>
        </div>
      </section>

      <section className="danger-workspace-summary">
        <div>
          <span>Mess name</span>
          <strong>{mess?.name}</strong>
        </div>

        <div>
          <span>Mess code</span>
          <strong>{mess?.code}</strong>
        </div>

        <div>
          <span>Members</span>
          <strong>{members.length}</strong>
        </div>

        <div>
          <span>Meal records</span>
          <strong>{mealCount}</strong>
        </div>

        <div>
          <span>Bazaar entries</span>
          <strong>{bazaarCount}</strong>
        </div>
      </section>

      <section className="delete-workspace-card">
        <div className="delete-workspace-heading">
          <div className="delete-workspace-icon">
            <AlertOctagon size={23} />
          </div>

          <div>
            <span>Permanent deletion</span>

            <h3>Delete Mess Workspace</h3>

            <p>
              This action permanently removes the
              current mess and everything stored
              inside it.
            </p>
          </div>
        </div>

        <div className="delete-workspace-data">
          <strong>
            The following data will be deleted:
          </strong>

          <div className="delete-data-grid">
            <div>
              <UserX size={16} />
              All members and manager roles
            </div>

            <div>
              <Database size={16} />
              All meals and bazaar records
            </div>

            <div>
              <Trash2 size={16} />
              All bazaar items and receipts
            </div>

            <div>
              <ShieldAlert size={16} />
              Mess code and workspace settings
            </div>
          </div>
        </div>

        <label className="danger-understand-check">
          <input
            type="checkbox"
            checked={understood}
            disabled={deleting}
            onChange={(event) =>
              setUnderstood(
                event.target.checked
              )
            }
          />

          <span>
            I understand that this action is
            permanent and cannot be undone.
          </span>
        </label>

        <div className="delete-confirmation-field">
          <label htmlFor="deleteConfirmation">
            Type the exact mess name to confirm:
          </label>

          <strong>{expectedConfirmation}</strong>

          <input
            id="deleteConfirmation"
            type="text"
            value={confirmation}
            placeholder={expectedConfirmation}
            autoComplete="off"
            disabled={deleting}
            onChange={(event) =>
              setConfirmation(
                event.target.value
              )
            }
          />

          {confirmation &&
            !confirmationIsValid && (
              <small>
                Mess name does not match exactly.
              </small>
            )}
        </div>

        <div className="delete-workspace-footer">
          <div>
            <AlertOctagon size={17} />

            <span>
              This cannot be recovered after
              deletion.
            </span>
          </div>

          <button
            type="button"
            className="delete-workspace-button"
            disabled={!canDelete}
            onClick={handleDeleteWorkspace}
          >
            <Trash2 size={16} />

            {deleting
              ? "Deleting Workspace..."
              : "Permanently Delete Mess"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default DangerZone;