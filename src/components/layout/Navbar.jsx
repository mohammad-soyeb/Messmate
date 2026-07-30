import { Link, useLocation } from "react-router-dom";
import {
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useTheme from "../../hooks/useTheme";

import "../../styles/navbar.css";

const Navbar = () => {
  const { user } = useAuth();
  const { darkMode, toggleTheme } =
    useTheme();

  const location = useLocation();

  const pageTitle = {
    "/dashboard": "Dashboard",
    "/members": "Members",
    "/meals": "Meals",
    "/bazaar": "Bazaar",
    "/reports": "Reports",
    "/profile": "Profile",
    "/settings": "Settings",
  };

  return (
    <header className="navbar">

      <div className="navbar-left">

        <h2>
          {pageTitle[location.pathname] ||
            "MessMate"}
        </h2>

        <p>
          Welcome back 👋
        </p>

      </div>

      <div className="navbar-center">
        <span className="workspace-badge">
          <Sparkles size={15} />
          Smart mess workspace
        </span>
      </div>

      <div className="navbar-right">

        <button
          type="button"
          className="icon-btn"
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
            <Sun size={20} />
          ) : (
            <Moon size={20} />
          )}
        </button>

        <Link
          to="/profile"
          className="user-box"
        >

          <div className="avatar">
            {user?.name
              ?.charAt(0)
              ?.toUpperCase() || "U"}
          </div>

          <div>

            <h4>
              {user?.name || "User"}
            </h4>

            <span>
              {user?.email}
            </span>

          </div>

        </Link>

      </div>

    </header>
  );
};

export default Navbar;
