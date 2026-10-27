"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAudio } from "@/context/AudioContext";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { currentTrack } = useAudio();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex flex-1 w-full bg-background">
      <Sidebar />
      
      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col min-w-0 md:pb-0 ${
          currentTrack ? "pb-44" : "pb-20"
        }`}
      >
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
