import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import logoIcon from "@/assets/logo-icon.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      
      toast.success("Account created successfully!");
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success("Signed in successfully!");
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    toast.info("Google sign-in coming soon!");
  };

  const handleAppleSignIn = async () => {
    toast.info("Apple sign-in coming soon!");
  };

  const handleMicrosoftSignIn = async () => {
    toast.info("Microsoft sign-in coming soon!");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-10">
          {/* Logo Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#2563EB] flex items-center justify-center shadow-lg">
              <LogIn className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? "Create your account!" : "Login to your account!"}
            </h1>
            <p className="text-sm text-gray-500">
              {isSignUp 
                ? "Enter your details to create a new account"
                : "Enter your registered email address and password to login!"}
            </p>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="eg. pixelcot@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="************"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-[#2563EB] hover:underline font-medium"
                >
                  Forgot Password ?
                </button>
              </div>
            )}

            {/* Login/Signup Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base rounded-lg shadow-lg"
              disabled={loading}
            >
              {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Login")}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or login with</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              variant="outline"
              className="h-12 bg-white hover:bg-gray-50 border-gray-200 rounded-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </Button>

            <Button
              type="button"
              onClick={handleAppleSignIn}
              variant="outline"
              className="h-12 bg-white hover:bg-gray-50 border-gray-200 rounded-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </Button>

            <Button
              type="button"
              onClick={handleMicrosoftSignIn}
              variant="outline"
              className="h-12 bg-white hover:bg-gray-50 border-gray-200 rounded-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#f25022" d="M1 1h10v10H1z"/>
                <path fill="#00a4ef" d="M13 1h10v10H13z"/>
                <path fill="#7fba00" d="M1 13h10v10H1z"/>
                <path fill="#ffb900" d="M13 13h10v10H13z"/>
              </svg>
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-6 text-sm text-gray-600">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-[#2563EB] hover:underline font-semibold"
                >
                  Login here
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-[#2563EB] hover:underline font-semibold"
                >
                  Sign up here
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        <div className="max-w-2xl text-center space-y-8">
          {/* Heading */}
          <h2 className="text-5xl font-bold text-gray-900">
            Write Better <span className="text-[#2563EB]">Everywhere</span>
          </h2>

          {/* Animated Circular Diagram */}
          <div className="relative w-full aspect-square max-w-md mx-auto">
            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-[#2563EB] shadow-2xl flex items-center justify-center animate-pulse">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
                <span className="text-3xl font-bold text-[#2563EB]">P</span>
              </div>
            </div>

            {/* Orbiting Icons */}
            <div className="absolute inset-0 animate-spin-slow">
              {/* Edge */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                </svg>
              </div>

              {/* Android */}
              <div className="absolute top-1/4 left-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.8 11.16 3.5 13.8 3.5 16.5h17c0-2.7-1.3-5.34-2.9-7.02zM7 14.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                </svg>
              </div>

              {/* Teams */}
              <div className="absolute top-1/4 right-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect width="24" height="24" rx="4"/>
                </svg>
              </div>

              {/* Messenger */}
              <div className="absolute top-1/2 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center -translate-y-1/2">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>

              {/* Chrome */}
              <div className="absolute bottom-1/4 right-0 w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-yellow-500 shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>

              {/* Yahoo */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Y!</span>
              </div>

              {/* LinkedIn */}
              <div className="absolute bottom-1/4 left-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
              </div>

              {/* Apple */}
              <div className="absolute top-1/2 left-4 w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-black shadow-lg flex items-center justify-center -translate-y-1/2">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              </div>
            </div>

            {/* Inner Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-blue-200 opacity-30"></div>
            {/* Outer Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border-2 border-blue-100 opacity-20"></div>
          </div>

          {/* Bottom Text */}
          <p className="text-sm text-gray-600 max-w-lg mx-auto">
            Compatible with <span className="font-semibold italic">Gmail, Outlook Web, LinkedIn and most web editors</span> for a smooth writing experience anywhere online.
          </p>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-1 rounded-full bg-[#2563EB]"></div>
            <div className="w-2 h-1 rounded-full bg-gray-300"></div>
            <div className="w-2 h-1 rounded-full bg-gray-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;