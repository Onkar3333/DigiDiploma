import React from "react";
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const role = localStorage.getItem("userRole");
  if (role !== "admin") {
    return <Navigate to="/not-authorized" />;
  }
  return children;
} 