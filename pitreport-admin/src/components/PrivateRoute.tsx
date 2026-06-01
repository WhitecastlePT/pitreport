import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";
import type { AdminRole } from "../types";

interface Props {
  children: ReactNode;
  allowedRoles?: AdminRole[];
}

export default function PrivateRoute({ children, allowedRoles }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <span className="text-white text-sm">A carregar...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
