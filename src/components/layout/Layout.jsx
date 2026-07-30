import {
  useEffect,
  useState,
} from "react";
import {
  Outlet,
  useLocation,
} from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";

import "../../styles/layout.css";

const Layout = () => {
  const location = useLocation();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const openMenu = () => {
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen((currentState) => {
      return !currentState;
    });
  };

  /*
   * Route পরিবর্তন হলে menu automatic বন্ধ হবে।
   */
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  /*
   * Escape key চাপলে menu বন্ধ হবে এবং menu open
   * থাকা অবস্থায় background scroll বন্ধ থাকবে।
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    const previousOverflow =
      document.body.style.overflow;

    if (menuOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="layout">
      <Sidebar
        isOpen={menuOpen}
        onClose={closeMenu}
      />

      <button
        type="button"
        className={`navigation-backdrop ${
          menuOpen ? "visible" : ""
        }`}
        aria-label="Close navigation menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <div className="layout-main">
        <Navbar
          menuOpen={menuOpen}
          onMenuToggle={toggleMenu}
          onMenuOpen={openMenu}
        />

        <main className="layout-content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;