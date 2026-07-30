import { Link } from "react-router-dom";
import "../styles/notfound.css";

const NotFound = () => {
  return (
    <div className="notfound-container">

      <h1>404</h1>

      <h2>Page Not Found</h2>

      <p>
        Sorry, the page you are looking for does not exist.
      </p>

      <Link
        to="/dashboard"
        className="back-home-btn"
      >
        Back to Dashboard
      </Link>

    </div>
  );
};

export default NotFound;
