"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, User, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Image from "next/image";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, loading: authLoading } = useAuth();

  // Tabs: 'signin' | 'register'
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // UI states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Retrieve the requested redirect route from query params
  const redirectUrl = searchParams.get("redirect") || "";

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        // Redirection based on role claim
        if (role === "admin") {
          router.push("/admin/users");
        } else if (role === "producer") {
          router.push("/dashboard");
        } else {
          router.push("/");
        }
      }
    }
  }, [user, role, authLoading, redirectUrl, router]);

  // Read URL tab param if present
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "register") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("register");
    } else if (tabParam === "login") {
      setActiveTab("signin");
    }
  }, [searchParams]);

  // Handle Google Login / Registration
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      await signInWithPopup(auth, provider);
      // Auth state update and redirection will be handled by the useEffect above
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      console.error("Google Sign-In Error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in window was closed before completion.");
      } else {
        setError(error.message || "An unexpected error occurred during Google sign-in.");
      }
      setLoading(false);
    }
  };

  // Handle Email/Password Login & Signup
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all credentials.");
      setLoading(false);
      return;
    }

    try {
      if (activeTab === "signin") {
        // Sign In Flow
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Registration Flow
        if (!displayName.trim()) {
          setError("Please provide your name.");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Set display name in Firebase auth profile
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });

        // Trigger a profile refresh
        await auth.currentUser?.reload();
      }
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      console.error("Email Authentication Error:", error);
      let friendlyMessage = error.message;

      switch (error.code) {
        case "auth/invalid-email":
          friendlyMessage = "The email address is invalid.";
          break;
        case "auth/user-disabled":
          friendlyMessage = "This account has been suspended.";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          friendlyMessage = "Incorrect email address or password.";
          break;
        case "auth/email-already-in-use":
          friendlyMessage = "This email is already registered.";
          break;
        case "auth/weak-password":
          friendlyMessage = "Password should be at least 6 characters.";
          break;
      }
      setError(friendlyMessage);
      setLoading(false);
    }
  };

  // Prevent flash of empty form while redirecting authenticated users
  if (authLoading || (user && !loading)) {
    return (
      <div className="flex-1 w-full flex items-center justify-center text-zinc-900 py-24">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full relative text-zinc-900 selection:bg-emerald-500/20 selection:text-emerald-900 flex flex-col justify-center items-center px-4 overflow-x-hidden font-sans antialiased py-12 md:py-24">

      <div className="w-full max-w-md z-10 flex flex-col gap-8">

        {/* Sleek Logo / Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-18 h-12 rounded-lg bg-zinc-100/30 border border-emerald-500/20 flex items-center justify-center shadow-sm overflow-hidden p-0.5">
            <Image
              src="/logo.svg"
              alt="Tape Garden Logo"
              width={128}
              height={128}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {activeTab === "signin" ? "Enter the Garden" : "Join the Garden"}
            </h1>
            <p className="text-md text-zinc-500 mt-1 max-w-[480px] mx-auto">
              {activeTab === "signin"
                ? "Access your dashboard, beats, and purchases."
                : "Create an account to browse and acquire curated sound assets."
              }
            </p>
          </div>
        </div>

        {/* Auth Container Card */}
        <div className="relative rounded-2xl border border-zinc-200/80 bg-white/60 p-8 shadow-sm backdrop-blur-md">

          <div className="flex flex-col gap-6">

            {/* Google Authentication Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              id="google-signin-btn"
              className="w-full py-4 px-4 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 text-zinc-700 text-md font-semibold transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Visual Separator */}
            <div className="flex items-center gap-4 py-1">
              <div className="h-[1px] flex-1 bg-zinc-300" />
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">or email</span>
              <div className="h-[1px] flex-1 bg-zinc-300" />
            </div>

            {/* Email/Password Custom Tabs */}
            <div className="flex rounded-lg bg-zinc-100/80 p-1 border border-zinc-200">
              <button
                onClick={() => {
                  setActiveTab("signin");
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold tracking-tight transition-all duration-300 cursor-pointer ${activeTab === "signin"
                  ? "bg-white text-emerald-800 shadow-sm border border-zinc-200/50"
                  : "text-zinc-500 hover:text-zinc-700"
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setActiveTab("register");
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold tracking-tight transition-all duration-300 cursor-pointer ${activeTab === "register"
                  ? "bg-white text-emerald-800 shadow-sm border border-zinc-200/50"
                  : "text-zinc-500 hover:text-zinc-700"
                  }`}
              >
                Create Account
              </button>
            </div>

            {/* Alert / Error Box */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Custom Input Form */}
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">

              {/* Full Name field (Register only) */}
              {activeTab === "register" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name-input" className="text-xs text-zinc-700 font-medium px-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      id="name-input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      disabled={loading}
                      required={activeTab === "register"}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-zinc-300 focus:border-emerald-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email-input" className="text-xs text-zinc-700 font-medium px-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    id="email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-zinc-300 focus:border-emerald-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="password-input" className="text-xs text-zinc-700 font-medium">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    id="password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-zinc-300 focus:border-emerald-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    loading...
                  </>
                ) : (
                  <>
                    {activeTab === "signin" ? "Sign In" : "Register and Enter"}
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Back Link to Gallery */}
        <button
          onClick={() => router.push("/")}
          className="text-xs text-zinc-600 hover:text-zinc-800 transition-colors text-center font-medium cursor-pointer"
        >
          ← Return to Curator&apos;s Bench
        </button>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 w-full flex items-center justify-center text-zinc-900 py-24">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
