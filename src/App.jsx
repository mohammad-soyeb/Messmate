import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import Loading from "./components/common/Loading";

import AuthProvider from "./context/AuthContext";
import ThemeProvider from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";
import WorkspaceRoute from "./components/WorkspaceRoute";
import Layout from "./components/layout/Layout";

// Public Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Mess Setup Page
import MessSetup from "./pages/MessSetup";

// Dashboard Pages
import Dashboard from "./pages/Dashboard";
import Meals from "./pages/Meals";
import Bazaar from "./pages/Bazaar";
import Profile from "./pages/Profile";
import Members from "./pages/Members";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

// Error Page
import NotFound from "./pages/NotFound";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 2800,
              style: {
                color: "#263248",
                background: "#ffffff",
              },
            }}
          />

          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />

            <Route path="/login" element={<Login />} />

            <Route path="/register" element={<Register />} />

            {/* Login করার পর Mess Create অথবা Join */}
            <Route element={<ProtectedRoute />}>
              <Route path="/mess-setup" element={<MessSetup />} />

              {/* Dashboard Layout Routes */}
              <Route element={<WorkspaceRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />

                  <Route path="/meals" element={<Meals />} />

                  <Route path="/bazaar" element={<Bazaar />} />

                  <Route path="/members" element={<Members />} />

                  <Route path="/reports" element={<Reports />} />

                  <Route path="/profile" element={<Profile />} />

                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
