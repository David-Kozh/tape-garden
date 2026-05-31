"use client";

import { useState, useEffect } from "react";
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
import { CassetteTape, Mail, Lock, User, Loader2, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
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
          router.push("/admin");
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
    
    try {
      await signInWithPopup(auth, provider);
      // Auth state update and redirection will be handled by the useEffect above
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in window was closed before completion.");
      } else {
        setError(err.message || "An unexpected error occurred during Google sign-in.");
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
    } catch (err: any) {
      console.error("Email Authentication Error:", err);
      let friendlyMessage = err.message;
      
      switch (err.code) {
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
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center text-zinc-100">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#08080a] text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300 flex flex-col justify-center items-center px-4 overflow-x-hidden font-sans antialiased">
      
      {/* Background Mesh Glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] aspect-square rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[50%] aspect-square rounded-full bg-blue-950/10 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10 flex flex-col gap-8">
        
        {/* Sleek Logo / Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
            <CassetteTape className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {activeTab === "signin" ? "Enter the Garden" : "Join the Garden"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-[280px] mx-auto">
              {activeTab === "signin" 
                ? "Access your curation dashboard, beats list, and downloads." 
                : "Create an account to browse and acquire curated analog sound assets."
              }
            </p>
          </div>
        </div>

        {/* Auth Container Card */}
        <div className="relative rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-md">
          
          <div className="flex flex-col gap-6">
            
            {/* Google Authentication Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              id="google-signin-btn"
              className="w-full py-3 px-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700 text-zinc-200 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.104C18.28 1.926 15.47 1 12.24 1 5.922 1 1 5.922 1 12s4.922 11 11.24 11c6.6 0 11-4.636 11-11.186 0-.75-.082-1.32-.18-1.815H12.24z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Visual Separator */}
            <div className="flex items-center gap-4 py-1">
              <div className="h-[1px] flex-1 bg-zinc-900" />
              <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">or email</span>
              <div className="h-[1px] flex-1 bg-zinc-900" />
            </div>

            {/* Email/Password Custom Tabs */}
            <div className="flex rounded-lg bg-zinc-900/40 p-1 border border-zinc-900/80">
              <button
                onClick={() => {
                  setActiveTab("signin");
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold tracking-tight transition-all duration-300 cursor-pointer ${
                  activeTab === "signin" 
                    ? "bg-zinc-850 text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setActiveTab("register");
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold tracking-tight transition-all duration-300 cursor-pointer ${
                  activeTab === "register" 
                    ? "bg-zinc-850 text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Alert / Error Box */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Custom Input Form */}
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
              
              {/* Full Name field (Register only) */}
              {activeTab === "register" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name-input" className="text-xs text-zinc-500 font-medium px-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="text"
                      id="name-input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      disabled={loading}
                      required={activeTab === "register"}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/50 focus:bg-zinc-950 hover:border-zinc-800 transition-all text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email-input" className="text-xs text-zinc-500 font-medium px-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="email"
                    id="email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/50 focus:bg-zinc-950 hover:border-zinc-800 transition-all text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="password-input" className="text-xs text-zinc-500 font-medium">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    id="password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/50 focus:bg-zinc-950 hover:border-zinc-800 transition-all text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:hover:shadow-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    Curation loading...
                  </>
                ) : (
                  <>
                    {activeTab === "signin" ? "Sign In" : "Register and Enter"}
                    <ArrowRight className="w-4 h-4 text-zinc-950" />
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Back Link to Gallery */}
        <button
          onClick={() => router.push("/")}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center font-medium cursor-pointer"
        >
          ← Return to Curator&apos;s Bench
        </button>

      </div>
    </div>
  );
}
