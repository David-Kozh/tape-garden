"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase Auth state shifts
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Force refresh the token to get the latest custom claims/roles
          const tokenResult = await firebaseUser.getIdTokenResult(true);

          // Set the session cookie for Next.js middleware security
          const isSecure = window.location.protocol === "https:";
          document.cookie = `__session=${tokenResult.token}; path=/; max-age=3600; SameSite=Lax${isSecure ? '; Secure' : ''}`;

          // Custom claims can be mapped directly to user role.
          // Fallback checking for explicit flags like admin/producer or default to buyer.
          const userRole =
            (tokenResult.claims.role as UserRole) ||
            (tokenResult.claims.admin ? "admin" : tokenResult.claims.producer ? "producer" : "buyer");

          setRole(userRole);
        } catch (error) {
          console.error("Failed to load user custom claims:", error);
          setRole("buyer"); // Default to buyer access on error
        }
      } else {
        setUser(null);
        setRole(null);
        // Clear session cookie on logout
        document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to consume the AuthContext safely
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
