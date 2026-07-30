import {
  Link,
  useLocation,
} from "react-router-dom";
import {
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useTheme from "../../hooks/useTheme";

import "../../styles/navbar.css";

const getPageInformation = (pathname) => {
  if (pathname.startsWith("/members")) {
    return {
      title: "Members",
      subtitle: "Manage mess members",
    };
  }

  if (pathname.startsWith("/meals")) {
    return {
      title: "Meals",
      subtitle: "Daily meal management",
    };
  }

  if (pathname.startsWith("/bazaar")) {
    return {
      title: "Bazaar",
      subtitle: "Manage mess purchases",
    };
  }

  if (pathname.startsWith("/reports")) {
    return {
      title: "Reports",
      subtitle: "Mess reports and insights",
    };
  }

  if (pathname.startsWith("/profile")) {
    return {
      title: "Profile",
      subtitle: "Your account overview",
    };
  }

  if (pathname.startsWith("/settings")) {
    return {
      title: "Settings",
      subtitle: "Workspace preferences",
    };
  }

  return {
    title: "Dashboard",
    subtitle: "Your mess overview",
  };
};

const Navbar = ({
  menuOpen,
  onMenuToggle,
}) => {
  const { user } = useAuth();
  const { darkMode, toggleTheme } =
    useTheme();

  const location = useLocation();

  const pageInformation = getPageInformation(
    location.pathname
  );

  return (
    <header className="navbar">
      <div className="navbar-left-section">
        <button
          type="button"
          className={`navbar-menu-button ${
            menuOpen ? "active" : ""
          }`}
          onClick={onMenuToggle}
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="navbar-page-title">
          <span>
            {pageInformation.subtitle}
          </span>

          <h2>
            {pageInformation.title}
          </h2>
        </div>
      </div>

      <div className="navbar-center">
        <span className="workspace-badge">
          <Sparkles size={14} />
          Smart mess workspace
        </span>
      </div>

      <div className="navbar-right">
        <button
          type="button"
          className="navbar-icon-button"
          onClick={toggleTheme}
          aria-label={
            darkMode
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            darkMode
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {darkMode ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>

        <Link
          to="/profile"
          className="navbar-user"
        >
          <div className="navbar-avatar">
            {user?.name
              ?.charAt(0)
              ?.toUpperCase() || "U"}
          </div>

          <div className="navbar-user-information">
            <strong>
              {user?.name || "User"}
            </strong>

            <span>
              {user?.email ||
                "MessMate account"}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;