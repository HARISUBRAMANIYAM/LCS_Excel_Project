import React, { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { Role } from "../../types";

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    role: Role.USER,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    console.log("Form submission event:", e);

    try {
      if (isLogin) {
        // Login process
        console.log("Attempting login......");
        const formDataEncoded = new URLSearchParams();
        formDataEncoded.append("username", formData.username);
        formDataEncoded.append("password", formData.password);

        const response = await api.post("auth/login", formDataEncoded, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
        console.log("Login Response:", response);
        if (response.data.access_token && response.data.refresh_token) {
          console.log("Login successful, attempting navigation...");
          login(response.data);
          try {
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
              console.log("Naivgatin Called");
            }, 100);
          } catch (navError) {
            console.error("Navigation failed...:", navError);
            window.location.href = "/dashboard";
          }
        } else {
          throw new Error("Invalid token response");
        }
      } else {
        // Registration process
        const registrationResponse = await api.post("auth/register", {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
        });

        if (
          registrationResponse.status === 200 ||
          registrationResponse.status === 201
        ) {
          // Auto-login after registration
          const formDataEncoded = new URLSearchParams();
          formDataEncoded.append("username", formData.username);
          formDataEncoded.append("password", formData.password);

          const loginResponse = await api.post("auth/login", formDataEncoded, {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });

          if (
            loginResponse.data.access_token &&
            loginResponse.data.refresh_token
          ) {
            login(loginResponse.data);
            navigate("/dashboard", { replace: true });
          } else {
            throw new Error("Registration successful but login failed");
          }
        } else if (registrationResponse.status === 403) {
          toast.error(registrationResponse.statusText);
        } else {
          throw new Error("Registration failed");
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = (_e: React.MouseEvent<HTMLButtonElement>) => {
    setIsLogin(!isLogin);
    // Reset form data and errors when switching modes
    setFormData({
      username: "",
      password: "",
      email: "",
      fullName: "",
      role: Role.Select,
    });
    setError("");
  };
  const handlereset = () => {
    setFormData({
      username: "",
      password: "",
      email: "",
      fullName: "",
      role: Role.Select,
    });
  };

  return (
    <div className="auth-form-container">
      <h2>{isLogin ? "Login" : "Register"}</h2>
      {error && (
        <div className="error-message">
          {error.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form w-100">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="Enter Username"
            minLength={4}
            maxLength={50}
            className="w-100"
            autoComplete="username"
          />
        </div>

        <div className="form-group w-100">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter Password"
            minLength={6}
            maxLength={100}
            className="w-100"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </div>

        {!isLogin && (
          <>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter Email Id"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter Your Full Name"
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group" style={{ width: "106%" }}>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}>
                <option value={Role.Select}>Select Role </option>
                <option value={Role.HR}>HR</option>
                <option value={Role.ADMIN}>Admin</option>
              </select>
            </div>
          </>
        )}

        <button
          type="submit"
          className="submit-button mb-3 w-60"
          disabled={
            loading ||
            (isLogin
              ? !formData.username || !formData.password
              : !formData.username ||
                !formData.password ||
                !formData.email ||
                !formData.fullName)
          }>
          {loading ? (
            <>
              <span className="spinner"></span>
              {isLogin ? "Logging in..." : "Registering..."}
            </>
          ) : isLogin ? (
            "Login"
          ) : (
            "Register"
          )}
        </button>
        <button
          type="button"
          className="submit-button w-60"
          onClick={handlereset}
          disabled={loading}>
          Cancel
        </button>

        <p className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="toggle-button"
            onClick={toggleAuthMode}
            disabled={loading}>
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
};

export default AuthForm;
