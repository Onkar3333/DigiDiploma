import React, { useState } from "react";
import { ALL_BRANCHES } from "@/constants/branches";
import { Eye, EyeOff, Mail, Phone as PhoneIcon } from "lucide-react";

interface LoginFormProps {
  onLogin: (credentials: { emailOrStudentId: string; password: string }) => Promise<{ success: boolean; error?: string; message?: string } | boolean | void>;
  onCreate: (credentials: { name: string; email: string; studentId: string; college: string; branch: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string; message?: string } | boolean | void>;
  onClose: () => void;
}

const BRANCHES = [...ALL_BRANCHES, "Other"];

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onCreate, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    studentId: "",
    college: "",
    branch: "",
    phone: "",
    password: "",
    emailOrStudentId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotValue, setForgotValue] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  
  // OTP verification states
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [phoneOTPSent, setPhoneOTPSent] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState({ email: false, phone: false });
  const [verifyLoading, setVerifyLoading] = useState({ email: false, phone: false });

  React.useEffect(() => {
    setShow(true);
  }, []);

  // Auto-clear success messages after 5 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-clear error messages after 8 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (type: 'email' | 'phone') => {
    setError("");
    setOtpLoading({ ...otpLoading, [type]: true });
    
    try {
      const endpoint = type === 'email' 
        ? `/api/users/send-email-otp`
        : `/api/users/send-phone-otp`;
      
      const payload = type === 'email'
        ? { email: form.email }
        : { phone: form.phone };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (type === 'email') {
          setEmailOTPSent(true);
          if (data.method === 'email') {
            setSuccess(`✅ OTP sent successfully! Please check your email inbox (${form.email}) for the verification code.`);
          } else {
            // Console mode - show OTP in development
            const otpMessage = data.otp 
              ? `OTP generated: ${data.otp} (Check server console for details)`
              : `OTP generated. ${data.note || 'Check server console for OTP code.'}`;
            setSuccess(`⚠️ ${otpMessage}`);
          }
          setError(""); // Clear any previous errors
        } else {
          setPhoneOTPSent(true);
          if (data.method === 'sms') {
            setSuccess(`✅ OTP sent successfully! Please check your SMS inbox (${data.phone || form.phone}) for the verification code.`);
          } else {
            // Console mode - show OTP in development
            const otpMessage = data.otp 
              ? `OTP generated: ${data.otp} (Check server console for details)`
              : `OTP generated. ${data.note || 'Check server console for OTP code.'}`;
            setSuccess(`⚠️ ${otpMessage}`);
          }
          setError(""); // Clear any previous errors
        }
      } else {
        // Handle rate limiting (429) and other errors
        if (res.status === 429) {
          const retryAfter = data.retryAfter || 15;
          const errorMsg = data.error || `Please wait ${retryAfter} seconds before requesting a new OTP.`;
          setError(errorMsg);
        } else {
          const errorMsg = data.error || `Failed to send ${type} OTP. Please try again.`;
          setError(errorMsg);
        }
        setSuccess(""); // Clear success message on error
      }
    } catch (err: any) {
      const errorMsg = err.message || `Network error. Failed to send ${type} OTP. Please check your connection and try again.`;
      setError(errorMsg);
      setSuccess(""); // Clear success message on error
    } finally {
      setOtpLoading({ ...otpLoading, [type]: false });
    }
  };

  const handleVerifyOTP = async (type: 'email' | 'phone') => {
    setError("");
    setVerifyLoading({ ...verifyLoading, [type]: true });
    
    try {
      const endpoint = type === 'email'
        ? `/api/users/verify-email-otp`
        : `/api/users/verify-phone-otp`;
      
      const payload = type === 'email'
        ? { email: form.email, otp: emailOTP }
        : { phone: form.phone, otp: phoneOTP };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (type === 'email') {
          setEmailVerified(true);
          setSuccess("Email verified successfully! ✓");
          setError(""); // Clear any previous errors
        } else {
          setPhoneVerified(true);
          setSuccess("Phone number verified successfully! ✓");
          setError(""); // Clear any previous errors
        }
      } else {
        const errorMsg = data.error || `Invalid ${type} OTP. Please check the code and try again.`;
        setError(errorMsg);
        setSuccess(""); // Clear success message on error
      }
    } catch (err: any) {
      const errorMsg = err.message || `Network error. Failed to verify ${type} OTP. Please check your connection and try again.`;
      setError(errorMsg);
      setSuccess(""); // Clear success message on error
    } finally {
      setVerifyLoading({ ...verifyLoading, [type]: false });
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotValue) {
      setError("Please enter your email or enrollment number");
      return;
    }
    
    setForgotLoading(true);
    setError("");
    setForgotMsg("");
    
    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrStudentId: forgotValue })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setForgotMsg(data.message || "If this account exists, a password reset link will be sent to your email. Please check your inbox.");
        setForgotValue("");
        setError(""); // Clear any errors
      } else {
        const errorMsg = data.error || "Failed to process password reset request. Please check your email/enrollment number and try again.";
        setError(errorMsg);
        setForgotMsg(""); // Clear success message on error
      }
    } catch (err: any) {
      const errorMsg = err.message || "Network error. Please check your connection and try again.";
      setError(errorMsg);
      setForgotMsg(""); // Clear success message on error
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!form.name || !form.email || !form.studentId || !form.college || !form.branch || !form.phone || !form.password) {
          setError("All fields are required. Please fill in all the information.");
          setLoading(false);
          return;
        }
        
        if (!emailVerified) {
          setError("Please verify your email address with OTP before registering.");
          setLoading(false);
          return;
        }
        
        if (!phoneVerified) {
          setError("Please verify your phone number with OTP before registering.");
          setLoading(false);
          return;
        }
        
        const result = await onCreate({
          name: form.name,
          email: form.email,
          studentId: form.studentId,
          college: form.college,
          branch: form.branch,
          phone: form.phone,
          password: form.password,
        });
        
        // Handle result from onCreate
        if (result) {
          if (typeof result === 'object' && 'success' in result) {
            if (result.success) {
              setSuccess(result.message || "Registration successful! You can now login.");
              // Reset form after a short delay
              setTimeout(() => {
                setIsRegister(false);
                setForm({ 
                  name: "",
                  email: "",
                  studentId: "",
                  college: "",
                  branch: "",
                  phone: "",
                  password: "",
                  emailOrStudentId: ""
                });
                setEmailOTP("");
                setPhoneOTP("");
                setEmailVerified(false);
                setPhoneVerified(false);
                setEmailOTPSent(false);
                setPhoneOTPSent(false);
              }, 2000);
            } else {
              setError(result.error || "Registration failed. Please try again.");
            }
          } else if (result === true) {
            // Backward compatibility - if result is just true
            setSuccess("Registration successful! You can now login.");
            setTimeout(() => {
              setIsRegister(false);
              setForm({ ...form, password: "" });
              setEmailOTP("");
              setPhoneOTP("");
              setEmailVerified(false);
              setPhoneVerified(false);
              setEmailOTPSent(false);
              setPhoneOTPSent(false);
            }, 2000);
          }
        } else {
          // If no result returned, assume success (backward compatibility)
        setSuccess("Registration successful! You can now login.");
          setTimeout(() => {
        setIsRegister(false);
        setForm({ ...form, password: "" });
        setEmailOTP("");
        setPhoneOTP("");
        setEmailVerified(false);
        setPhoneVerified(false);
        setEmailOTPSent(false);
        setPhoneOTPSent(false);
          }, 2000);
        }
      } else {
        if (!form.emailOrStudentId || !form.password) {
          setError("Email/Enrollment number and password are required.");
          setLoading(false);
          return;
        }
        
        const result = await onLogin({
          emailOrStudentId: form.emailOrStudentId,
          password: form.password,
        });
        
        // Handle result from onLogin
        if (result) {
          if (typeof result === 'object' && 'success' in result) {
            if (result.success) {
              setSuccess(result.message || "Login successful! Redirecting...");
              // Form will close automatically on successful login
            } else {
              setError(result.error || "Invalid credentials. Please check your email/enrollment number and password.");
      }
          } else if (result === true) {
            // Backward compatibility
            setSuccess("Login successful! Redirecting...");
          }
        } else {
          // If no result returned, show generic error
          setError("Invalid credentials. Please check your email/enrollment number and password.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div
        className={`w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-500 ease-out
        ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-16'}
        `}
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Decorative Curved Gradient Header */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-b-[60px] flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">
              {isRegister ? "Create Account" : "Login"}
            </h2>
            <p className="text-white/90 text-lg">
              {isRegister ? "Join our educational platform" : "Access your account"}
            </p>
          </div>
          {/* SVG Wave */}
          <svg className="absolute -bottom-1 left-0 w-full h-8" viewBox="0 0 400 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0C80 40 320 40 400 0V40H0V0Z" fill="white" />
          </svg>
        </div>
        {/* Tabs */}
        <div className="flex justify-center mt-4 mb-2 gap-2">
          <button
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-200 ${!isRegister ? "bg-white text-indigo-600 border-b-2 border-indigo-500" : "bg-gray-100 text-gray-500"}`}
            onClick={() => {
              setIsRegister(false);
              setError("");
              setSuccess("");
              setEmailVerified(false);
              setPhoneVerified(false);
              setEmailOTPSent(false);
              setPhoneOTPSent(false);
              setEmailOTP("");
              setPhoneOTP("");
              setForm({ ...form, password: "", emailOrStudentId: "" });
            }}
          >
            Login
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-200 ${isRegister ? "bg-white text-indigo-600 border-b-2 border-indigo-500" : "bg-gray-100 text-gray-500"}`}
            onClick={() => {
              setIsRegister(true);
              setError("");
              setSuccess("");
              setForm({ ...form, password: "", emailOrStudentId: "" });
            }}
          >
            Create Account
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-8 pt-2 pb-8 space-y-4 max-h-[70vh] overflow-y-auto">
          {showForgot ? (
            <>
              <input
                type="text"
                name="forgotValue"
                placeholder="Enter your Email or Enrollment Number"
                value={forgotValue}
                onChange={e => setForgotValue(e.target.value)}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <button
                type="button"
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-2 rounded transition-colors duration-200 flex items-center justify-center"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  "Send Recovery Link"
                )}
              </button>
              <button
                type="button"
                className="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition"
                onClick={() => { setShowForgot(false); setForgotMsg(""); setForgotValue(""); }}
              >
                Back to Login
              </button>
              {forgotMsg && <div className="text-green-600 text-sm text-center mt-2">{forgotMsg}</div>}
            </>
          ) : isRegister ? (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
                  disabled={emailVerified}
              />
                {!emailVerified && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendOTP('email')}
                      disabled={!form.email || otpLoading.email}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center justify-center"
                    >
                      {otpLoading.email ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Mail className="w-3 h-3 mr-1" />
                          Send OTP
                        </>
                      )}
                    </button>
                    {emailOTPSent && (
                      <>
                        <input
                          type="text"
                          placeholder="Enter OTP"
                          value={emailOTP}
                          onChange={(e) => setEmailOTP(e.target.value)}
                          maxLength={6}
                          className="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyOTP('email')}
                          disabled={!emailOTP || verifyLoading.email}
                          className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                          {verifyLoading.email ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            "Verify"
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
                {emailVerified && (
                  <div className="mt-1 text-xs text-green-600 flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    Email verified ✓
                  </div>
                )}
              </div>
              <div>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Mobile Number (e.g., +91 9876543210)"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                  disabled={phoneVerified}
                />
                {!phoneVerified && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendOTP('phone')}
                      disabled={!form.phone || otpLoading.phone}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center justify-center"
                    >
                      {otpLoading.phone ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <PhoneIcon className="w-3 h-3 mr-1" />
                          Send OTP
                        </>
                      )}
                    </button>
                    {phoneOTPSent && (
                      <>
                        <input
                          type="text"
                          placeholder="Enter OTP"
                          value={phoneOTP}
                          onChange={(e) => setPhoneOTP(e.target.value)}
                          maxLength={6}
                          className="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyOTP('phone')}
                          disabled={!phoneOTP || verifyLoading.phone}
                          className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                          {verifyLoading.phone ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            "Verify"
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
                {phoneVerified && (
                  <div className="mt-1 text-xs text-green-600 flex items-center">
                    <PhoneIcon className="w-3 h-3 mr-1" />
                    Phone verified ✓
                  </div>
                )}
              </div>
              <input
                type="text"
                name="studentId"
                placeholder="Enrollment Number"
                value={form.studentId}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <input
                type="text"
                name="college"
                placeholder="College Name"
                value={form.college}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <select
                name="branch"
                value={form.branch}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              >
                <option value="">Select Branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              <div className="relative">
              <input
                  type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                  className="w-full px-4 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white hover:text-white/80"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                name="emailOrStudentId"
                placeholder="Email / Enrollment Number / Admin ID"
                value={form.emailOrStudentId}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <div className="relative">
              <input
                  type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                  className="w-full px-4 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white hover:text-white-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-white-600 hover:text-white text-sm font-medium hover:underline transition-colors"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot Password?
                </button>
              </div>
            </>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="flex-1">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="flex-1">{success}</span>
            </div>
          )}
          {!isRegister && (
            <div className="text-xs text-gray-500 text-center bg-blue-50 p-2 rounded">
              <strong>Admin Login:</strong> admin@eduportal.com / admin123
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (isRegister && (!emailVerified || !phoneVerified))}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-2 rounded transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isRegister ? "Registering..." : "Logging in..."}
              </>
            ) : (
              isRegister ? "Register" : "Login"
            )}
          </button>
          <button
            type="button"
            className="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition"
            onClick={onClose}
          >
            Cancel
          </button>
        </form>
        <div className="text-center pb-4 text-gray-500 text-xs">
          Need help? Contact us at <a href="mailto:digidiplomahelp@gmail.com" className="text-blue-600 hover:text-blue-800">support@digidiploma.com</ a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 
