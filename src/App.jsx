import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";
import {
  useEffect,
  useState,
} from "react";
import { Toaster } from "react-hot-toast";

import Loading from "./components/common/Loading";
import ProtectedRoute from "./components/ProtectedRoute";
import WorkspaceRoute from "./components/WorkspaceRoute";
import Layout from "./components/layout/Layout";

import AuthProvider from "./context/AuthContext";
import ThemeProvider from "./context/ThemeContext";

// Public pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Mess setup
import MessSetup from "./pages/MessSetup";

// Main pages
import Dashboard from "./pages/Dashboard";
import Meals from "./pages/Meals";
import Bazaar from "./pages/Bazaar";
import Members from "./pages/Members";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

// Meal sub-pages
import MealsLayout from "./pages/meals/MealsLayout";
import MealHistory from "./pages/meals/MealHistory";
import MealReport from "./pages/meals/MealReport";

// Bazaar sub-pages
import BazaarLayout from "./pages/bazaar/BazaarLayout";
import BazaarHistory from "./pages/bazaar/BazaarHistory";
import BazaarSummary from "./pages/bazaar/BazaarSummary";

// Member sub-pages
import MembersLayout from "./pages/members/MembersLayout";
import AddMember from "./pages/members/AddMember";
import ManagerControl from "./pages/members/ManagerControl";

// Settings sub-pages
import SettingsLayout from "./pages/settings/SettingsLayout";
import DataManagement from "./pages/settings/DataManagement";
import DangerZone from "./pages/settings/DangerZone";

// Error page
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
            {/* Public routes */}
            <Route
              path="/"
              element={<Landing />}
            />

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

            <Route element={<ProtectedRoute />}>
              <Route
                path="/mess-setup"
                element={<MessSetup />}
              />

              <Route element={<WorkspaceRoute />}>
                <Route element={<Layout />}>
                  <Route
                    path="/dashboard"
                    element={<Dashboard />}
                  />

                  {/* Meals */}
                  <Route
                    path="/meals"
                    element={<MealsLayout />}
                  >
                    <Route
                      index
                      element={<Meals />}
                    />

                    <Route
                      path="history"
                      element={<MealHistory />}
                    />

                    <Route
                      path="report"
                      element={<MealReport />}
                    />
                  </Route>

                  {/* Bazaar */}
                  <Route
                    path="/bazaar"
                    element={<BazaarLayout />}
                  >
                    <Route
                      index
                      element={<Bazaar />}
                    />

                    <Route
                      path="history"
                      element={<BazaarHistory />}
                    />

                    <Route
                      path="summary"
                      element={<BazaarSummary />}
                    />
                  </Route>

                  {/* Members */}
                  <Route
                    path="/members"
                    element={<MembersLayout />}
                  >
                    <Route
                      index
                      element={<Members />}
                    />

                    <Route
                      path="add"
                      element={<AddMember />}
                    />

                    <Route
                      path="managers"
                      element={<ManagerControl />}
                    />
                  </Route>

                  <Route
                    path="/reports"
                    element={<Reports />}
                  />

                  <Route
                    path="/profile"
                    element={<Profile />}
                  />

                  {/* Settings */}
                  <Route
                    path="/settings"
                    element={<SettingsLayout />}
                  >
                    <Route
                      index
                      element={<Settings />}
                    />

                    <Route
                      path="data"
                      element={<DataManagement />}
                    />

                    <Route
                      path="danger"
                      element={<DangerZone />}
                    />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route
              path="*"
              element={<NotFound />}
            />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;