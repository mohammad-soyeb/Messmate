import {
  NavLink,
  Outlet,
} from "react-router-dom";
import {
  Database,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";

import "../../styles/settings.css";

const settingsMenuItems = [
  {
    label: "Mess Settings",
    path: "/settings",
    end: true,
    icon: SlidersHorizontal,
    managerOnly: false,
  },
  {
    label: "Data Management",
    path: "/settings/data",
    end: false,
    icon: Database,
    managerOnly: true,
  },
  {
    label: "Danger Zone",
    path: "/settings/danger",
    end: false,
    icon: ShieldAlert,
    managerOnly: true,
  },
];

const SettingsLayout = () => {
  return (
    <div className="settings-module">
      <section className="settings-module-banner">
        <div className="settings-module-title">
          <div className="settings-module-icon">
            <Settings2 size={23} />
          </div>

          <div>
            <span className="settings-module-label">
              Workspace Control
            </span>

            <h1>Mess Settings</h1>

            <p>
              Manage your mess information, activity
              data and protected workspace actions.
            </p>
          </div>
        </div>
      </section>

      <nav
        className="settings-submenu"
        aria-label="Settings navigation"
      >
        {settingsMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `settings-submenu-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="settings-submenu-icon">
                <Icon size={16} />
              </span>

              <span>{item.label}</span>

              {item.managerOnly && (
                <small>Manager</small>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="settings-subpage">
        <Outlet />
      </div>
    </div>
  );
};

export default SettingsLayout;