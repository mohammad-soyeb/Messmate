import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  ChevronRight,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingCart,
  User,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../hooks/useAuth";
import "../../styles/sidebar.css";

const menuItems = [
  {
    title: "Dashboard",
    subtitle: "Mess overview",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Members",
    subtitle: "Member management",
    path: "/members",
    icon: Users,
  },
  {
    title: "Meals",
    subtitle: "Daily meal records",
    path: "/meals",
    icon: UtensilsCrossed,
  },
  {
    title: "Bazaar",
    subtitle: "Purchase management",
    path: "/bazaar",
    icon: ShoppingCart,
  },
  {
    title: "Reports",
    subtitle: "Monthly insights",
    path: "/reports",
    icon: FileBarChart2,
  },
  {
    title: "Profile",
    subtitle: "Account overview",
    path: "/profile",
    icon: User,
  },
  {
    title: "Settings",
    subtitle: "Mess preferences",
    path: "/settings",
    icon: Settings,
  },
];

const Sidebar = ({
  isOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await logout();
      onClose();
      navigate("/login");

      toast.success(
        "You have been logged out."
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to log out."
      );
    }
  };

  return (
    <aside
      id="main-navigation"
      className={`sidebar ${
        isOpen ? "open" : ""
      }`}
      aria-label="Main navigation"
      aria-hidden={!isOpen}
    >
      <div className="sidebar-ambient sidebar-ambient-one" />
      <div className="sidebar-ambient sidebar-ambient-two" />

      <div className="sidebar-top">
        <div className="sidebar-logo">
          <div
            className="logo-circle"
            aria-hidden="true"
          >
            <UtensilsCrossed size={23} />
          </div>

          <div className="sidebar-brand">
            <h2>MessMate</h2>
            <span>Smart mess manager</span>
          </div>

          <button
            type="button"
            className="sidebar-close-button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-workspace-status">
          <span className="sidebar-status-dot" />

          <div>
            <strong>Workspace online</strong>
            <small>Securely connected</small>
          </div>
        </div>
      </div>

      <nav className="sidebar-menu">
        <span className="sidebar-section-label">
          Main navigation
        </span>

        {menuItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={{
                "--menu-index": index,
              }}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="sidebar-link-icon">
                <Icon size={18} />
              </span>

              <span className="sidebar-link-content">
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </span>

              <ChevronRight
                className="sidebar-link-arrow"
                size={15}
              />
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {user?.name
              ?.charAt(0)
              ?.toUpperCase() || "U"}
          </div>

          <div>
            <strong>
              {user?.name || "User"}
            </strong>

            <span>
              {user?.email ||
                "MessMate account"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="logout-btn"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          <span>Logout securely</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;