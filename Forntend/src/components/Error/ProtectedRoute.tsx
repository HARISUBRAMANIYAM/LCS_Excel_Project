// src/components/ProtectedRoute.tsx

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../types";
import { Navigate } from "react-router";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, token} = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== Role.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{token ? children : <Navigate to="/login" replace/>}</>;
};

export default ProtectedRoute;
