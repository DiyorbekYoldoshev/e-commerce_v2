import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSeller?: boolean;
}

const ProtectedRoute: React.FC<Props> = ({
  children,
  requireAdmin = false,
  requireSeller = false,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // admin uchun
  if (requireAdmin && !user.is_staff) {
    return <Navigate to="/" replace />;
  }

  // seller uchun
  if (requireSeller && !user.is_seller) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;