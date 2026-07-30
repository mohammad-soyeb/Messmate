import { NavLink, Outlet } from "react-router-dom";
import {
  ShieldCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

import "../../styles/members.css";

const memberMenuItems = [
  {
    label: "Member List",
    path: "/members",
    end: true,
    icon: UsersRound,
  },
  {
    label: "Add Member",
    path: "/members/add",
    end: false,
    icon: UserPlus,
    managerOnly: true,
  },
  {
    label: "Manager Control",
    path: "/members/managers",
    end: false,
    icon: ShieldCheck,
    managerOnly: true,
  },
];

const MembersLayout = () => {
  return (
    <div className="members-module">
      <section className="members-module-banner">
        <div className="members-module-title">
          <div className="members-module-icon">
            <Users size={25} />
          </div>

          <div>
            <span className="members-module-label">
              Member Management
            </span>

            <h1>Manage mess members</h1>

            <p>
              View active members, add new members and
              safely control manager permissions.
            </p>
          </div>
        </div>
      </section>

      <nav
        className="members-submenu"
        aria-label="Member navigation"
      >
        {memberMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `members-submenu-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="members-submenu-icon">
                <Icon size={18} />
              </span>

              <span>{item.label}</span>

              {item.managerOnly && (
                <small>Manager</small>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="members-subpage">
        <Outlet />
      </div>
    </div>
  );
};

export default MembersLayout;