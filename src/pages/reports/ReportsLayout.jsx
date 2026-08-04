import {
  NavLink,
  Outlet,
} from "react-router-dom";
import {
  BarChart3,
  FileDown,
  Scale,
  WalletCards,
} from "lucide-react";

import "../../styles/reports.css";

const reportMenuItems = [
  {
    label: "Monthly Settlement",
    path: "/reports",
    end: true,
    icon: BarChart3,
  },
  {
    label: "Member Balance",
    path: "/reports/balances",
    end: false,
    icon: WalletCards,
  },
  {
    label: "Print & Export",
    path: "/reports/export",
    end: false,
    icon: FileDown,
  },
];

const ReportsLayout = () => {
  return (
    <div className="reports-module">
      <section className="reports-module-banner">
        <div className="reports-module-title">
          <div className="reports-module-icon">
            <Scale size={22} />
          </div>

          <div>
            <span className="reports-module-label">
              Monthly Accounting
            </span>

            <h1>Mess Reports</h1>

            <p>
              Review monthly meal costs, member
              balances and final settlement reports.
            </p>
          </div>
        </div>
      </section>

      <nav
        className="reports-submenu"
        aria-label="Report navigation"
      >
        {reportMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `reports-submenu-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="reports-submenu-icon">
                <Icon size={16} />
              </span>

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="reports-subpage">
        <Outlet />
      </div>
    </div>
  );
};

export default ReportsLayout;