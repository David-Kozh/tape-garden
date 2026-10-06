"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, functions } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, AlertCircle, ArrowRight, User, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import Image from "next/image";

type Step = "validating" | "error" | "auth" | "profile" | "accepting";

export default function InviteIntakePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("validating");
  const [errorMsg, setErrorMsg] = useState("");
  const [inviteeName, setInviteeName] = useState("");

  // Auth fields
  const [activeTab, setActiveTab] = useState<"signin" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authWorking, setAuthWorking] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [socialLink, setSocialLink] = useState("");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const validate = async () => {
      try {
        const validateInvite = httpsCallable<{ token: string }, { valid: boolean; reason?: string; inviteeName?: string }>(functions, "validateInvite");
        const res = await validateInvite({ token });
        if (!isMounted) return;

        if (res.data.valid) {
          setInviteeName(res.data.inviteeName || "");
          if (res.data.inviteeName) {
            setDisplayName(res.data.inviteeName);
            setAuthName(res.data.inviteeName);
          }
          if (user) {
            setStep("profile");
          } else {
            setStep("auth");
          }
        } else {
          let msg = "This invite link is invalid.";
          if (res.data.reason === "used-or-expired") {
            msg = "This invite link has already been used or has expired.";
          }
          setErrorMsg(msg);
          setStep("error");
        }
      } catch (err) {
        console.error("Validation error:", err);
        if (isMounted) {
          setErrorMsg("Failed to validate invite. Please try again.");
          setStep("error");
        }
      }
    };

    if (step === "validating" && !authLoading) {
      validate();
    }
    
    return () => { isMounted = false; };
  }, [token, authLoading, user, step]);

  // Handle Auth changes during the flow
  useEffect(() => {
    if (step === "auth" && user && !authLoading) {
      // User just logged in or registered
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(user.displayName || inviteeName || "");
      setPhotoURL(user.photoURL || "");
      setStep("profile");
    }
  }, [user, authLoading, step, inviteeName]);

  const handleGoogleSignIn = async () => {
    setAuthWorking(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
      // Let useEffect handle step transition
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      console.error(error);
      toast.error(error.message || "Google sign-in failed");
      setAuthWorking(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthWorking(true);
    try {
      if (activeTab === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!authName.trim()) {
          toast.error("Please provide your name.");
          setAuthWorking(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: authName.trim() });
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      console.error(error);
      toast.error(error.message || "Authentication failed");
      setAuthWorking(false);
    }
  };

  const handleAccept = async (skipProfile = false) => {
    setStep("accepting");
    try {
      const acceptInvite = httpsCallable(functions, "acceptInvite");
      
      const profileData = skipProfile ? {} : {
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: photoURL.trim(),
        socialLinks: socialLink.trim() ? [socialLink.trim()] : []
      };

      await acceptInvite({ token, profileData });
      
      // Force reload auth token to get new claims
      await auth.currentUser?.getIdToken(true);
      
      toast.success("Welcome to Tape Garden! Your producer account is ready.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      console.error("Accept error:", error);
      toast.error(error.message || "Failed to accept invite");
      setStep("profile"); // go back to profile to retry
    }
  };

  if (step === "validating" || authLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-zinc-500 animate-pulse">Checking invite...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center py-24 px-4">
        <Card className="max-w-md w-full p-8 flex flex-col items-center text-center gap-4 border-red-100 bg-red-50/50">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-red-900">Invalid Invite</h2>
          <p className="text-red-700">{errorMsg}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  if (step === "auth") {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center py-12 md:py-24 px-4">
        <div className="w-full max-w-md z-10 flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-18 h-12 rounded-lg bg-zinc-100/30 border border-emerald-500/20 flex items-center justify-center overflow-hidden p-0.5">
              <Image src="/logo.svg" alt="Tape Garden Logo" width={128} height={128} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">You&apos;ve Been Invited!</h1>
              <p className="text-md text-zinc-500 mt-1 max-w-[480px] mx-auto">
                {inviteeName ? `Join as ${inviteeName}` : "Create an account or sign in to accept your producer invite."}
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={authWorking}
                className="w-full py-3 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4 py-1">
                <div className="h-[1px] flex-1 bg-zinc-200" />
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">or email</span>
                <div className="h-[1px] flex-1 bg-zinc-200" />
              </div>

              <div className="flex rounded-lg bg-zinc-100 p-1">
                <button
                  onClick={() => setActiveTab("register")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${activeTab === "register" ? "bg-white text-emerald-800 shadow-sm" : "text-zinc-500"}`}
                >
                  Create Account
                </button>
                <button
                  onClick={() => setActiveTab("signin")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${activeTab === "signin" ? "bg-white text-emerald-800 shadow-sm" : "text-zinc-500"}`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
                {activeTab === "register" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium px-1">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Your Name"
                        disabled={authWorking}
                        required={activeTab === "register"}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border bg-zinc-50/50 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium px-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={authWorking}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border bg-zinc-50/50 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium px-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={authWorking}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border bg-zinc-50/50 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={authWorking} className="w-full py-6 mt-2 text-base">
                  {authWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : activeTab === "register" ? "Continue" : "Sign In"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "profile" || step === "accepting") {
    const isWorking = step === "accepting";
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center py-12 md:py-24 px-4">
        <div className="w-full max-w-lg z-10 flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Set up your Producer Profile</h1>
            <p className="text-md text-zinc-500 mt-1 max-w-[480px] mx-auto">
              You can fill these out now or skip and do it later in your dashboard.
            </p>
          </div>

          <Card className="p-8">
            <form onSubmit={(e) => { e.preventDefault(); handleAccept(false); }} className="flex flex-col gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  placeholder="e.g. Metro Boomin"
                  disabled={isWorking}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bio (Optional)</label>
                <Textarea 
                  value={bio} 
                  onChange={e => setBio(e.target.value)} 
                  placeholder="Tell us a bit about your sound..."
                  disabled={isWorking}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Profile Picture URL (Optional)</label>
                <Input 
                  type="url"
                  value={photoURL} 
                  onChange={e => setPhotoURL(e.target.value)} 
                  placeholder="https://..."
                  disabled={isWorking}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Social Link (Optional)</label>
                <Input 
                  type="url"
                  value={socialLink} 
                  onChange={e => setSocialLink(e.target.value)} 
                  placeholder="Instagram, Twitter, or website"
                  disabled={isWorking}
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button type="submit" disabled={isWorking} className="w-full font-bold">
                  {isWorking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isWorking ? "Accepting Invite..." : "Accept & Enter Dashboard"}
                  {!isWorking && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => handleAccept(true)}
                  disabled={isWorking}
                  className="w-full text-zinc-500"
                >
                  Skip for now
                </Button>
              </div>

            </form>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
