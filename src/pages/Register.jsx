import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import "../styles/auth.css";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (result.requiresConfirmation) {
        toast.success(
          "Check your email to confirm your account."
        );
        navigate("/login");
      } else {
        toast.success("Your account is ready.");
        navigate("/mess-setup");
      }
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to create your account."
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

        <span className="auth-kicker">GET STARTED</span>
        <h1>Create your MessMate account</h1>

        <p>Set up a clean workspace for your mess in just a minute.</p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Full Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

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
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
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
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>

        </form>

        <div className="auth-footer">

          <p>Already have an account?</p>

          <Link to="/login">
            Login
          </Link>

        </div>

      </div>

    </div>
  );
};

export default Register;
