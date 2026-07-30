import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";

import "../../styles/layout.css";

const Layout = () => {
  return (
    <div className="layout">

      <Sidebar />

      <div className="layout-main">

        <Navbar />

        <main className="layout-content">
          <Outlet />
        </main>

        <Footer />

      </div>

    </div>
  );
};

export default Layout;
