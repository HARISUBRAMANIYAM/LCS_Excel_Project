import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";
import "primereact/resources/primereact.min.css";
import "primereact/resources/themes/lara-light-blue/theme.css";
import { Navigate, Route, Routes } from "react-router";
import { BrowserRouter as Router } from "react-router-dom";
import AdminRegisterForm from "./components/AuthForms/AdminRegisterForm";
import AuthForm from "./components/AuthForms/AuthForm";
import PasswordForm from "./components/AuthForms/ChangePass";
// import Dashboard from "./components/Dashboard/Dashboard";
import ErrorBoundary from "./components/Error/ErrorBoundary";
import RemittanceFilesList from "./components/ESIANDPF/FileList";
import ExcelUpload from "./components/ESIANDPF/Uploads";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./components/Dashboard2/Dashboard";
import 'chart.js/auto';
import ProtectedRoute from "./components/Error/ProtectedRoute";

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <>
      {/* <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
        /> */}
      <ErrorBoundary>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <AuthForm />}
          />
          <Route
            path="/dashboard"
            element={
                // <ProtectedRoute>
                //     <Dashboard />
                // </ProtectedRoute>
                <Dashboard/>
            }
            // element={<Dashboard />}
          />
          <Route path="/admin-reg" element={<AdminRegisterForm />} />
          <Route path="/new" element={<ExcelUpload />} />
          {/* element={<ProtectedRoute><ExcelUpload /></ProtectedRoute>} /> */}
          <Route path="/table" element={<RemittanceFilesList />} />
          {/* // element={<ProtectedRoute><RemittanceFilesList /></ProtectedRoute>} /> */}
          {/* <Route path='/feedback' element={<ProtectedRoute><FeedbackForm /></ProtectedRoute>} /> */}
          <Route path="/change_pass" element={<PasswordForm />} />
          <Route
            path="/"
            element={<Navigate to={user ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </ErrorBoundary>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <AppRoutes />
        </Layout>
      </Router>
    </AuthProvider>
  );
};

export default App;
