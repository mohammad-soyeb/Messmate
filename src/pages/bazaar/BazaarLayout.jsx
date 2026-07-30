import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  History,
  PlusCircle,
  ShoppingBasket,
} from "lucide-react";

import "../../styles/bazaar.css";

const bazaarMenuItems = [
  {
    label: "Add Bazaar",
    path: "/bazaar",
    end: true,
    icon: PlusCircle,
  },
  {
    label: "Bazaar History",
    path: "/bazaar/history",
    end: false,
    icon: History,
  },
  {
    label: "Monthly Summary",
    path: "/bazaar/summary",
    end: false,
    icon: BarChart3,
  },
];

const BazaarLayout = () => {
  return (
    <div className="bazaar-module">
      <section className="bazaar-module-banner">
        <div className="bazaar-module-title">
          <div className="bazaar-module-icon">
            <ShoppingBasket size={25} />
          </div>

          <div>
            <span className="bazaar-module-label">
              Bazaar Management
            </span>

            <h1>Manage mess bazaar</h1>

            <p>
              Add daily purchases, review previous
              entries and check the current monthly
              summary.
            </p>
          </div>
        </div>
      </section>

      <nav
        className="bazaar-submenu"
        aria-label="Bazaar navigation"
      >
        {bazaarMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `bazaar-submenu-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="bazaar-submenu-icon">
                <Icon size={18} />
              </span>

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="bazaar-subpage">
        <Outlet />
      </div>
    </div>
  );
};

export default BazaarLayout;