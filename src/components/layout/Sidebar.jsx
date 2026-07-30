import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  ShoppingCart,
  FileBarChart2,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../hooks/useAuth";
import "../../styles/sidebar.css";

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("You have been logged out.");
    } catch (error) {
      toast.error(
        error.message || "Unable to log out."
      );
    }
  };

  const menuItems = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      title: "Members",
      path: "/members",
      icon: <Users size={20} />,
    },
    {
      title: "Meals",
      path: "/meals",
      icon: <UtensilsCrossed size={20} />,
    },
    {
      title: "Bazaar",
      path: "/bazaar",
      icon: <ShoppingCart size={20} />,
    },
    {
      title: "Reports",
      path: "/reports",
      icon: <FileBarChart2 size={20} />,
    },
    {
      title: "Profile",
      path: "/profile",
      icon: <User size={20} />,
    },
    {
      title: "Settings",
      path: "/settings",
      icon: <Settings size={20} />,
    },
  ];

  return (
    <aside className="sidebar" aria-label="Main navigation">

      <div className="sidebar-top">

        <div className="sidebar-logo">

          <div className="logo-circle" aria-hidden="true">
            <UtensilsCrossed size={25} />
          </div>

          <div>
            <h2>MessMate</h2>
            <span>Meal Management</span>
          </div>

        </div>

      </div>

      <nav className="sidebar-menu">

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            {item.icon}

            <span>{item.title}</span>

          </NavLink>
        ))}

      </nav>

      <div className="sidebar-footer">

        <button
          type="button"
          className="logout-btn"
          onClick={handleLogout}
        >
          <LogOut size={20} />

          <span>Logout</span>

        </button>

      </div>

    </aside>
  );
};

export default Sidebar;
