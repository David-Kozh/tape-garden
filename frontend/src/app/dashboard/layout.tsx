"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (role !== "producer" && role !== "admin") {
        router.replace("/");
      }
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (role !== "producer" && role !== "admin")) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header (placeholder for now if we want mobile sidebar toggle) */}
        <div className="md:hidden border-b border-border p-4 flex items-center justify-between bg-sidebar">
          <span className="font-bold text-lg">Tape Garden Studio</span>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
