import {
  useEffect,
  useState,
} from "react";
import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { getCurrentMessState } from "../services/messService";
import Loading from "./common/Loading";

const WorkspaceRoute = () => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    const checkWorkspace = async () => {
      try {
        const state = await getCurrentMessState();

        if (active) {
          setStatus(state ? "ready" : "missing");
        }
      } catch (error) {
        console.error(
          "Unable to open workspace:",
          error
        );

        if (active) {
          setStatus("error");
        }
      }
    };

    checkWorkspace();

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return <Loading />;
  }

  if (status === "missing") {
    return (
      <Navigate to="/mess-setup" replace />
    );
  }

  if (status === "error") {
    return (
      <div className="loading-screen">
        <div className="loading-brand">!</div>
        <h2>Workspace could not be opened</h2>
        <p>
          Check the Supabase setup and refresh the
          page.
        </p>
      </div>
    );
  }

  return <Outlet />;
};

export default WorkspaceRoute;
