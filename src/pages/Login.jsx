import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { getCurrentMessState } from "../services/messService";
import "../styles/auth.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      await login(
        formData.email,
        formData.password
      );

      const currentMess =
        await getCurrentMessState();

      toast.success("Welcome back.");
      navigate(
        currentMess
          ? "/dashboard"
          : "/mess-setup",
        { replace: true }
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">
        <Link className="auth-home-link" to="/">
          <span>M</span>
          MessMate
        </Link>

        <span className="auth-kicker">WELCOME BACK</span>
        <h1>Log in to your workspace</h1>

        <p>Continue managing meals, bazaar records and monthly reports.</p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">

            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />

          </div>

          <div className="form-group">

            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />

          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

        </form>

        <div className="auth-footer">

          <p>
            New to MessMate?
          </p>

          <Link to="/register">
            Create Account
          </Link>

        </div>

      </div>

    </div>
  );
};

export default Login;