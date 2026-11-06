"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { auth, db, functions, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, AlertCircle, ArrowRight, User, Mail, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import Image from "next/image";

type Step = "validating" | "error" | "auth" | "profile" | "accepting";

export interface ProducerIntakeProps {
  mode: "invite" | "application";
  token?: string;
  oobCode?: string;
}

export function ProducerIntake({ mode, token, oobCode }: ProducerIntakeProps) {
  const router = useRouter();
  const { user, loading: authLoading, refreshAuth } = useAuth();

  const [step, setStep] = useState<Step>("validating");
  const [errorTitle, setErrorTitle] = useState(
    mode === "invite" ? "Invalid Invite" : "Invalid or Expired Link"
  );
  const [errorMsg, setErrorMsg] = useState("");

  // Auth fields
  const [activeTab, setActiveTab] = useState<"signin" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authWorking, setAuthWorking] = useState(false);
  const [authMethod, setAuthMethod] = useState<
    "google" | "email-signin" | "email-register" | "password-reset" | null
  >(null);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [socialLink, setSocialLink] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Validate either the invite token or the Firebase password reset oobCode
  useEffect(() => {
    let isMounted = true;

    const validateInviteFlow = async () => {
      if (!token) {
        if (isMounted) {
          setErrorTitle("Invalid Invite");
          setErrorMsg("This invite link is missing a valid token.");
          setStep("error");
        }
        return;
      }

      try {
        const validateInvite = httpsCallable<
          { token: string },
          { valid: boolean; inviteeName?: string; reason?: string }
        >(functions, "validateInvite");
        const res = await validateInvite({ token });
        if (!isMounted) return;

        if (res.data.valid) {
          if (user) {
            setDisplayName(user.displayName || res.data.inviteeName || "");
            setPhotoURL(user.photoURL || "");
            setStep("profile");
          } else {
            if (res.data.inviteeName) {
              setAuthName(res.data.inviteeName);
            }
            setStep("auth");
          }
        } else {
          let msg = "This invite link is invalid.";
          if (res.data.reason === "used-or-expired") {
            msg = "This invite link has already been used or has expired.";
          }
          setErrorTitle("Invalid Invite");
          setErrorMsg(msg);
          setStep("error");
        }
      } catch (err) {
        console.error("Validation error:", err);
        if (isMounted) {
          setErrorTitle("Invalid Invite");
          setErrorMsg("Failed to validate invite. Please try again.");
          setStep("error");
        }
      }
    };

    const validateApplicationFlow = async () => {
      if (!oobCode) {
        if (isMounted) {
          setErrorTitle("Invalid Setup Link");
          setErrorMsg("This password setup link is missing its verification code.");
          setStep("error");
        }
        return;
      }

      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        if (!isMounted) return;
        setEmail(verifiedEmail);
        setStep("auth");
      } catch (err) {
        console.error("Password reset code verification error:", err);
        if (isMounted) {
          setErrorTitle("Link Expired or Invalid");
          setErrorMsg(
            "This password setup link has already been used or has expired. If you already set your password, you can sign in directly."
          );
          setStep("error");
        }
      }
    };

    if (step === "validating" && !authLoading) {
      if (mode === "invite") {
        validateInviteFlow();
      } else {
        validateApplicationFlow();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [mode, token, oobCode, authLoading, user, step]);

  // Handle Auth state changes during the Invite flow
  useEffect(() => {
    if (mode === "invite" && step === "auth" && user && !authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(user.displayName || authName.trim() || "");
      setPhotoURL(user.photoURL || "");
      setStep("profile");
    }
  }, [mode, user, authLoading, step, authName]);

  const handleGoogleSignIn = async () => {
    setAuthWorking(true);
    setAuthMethod("google");
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

  const handleInviteEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthWorking(true);
    try {
      if (activeTab === "signin") {
        setAuthMethod("email-signin");
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!authName.trim()) {
          toast.error("Please provide your name.");
          setAuthWorking(false);
          return;
        }
        setAuthMethod("email-register");
        const trimmedName = authName.trim();
        setDisplayName(trimmedName);
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: trimmedName });
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      console.error(error);
      toast.error(error.message || "Authentication failed");
      setAuthWorking(false);
    }
  };

  const handleApplicationPasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setAuthWorking(true);
    setAuthMethod("password-reset");

    try {
      // 1. Set the new password using the Firebase oobCode
      await confirmPasswordReset(auth, oobCode, password);

      // 2. Sign the producer in immediately with their new credentials
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // 3. Load existing user profile data provisioned by reviewApplication
      let initialName = cred.user.displayName || "";
      let initialBio = "";
      let initialAvatar = cred.user.photoURL || "";
      let initialSocial = "";

      try {
        const userSnap = await getDoc(doc(db, "users", cred.user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.displayName) initialName = data.displayName;
          if (data.producerProfile?.bio) initialBio = data.producerProfile.bio;
          if (data.producerProfile?.avatarUrl) initialAvatar = data.producerProfile.avatarUrl;
          if (
            Array.isArray(data.producerProfile?.socialLinks) &&
            data.producerProfile.socialLinks.length > 0
          ) {
            const firstLink = data.producerProfile.socialLinks[0];
            try {
              const parsed = JSON.parse(firstLink);
              initialSocial = parsed.url || firstLink;
            } catch {
              initialSocial = firstLink;
            }
          }
        }
      } catch (profileFetchErr) {
        console.warn("Could not pre-fetch profile document:", profileFetchErr);
      }

      setDisplayName(initialName);
      setBio(initialBio);
      setPhotoURL(initialAvatar);
      setSocialLink(initialSocial);
      setAuthWorking(false);
      toast.success("Password set! Next, customize your producer profile.");
      setStep("profile");
    } catch (err: unknown) {
      const error = err as Error & { code?: string; message?: string };
      console.error("Password setup error:", error);
      let friendlyMsg = error.message || "Failed to set password.";
      if (error.code === "auth/weak-password") {
        friendlyMsg = "Password should be at least 6 characters.";
      } else if (error.code === "auth/expired-action-code" || error.code === "auth/invalid-action-code") {
        friendlyMsg = "This password setup link has expired or already been used.";
      }
      toast.error(friendlyMsg);
      setAuthWorking(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar image must be less than 5MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const extension = file.name.split(".").pop();
      const storageRef = ref(storage, `avatars/${user.uid}/avatar.${extension}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        null,
        (error) => {
          console.error("Upload error:", error);
          toast.error(error.message || "Avatar upload failed.");
          setUploadingAvatar(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setPhotoURL(downloadURL);
          setUploadingAvatar(false);
          toast.success("Avatar uploaded!");
        }
      );
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Upload error:", error);
      toast.error(error.message || "Avatar upload failed.");
      setUploadingAvatar(false);
    }
  };

  const handleAccept = async (skipProfile = false) => {
    setStep("accepting");
    try {
      if (mode === "invite") {
        const acceptInvite = httpsCallable(functions, "acceptInvite");

        const profileData = skipProfile
          ? {}
          : {
              displayName: displayName.trim(),
              bio: bio.trim(),
              photoURL: photoURL.trim(),
              socialLinks: socialLink.trim() ? [socialLink.trim()] : [],
            };

        await acceptInvite({ token, profileData });
      } else {
        // Application mode: account & producer role are already provisioned by reviewApplication;
        // persist any profile customizations directly to Firestore and Firebase Auth.
        if (!skipProfile && auth.currentUser) {
          const trimmedName = displayName.trim();
          const trimmedBio = bio.trim();
          const trimmedPhoto = photoURL.trim();
          const trimmedSocial = socialLink.trim();

          const updatePayload: Record<string, unknown> = {};
          if (trimmedName) {
            updatePayload.displayName = trimmedName;
          }
          updatePayload["producerProfile.bio"] = trimmedBio;
          if (trimmedPhoto) {
            updatePayload["producerProfile.avatarUrl"] = trimmedPhoto;
          }
          if (trimmedSocial) {
            updatePayload["producerProfile.socialLinks"] = [trimmedSocial];
          }

          await updateDoc(doc(db, "users", auth.currentUser.uid), updatePayload);

          if (trimmedName || trimmedPhoto) {
            await updateProfile(auth.currentUser, {
              ...(trimmedName ? { displayName: trimmedName } : {}),
              ...(trimmedPhoto ? { photoURL: trimmedPhoto } : {}),
            });
          }
        }
      }

      // Force reload auth token, React AuthContext role state, & __session cookie
      await refreshAuth();

      toast.success("Welcome to Tape Garden! Your producer account is ready.");
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      console.error("Onboarding completion error:", error);
      toast.error(error.message || "Failed to complete profile setup");
      setStep("profile");
    }
  };

  if (step === "validating" || authLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center text-muted-foreground py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-leaf-600 animate-spin" />
          <p className="text-muted-foreground animate-pulse">
            {mode === "invite" ? "Checking invite..." : "Verifying your setup link..."}
          </p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center py-24 px-4">
        <Card className="max-w-md w-full p-8 flex flex-col items-center text-center gap-4 border-destructive/30 bg-destructive/10">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-bold text-foreground">{errorTitle}</h2>
          <p className="text-muted-foreground">{errorMsg}</p>
          <div className="flex items-center gap-3 mt-4">
            {mode === "application" && (
              <Button variant="default" onClick={() => router.push("/login")}>
                Go to Sign In
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push("/")}>
              Return Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "auth") {
    return (
      <div className="flex-1 w-full relative text-muted-foreground selection:bg-leaf-500/20 selection:text-leaf-900 flex flex-col justify-center items-center px-4 overflow-x-hidden font-sans antialiased py-12 md:py-24">
        <div className="w-full max-w-md z-10 flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-18 h-12 rounded-lg bg-muted-foreground/10 border border-leaf-500/20 flex items-center justify-center shadow-sm overflow-hidden">
              <Image
                src="/logo.svg"
                alt="Tape Garden Logo"
                width={128}
                height={128}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-muted-foreground">
                {mode === "invite" ? "You've Been Invited!" : "Your Application Was Approved!"}
              </h1>
              <p className="text-md text-zinc-500 mt-1 max-w-lg mx-auto">
                {mode === "invite"
                  ? "Set up your account to accept your producer invite."
                  : "Welcome to Tape Garden. Set a password to activate your producer account."}
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-border/30 bg-card p-8 shadow-sm backdrop-blur-md">
            {mode === "invite" ? (
              <div className="flex flex-col gap-6">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authWorking}
                  className="w-full py-4 px-4 rounded-xl bg-paper-100 dark:bg-graphite-500 border border-border hover:bg-zinc-50 hover:border-zinc-400 text-muted-foreground text-md font-semibold transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-4 py-1">
                  <div className="h-[1px] flex-1 bg-muted-foreground/50" />
                  <span className="text-[12px] text-muted-foreground/80 font-mono uppercase tracking-widest">
                    or email
                  </span>
                  <div className="h-[1px] flex-1 bg-muted-foreground/50" />
                </div>

                <div className="flex rounded-lg bg-input p-1 border border-border">
                  <button
                    onClick={() => setActiveTab("register")}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      activeTab === "register"
                        ? "bg-paper-50 dark:bg-graphite-500 text-leaf-500 shadow-sm border border-border"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-brand-white"
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => setActiveTab("signin")}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      activeTab === "signin"
                        ? "bg-paper-50 dark:bg-graphite-500 text-leaf-500 shadow-sm border border-border"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-brand-white"
                    }`}
                  >
                    Sign In
                  </button>
                </div>

                <form onSubmit={handleInviteEmailAuth} className="flex flex-col gap-4">
                  {activeTab === "register" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground font-medium px-1">
                        Display Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="Your Name"
                          disabled={authWorking}
                          required={activeTab === "register"}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-graphite-500 border border-border focus:border-leaf-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-leaf-500/20"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-medium px-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        disabled={authWorking}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-graphite-500 border border-border focus:border-leaf-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-leaf-500/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-medium px-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="•••••••"
                        disabled={authWorking}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-graphite-500 border border-border focus:border-leaf-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-muted-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-leaf-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authWorking}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-leaf-800 hover:bg-leaf-600 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {authWorking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        loading...
                      </>
                    ) : (
                      <>
                        {activeTab === "register" ? "Continue" : "Sign In"}
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Application Approved Flow: Set Password */
              <form onSubmit={handleApplicationPasswordSetup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-medium px-1">
                    Approved Account Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      disabled
                      readOnly
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50/60 dark:bg-graphite-500/60 border border-border text-sm text-muted-foreground opacity-80 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-medium px-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      disabled={authWorking}
                      minLength={6}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-graphite-500 border border-border focus:border-leaf-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-muted-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-leaf-500/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-medium px-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      disabled={authWorking}
                      minLength={6}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-50 dark:bg-graphite-500 border border-border focus:border-leaf-500/50 focus:bg-white hover:border-zinc-400 transition-all text-sm text-muted-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-leaf-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authWorking}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-leaf-800 hover:bg-leaf-600 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {authWorking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Setting password...
                    </>
                  ) : (
                    <>
                      Set Password & Continue
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "profile" || step === "accepting") {
    const isWorking = step === "accepting";
    const showDisplayNameField = mode === "application" || authMethod !== "email-register";

    return (
      <div className="flex-1 w-full relative text-muted-foreground selection:bg-leaf-500/20 selection:text-leaf-900 flex flex-col justify-center items-center px-4 overflow-x-hidden font-sans antialiased py-12 md:py-24">
        <div className="w-full max-w-lg z-10 flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-muted-foreground tracking-tight">
              Set up your Producer Profile
            </h1>
            <p className="text-md text-zinc-500 mt-1 max-w-[480px] mx-auto">
              You can fill these out now or skip and do it later in your dashboard.
            </p>
          </div>

          <div className="relative rounded-2xl border border-border/30 bg-card p-8 shadow-sm backdrop-blur-md">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAccept(false);
              }}
              className="flex flex-col gap-6"
            >
              {/* Explicit "Logged in as" banner */}
              <div className="bg-paper-50 dark:bg-graphite-500 border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-leaf-500/15 flex items-center justify-center text-leaf-600 dark:text-leaf-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium">
                      Currently signed in as
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {user?.email || email || "Unknown"}
                    </span>
                  </div>
                </div>
                {mode === "invite" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      auth.signOut();
                      setAuthMethod(null);
                      setStep("auth");
                    }}
                    disabled={isWorking}
                    className="shrink-0"
                  >
                    Switch Account
                  </Button>
                )}
              </div>

              {showDisplayNameField && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium px-1">
                    Display Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Metro Boomin"
                    disabled={isWorking}
                    required
                    className="h-11 rounded-xl bg-paper-50 dark:bg-graphite-500 border-border text-muted-foreground"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium px-1">
                  Bio (Optional)
                </label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about your sound..."
                  disabled={isWorking}
                  maxLength={200}
                  rows={3}
                  className="rounded-xl bg-paper-50 dark:bg-graphite-500 border-border text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium px-1">
                  Profile Picture (Optional)
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <Avatar className="h-16 w-16 border border-border">
                    <AvatarImage src={photoURL || ""} alt="Avatar" />
                    <AvatarFallback className="text-base bg-paper-50 dark:bg-graphite-500 text-muted-foreground">
                      {displayName?.substring(0, 2).toUpperCase() || "ME"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isWorking || uploadingAvatar}
                      className="bg-paper-50 dark:bg-graphite-500 border-border text-muted-foreground"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {uploadingAvatar ? "Uploading..." : "Upload Image"}
                    </Button>
                    <p className="text-xs text-zinc-500">
                      Recommended: 500x500px. Max size: 5MB.
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium px-1">
                  Social Link (Optional)
                </label>
                <Input
                  type="url"
                  value={socialLink}
                  onChange={(e) => setSocialLink(e.target.value)}
                  placeholder="Instagram, Twitter, or website"
                  disabled={isWorking}
                  className="h-11 rounded-xl bg-paper-50 dark:bg-graphite-500 border-border text-muted-foreground"
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isWorking || uploadingAvatar}
                  className="w-full py-3 px-4 rounded-xl bg-leaf-800 hover:bg-leaf-600 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isWorking ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : null}
                  {isWorking
                    ? mode === "invite"
                      ? "Accepting Invite..."
                      : "Saving Profile..."
                    : mode === "invite"
                      ? "Accept & Enter Dashboard"
                      : "Save & Enter Dashboard"}
                  {!isWorking && <ArrowRight className="w-4 h-4 text-white" />}
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleAccept(true)}
                  disabled={isWorking}
                  className="w-full text-zinc-500 hover:text-zinc-700 dark:hover:text-brand-white"
                >
                  Skip for now
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

