import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/LoginForm";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/materials";
  const { login, register, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (user) {
    navigate(returnUrl, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Sign in to DigiDiploma</h1>
          <p className="text-sm text-slate-600 mt-1">
            Log in to purchase materials and access your account
          </p>
        </div>
        <LoginForm
          onLogin={async (creds) => {
            const result = await login(creds);
            if (result?.success) navigate(returnUrl, { replace: true });
            return result;
          }}
          onCreate={async (creds) => {
            const result = await register(creds);
            if (result?.success) navigate(returnUrl, { replace: true });
            return result;
          }}
          onClose={() => navigate(returnUrl)}
        />
      </div>
    </div>
  );
};

export default Login;
