import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loading from "./common/Loading";

const ProtectedRoute = () => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
