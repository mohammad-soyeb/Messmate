import { NavLink, Outlet } from "react-router-dom";
import {
  CalendarCheck,
  ClipboardList,
  History,
  Utensils,
} from "lucide-react";

import "../../styles/meals.css";

const mealMenuItems = [
  {
    label: "Daily Meals",
    path: "/meals",
    end: true,
    icon: CalendarCheck,
  },
  {
    label: "Meal History",
    path: "/meals/history",
    end: false,
    icon: History,
  },
  {
    label: "Monthly Report",
    path: "/meals/report",
    end: false,
    icon: ClipboardList,
  },
];

const MealsLayout = () => {
  return (
    <div className="meal-module">
      <section className="meal-module-banner">
        <div className="meal-module-title">
          <div className="meal-module-icon">
            <Utensils size={25} />
          </div>

          <div>
            <span className="meal-module-label">
              Meal Management
            </span>

            <h1>Manage meals easily</h1>

            <p>
              Add daily meals, check previous records
              and review monthly summaries.
            </p>
          </div>
        </div>
      </section>

      <nav
        className="meal-submenu"
        aria-label="Meal navigation"
      >
        {mealMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `meal-submenu-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="meal-submenu-link-icon">
                <Icon size={18} />
              </span>

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="meal-subpage">
        <Outlet />
      </div>
    </div>
  );
};

export default MealsLayout;