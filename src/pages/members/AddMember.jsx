import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  AtSign,
  DoorOpen,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";

import { AuthContext } from "../../context/AuthContext";
import {
  addMember,
  getWorkspaceData,
} from "../../services/dataService";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  room: "",
};

const normalizeText = (value = "") => {
  return String(value).trim().toLowerCase();
};

const AddMember = () => {
  const { user } = useContext(AuthContext);

  const [members, setMembers] = useState([]);
  const [formData, setFormData] =
    useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMembers = async () => {
      setLoading(true);

      try {
        const data = await getWorkspaceData();

        if (active) {
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error(
          "Unable to load members:",
          error
        );

        toast.error(
          error.message ||
            "Unable to load member information."
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const name = formData.name.trim();
    const email = normalizeText(formData.email);
    const phone = formData.phone.trim();

    if (!name) {
      toast.error(
        "Please enter the member name."
      );
      return false;
    }

    if (!email) {
      toast.error(
        "Please enter the member email."
      );
      return false;
    }

    const validEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!validEmail) {
      toast.error(
        "Please enter a valid email address."
      );
      return false;
    }

    const duplicateEmail = members.some(
      (member) =>
        normalizeText(member.email) === email
    );

    if (duplicateEmail) {
      toast.error(
        "A member with this email already exists."
      );
      return false;
    }

    if (
      phone &&
      !/^[0-9+\-\s()]{7,20}$/.test(phone)
    ) {
      toast.error(
        "Please enter a valid phone number."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isManager) {
      toast.error(
        "Only a manager can add a member."
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const newMember = await addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        room: formData.room,
      });

      setMembers((currentMembers) => [
        ...currentMembers,
        newMember,
      ]);

      setFormData(initialForm);

      toast.success(
        "Member added successfully."
      );
    } catch (error) {
      console.error(
        "Unable to add member:",
        error
      );

      toast.error(
        error.message ||
          "Unable to add the member."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="members-page-state">
        Loading member permissions...
      </div>
    );
  }

  if (!isManager) {
    return (
      <section className="members-access-card">
        <div className="members-access-icon">
          <Lock size={27} />
        </div>

        <span>Manager permission required</span>

        <h2>You cannot add a member</h2>

        <p>
          Only an active manager can add a new member
          to this mess.
        </p>

        <Link
          to="/members"
          className="members-back-button"
        >
          <ArrowLeft size={17} />
          Back to Member List
        </Link>
      </section>
    );
  }

  return (
    <div className="add-member-page">
      <header className="members-subpage-header">
        <div>
          <span className="members-subpage-eyebrow">
            <UserPlus size={15} />
            Manager action
          </span>

          <h2>Add New Member</h2>

          <p>
            Add a member using the same email they
            will use to register or log in.
          </p>
        </div>

        <div className="members-manager-badge">
          <ShieldCheck size={18} />

          <div>
            <span>Authorized manager</span>

            <strong>
              {currentMember?.name}
            </strong>
          </div>
        </div>
      </header>

      <section className="add-member-info">
        <AtSign size={19} />

        <div>
          <strong>
            The email address is important
          </strong>

          <p>
            সদস্য যে email দিয়ে account খুলবে, এখানে
            সেই একই email ব্যবহার করো। তাহলে তার
            account member profile-এর সঙ্গে connect
            করা সহজ হবে।
          </p>
        </div>
      </section>

      <form
        className="add-member-form-card"
        onSubmit={handleSubmit}
      >
        <div className="add-member-form-heading">
          <div>
            <h3>Member information</h3>

            <p>
              Fields marked with * are required.
            </p>
          </div>

          <UserPlus size={22} />
        </div>

        <div className="add-member-form-grid">
          <label className="member-form-field">
            <span>
              Full name <b>*</b>
            </span>

            <div className="member-input-control">
              <UserPlus size={17} />

              <input
                type="text"
                name="name"
                value={formData.name}
                placeholder="Enter member name"
                autoComplete="name"
                onChange={handleInputChange}
                required
              />
            </div>
          </label>

          <label className="member-form-field">
            <span>
              Email address <b>*</b>
            </span>

            <div className="member-input-control">
              <Mail size={17} />

              <input
                type="email"
                name="email"
                value={formData.email}
                placeholder="member@example.com"
                autoComplete="email"
                onChange={handleInputChange}
                required
              />
            </div>
          </label>

          <label className="member-form-field">
            <span>Phone number</span>

            <div className="member-input-control">
              <Phone size={17} />

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                placeholder="+880 1XXXXXXXXX"
                autoComplete="tel"
                onChange={handleInputChange}
              />
            </div>
          </label>

          <label className="member-form-field">
            <span>Room number</span>

            <div className="member-input-control">
              <DoorOpen size={17} />

              <input
                type="text"
                name="room"
                value={formData.room}
                placeholder="Example: 301"
                onChange={handleInputChange}
              />
            </div>
          </label>
        </div>

        <div className="add-member-role-note">
          <ShieldCheck size={18} />

          <div>
            <strong>
              Default role: Member
            </strong>

            <p>
              নতুন account সরাসরি manager হবে না।
              প্রয়োজন হলে Manager Control page থেকে
              পরে manager করা যাবে।
            </p>
          </div>
        </div>

        <div className="add-member-form-footer">
          <button
            type="button"
            className="member-clear-button"
            disabled={saving}
            onClick={() =>
              setFormData(initialForm)
            }
          >
            Clear form
          </button>

          <button
            type="submit"
            className="member-save-button"
            disabled={saving}
          >
            <Save size={18} />

            {saving
              ? "Adding Member..."
              : "Add Member"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMember;