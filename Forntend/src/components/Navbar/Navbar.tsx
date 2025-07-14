import React from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import ThemeToggleButton from "../Theme/ThemeToggleButton";


const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">HR Extraction Tool</Link>
      </div>
      <div className="navbar-start" style={{ margin: "flex-right" }}></div>

      {user && (
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-item">
            Dashboard
          </Link>
          {user.role === "admin" && (
            <Link to="/admin-reg" className="navbar-item">
              Register
            </Link>
          )}
          <Link to="/new" className="navbar-item">Uploads</Link>
          <Link to="/table" className="navbar-item">Remittances</Link>
          {/* <Link to="/feedback" className="navbar-item">Feedback Form</Link> */}
        </div>
      )}

      <div className="navbar-end">
         <div>
          <ThemeToggleButton/>
            </div>
        {user ? (
          <div className="user-info">
            {/* <span className="username">
              {user.full_name} ({user.role})
            </span> */}
            <span className="username">
              {user.role === "admin" ? (
                <img
                  src="src/assets/set-up-svgrepo-com.svg"
                  alt="Admin Icon"
                  className="user-icon"
                />
              ) : (
                <img
                  src="src/assets/user-svgrepo-com.svg"
                  alt="User Icon"
                  className="user-icon"
                />
              )}{user.full_name} ({user.role})

            </span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
         
        ) : (
          <>
            <Link to="/login" className="login-button">
              Login
            </Link>
            <Link to="/change_pass" className="login-button">
              Change Password
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;