import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [emailOrStudentId, setEmailOrStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If a student is logged in, force logout before admin login
  useEffect(() => {
    if (isAuthenticated && user?.userType && user.userType !== "admin") {
      toast.error("Student session detected. Please login with admin credentials.");
      logout();
    }
  }, [isAuthenticated, user, logout]);

  // If already admin, go straight to dashboard
  useEffect(() => {
    if (user?.userType === "admin") {
      navigate("/admin-dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrStudentId || !password) {
      toast.error("Please enter admin email/ID and password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await login({ emailOrStudentId, password });
      if (!result?.success) {
        toast.error(result?.error || "Login failed. Please check credentials.");
        return;
      }

      // AuthProvider will set `user`; the effect above will navigate if admin.
      toast.success("Login successful.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="px-6 py-5 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Admin Login</h1>
          <p className="text-sm text-slate-600">
            Enter your admin credentials to access the dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Email / Admin ID
            </label>
            <input
              value={emailOrStudentId}
              onChange={(e) => setEmailOrStudentId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="admin@digidiploma.in"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            className="w-full rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-200"
            onClick={() => navigate("/", { replace: true })}
          >
            Back to Home
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

