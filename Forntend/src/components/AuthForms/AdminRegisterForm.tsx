import { useState } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";
import { Role } from "../../types";

const AdminRegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    full_name: "",
    role: Role.Select,
    disabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    if (formData.role === Role.Select) {
      setErrors(["Please select a role"]);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post(
        "auth/register?created_by_admin=true",
        formData
      );

      if (response.status === 200 || response.status === 201) {
        toast.success("User registered successfully!");
        setFormData({
          username: "",
          password: "",
          email: "",
          full_name: "",
          role: Role.Select,
          disabled: false,
        });
      } else {
        throw new Error("Registration failed");
      }
    } catch (err: any) {
      let errorMessages: string[] = [];

      if (
        err.response?.data?.detail &&
        Array.isArray(err.response.data.detail)
      ) {
        errorMessages = err.response.data.detail.map(
          (detail: any) => `${detail.loc?.[1] || "Field"}: ${detail.msg}`
        );
      } else {
        const fallbackError =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "An error occurred during registration";
        errorMessages = [fallbackError];
      }

      setErrors(errorMessages);
      toast.error("Registration failed. Check input fields.");
    } finally {
      setLoading(false);
    }
  };

  const handlereset = () => {
    setFormData({
      username: "",
      password: "",
      email: "",
      full_name: "",
      role: Role.Select,
      disabled: false,
    });
    setErrors([]);
  };

  return (
    // <>
    //   <ToastContainer
    //     position="top-right"
    //     autoClose={3000}
    //     hideProgressBar={false}
    //     newestOnTop={false}
    //     closeOnClick
    //     rtl={false}
    //     pauseOnFocusLoss
    //     draggable
    //     pauseOnHover
    //     theme="colored"
    //   />

    //   <form onSubmit={handleSubmit} className="auth-form-container upload-form">
    //     {errors.length > 0 && (
    //       <div className="error-text mb-2">
    //         {errors.map((err, idx) => (
    //           <p key={idx}>{err}</p>
    //         ))}
    //       </div>
    //     )}

    //     <h2 className="dashboard-title">Admin Register</h2>
    //     <div className="form-row">
    //       <div className="form-group">
    //         <input
    //           name="username"
    //           placeholder="Username"
    //           value={formData.username}
    //           onChange={handleChange}
    //           required
    //         />
    //         {errors.filter((err) => err.startsWith("username")).length > 0 && (
    //           <span
    //             className="error-text"
    //             style={{ color: "red", fontSize: "0.8em" }}>
    //             {errors.filter((err) => err.startsWith("username"))[0]}
    //           </span>
    //         )}
    //       </div>

    //       <div className="form-group">
    //         <input
    //           name="password"
    //           placeholder="Password"
    //           type="password"
    //           value={formData.password}
    //           onChange={handleChange}
    //           required
    //           minLength={6}
    //         />
    //         {errors.filter((err) => err.startsWith("password")).length > 0 && (
    //           <span
    //             className="error-text"
    //             style={{ color: "red", fontSize: "0.8em" }}>
    //             {errors.filter((err) => err.startsWith("password"))[0]}
    //           </span>
    //         )}
    //       </div>

    //       <div className="form-group">
    //         <input
    //           name="email"
    //           placeholder="Email"
    //           type="email"
    //           value={formData.email}
    //           onChange={handleChange}
    //           required
    //         />
    //         {errors.filter((err) => err.startsWith("email")).length > 0 && (
    //           <span
    //             className="error-text"
    //             style={{ color: "red", fontSize: "0.8em" }}>
    //             {errors.filter((err) => err.startsWith("email"))[0]}
    //           </span>
    //         )}
    //       </div>

    //       <div className="form-group">
    //         <input
    //           name="full_name"
    //           placeholder="Full Name"
    //           value={formData.full_name}
    //           onChange={handleChange}
    //           required
    //         />
    //         {errors.filter((err) => err.startsWith("full_name")).length > 0 && (
    //           <span
    //             className="error-text"
    //             style={{ color: "red", fontSize: "0.8em" }}>
    //             {errors.filter((err) => err.startsWith("full_name"))[0]}
    //           </span>
    //         )}
    //       </div>

    //       <div className="form-group">
    //         <select
    //           name="role"
    //           value={formData.role}
    //           onChange={handleChange}
    //           required
    //           aria-label="Select user role">
    //           {errors.filter((err) => err.startsWith("role")).length > 0 && (
    //             <span
    //               className="error-text"
    //               style={{ color: "red", fontSize: "0.8em" }}>
    //               {errors.filter((err) => err.startsWith("role"))[0]}
    //             </span>
    //           )}
    //           <option value={Role.Select}>Select Role</option>
    //           <option value={Role.HR}>HR</option>
    //           <option value={Role.ADMIN}>Admin</option>
    //         </select>
    //       </div>

    //       <div className="form-group">
    //         <label>
    //           <input
    //             name="disabled"
    //             type="checkbox"
    //             checked={formData.disabled}
    //             onChange={handleChange}
    //             className="mr-3"
    //           />
    //           Account Disabled
    //         </label>
    //       </div>
    //       <div className="form-actions">
    //         <button
    //           type="submit"
    //           disabled={loading}
    //           className="submit-btn">
    //           {loading ? "Registering..." : "Register User"}
    //         </button>
    //         <br />
    //         <button
    //           type="button"
    //           disabled={loading}
    //           className="submit-btn"
    //           onClick={handlereset}>
    //           Cancel
    //         </button>
    //       </div>
    //     </div>
    //   </form>
    // </>
    <form onSubmit={handleSubmit} className="auth-form-container upload-form">
      {errors.length > 0 && (
        <div className="error-text mb-2">
          {errors.map((err, idx) => (
            <p key={idx}>{err}</p>
          ))}
        </div>
      )}

      <h2 className="dashboard-title">Admin Register</h2>

      <div className="form-row">
        <div className="form-group">
          <input
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          {errors.some((err) => err.startsWith("username")) && (
            <span className="error-text">
              {errors.find((err) => err.startsWith("username"))}
            </span>
          )}
        </div>

        <div className="form-group">
          <input
            name="password"
            placeholder="Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
          {errors.some((err) => err.startsWith("password")) && (
            <span className="error-text">
              {errors.find((err) => err.startsWith("password"))}
            </span>
          )}
        </div>

        <div className="form-group">
          <input
            name="email"
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {errors.some((err) => err.startsWith("email")) && (
            <span className="error-text">
              {errors.find((err) => err.startsWith("email"))}
            </span>
          )}
        </div>

        <div className="form-group">
          <input
            name="full_name"
            placeholder="Full Name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
          {errors.some((err) => err.startsWith("full_name")) && (
            <span className="error-text">
              {errors.find((err) => err.startsWith("full_name"))}
            </span>
          )}
        </div>

        <div className="form-group full-width">
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            aria-label="Select user role">
            <option value={Role.Select}>Select Role</option>
            <option value={Role.HR}>HR</option>
            <option value={Role.ADMIN}>Admin</option>
          </select>
          {errors.some((err) => err.startsWith("role")) && (
            <span className="error-text">
              {errors.find((err) => err.startsWith("role"))}
            </span>
          )}
        </div>

        <div className="form-group full-width">
          <label>
            <input
              name="disabled"
              type="checkbox"
              checked={formData.disabled}
              onChange={handleChange}
              className="mr-3"
            />
            Account Disabled
          </label>
        </div>
      </div>

      {/* ✅ Moved outside of form-row */}
      <div className="form-actions">
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? "Registering..." : "Register User"}
        </button>
        <button
          type="button"
          disabled={loading}
          className="reset-btn"
          onClick={handlereset}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AdminRegisterForm;
