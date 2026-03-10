import { useState } from "react";
import { cn } from "@/utils/cn";
import { useSignIn, useSignUp, useSignInWithGoogle } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/services/supabase";

type AuthMode = "signin" | "signup";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const signIn = useSignIn();
  const signUp = useSignUp();
  const signInWithGoogle = useSignInWithGoogle();

  const isLoading = signIn.isPending || signUp.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
      setError("Please enter your first and last name");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      if (mode === "signin") {
        await signIn.mutateAsync({ email, password });
      } else {
        await signUp.mutateAsync({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        setSuccessMessage("Check your email to confirm your account!");
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-[#FFF3CC] rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#B8860B]">
              <path d="M12 9V13M12 17H12.01M5.07 19H18.93C20.47 19 21.45 17.33 20.68 16L13.75 4C12.98 2.67 11.02 2.67 10.25 4L3.32 16C2.55 17.33 3.53 19 5.07 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary font-serif">
            Supabase Not Configured
          </h1>
          <p className="text-text-secondary">
            To enable authentication, create a <code className="bg-[#F5F5F0] px-1.5 py-0.5 rounded">.env</code> file with your Supabase credentials:
          </p>
          <div className="bg-[#F5F5F0] rounded-lg p-4 text-left text-sm font-mono text-text-primary">
            <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY=your-anon-key</div>
          </div>
          <p className="text-sm text-text-muted">
            Get these from Supabase Dashboard → Settings → API
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a1a] text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#1a1a1a] font-bold">W</span>
          </div>
          <span className="font-semibold text-lg">Work Tracker</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-xl leading-relaxed">
            "This app has transformed how I manage my daily tasks and meetings.
            The calendar integration is seamless."
          </blockquote>
          <div>
            <div className="font-medium">Sofia Davis</div>
            <div className="text-white/60">Product Designer</div>
          </div>
        </div>

        <div className="text-sm text-white/40">
          © 2026 Work Tracker. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[350px] space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-text-primary font-serif">
              {mode === "signin" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-text-secondary">
              {mode === "signin"
                ? "Enter your credentials to sign in"
                : "Enter your email below to create your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name fields - only show on signup */}
            {mode === "signup" && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-text-primary"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors disabled:opacity-50"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-text-primary"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-primary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] transition-colors disabled:opacity-50"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                {successMessage}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-2.5 rounded-lg font-medium transition-colors",
                "bg-[#1a1a1a] text-white hover:bg-[#333]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading
                ? "Loading..."
                : mode === "signin"
                ? "Sign In"
                : "Sign Up"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-text-muted">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={() => {
              setError(null);
              signInWithGoogle.mutate(undefined, {
                onError: (err) => {
                  setError(err instanceof Error ? err.message : "Google sign-in failed");
                },
              });
            }}
            disabled={isLoading || signInWithGoogle.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-border-subtle rounded-lg text-text-primary hover:bg-background-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M15.68 8.18c0-.567-.05-1.113-.145-1.636H8v3.094h4.305a3.68 3.68 0 01-1.597 2.415v2.007h2.585c1.513-1.393 2.387-3.444 2.387-5.88z"
                fill="#4285F4"
              />
              <path
                d="M8 16c2.16 0 3.97-.716 5.293-1.94l-2.585-2.008c-.716.48-1.633.763-2.708.763-2.082 0-3.845-1.405-4.474-3.294H.848v2.073A7.997 7.997 0 008 16z"
                fill="#34A853"
              />
              <path
                d="M3.526 9.52A4.813 4.813 0 013.275 8c0-.528.091-1.04.251-1.52V4.406H.848A7.997 7.997 0 000 8c0 1.29.31 2.511.848 3.594l2.678-2.073z"
                fill="#FBBC05"
              />
              <path
                d="M8 3.186c1.174 0 2.229.403 3.058 1.196l2.294-2.294C11.966.79 10.156 0 8 0A7.997 7.997 0 00.848 4.406l2.678 2.073C4.155 4.591 5.918 3.186 8 3.186z"
                fill="#EA4335"
              />
            </svg>
            <span>{signInWithGoogle.isPending ? "Connecting..." : "Google"}</span>
          </button>

          {/* Toggle mode */}
          <p className="text-center text-sm text-text-secondary">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-text-primary font-medium underline underline-offset-4 hover:text-[#8B7355]"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-text-primary font-medium underline underline-offset-4 hover:text-[#8B7355]"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Terms */}
          <p className="text-center text-xs text-text-muted">
            By continuing, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
