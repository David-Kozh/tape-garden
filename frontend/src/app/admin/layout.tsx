"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (role !== "admin") {
        router.replace("/");
      }
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground animate-pulse">Loading Admin Portal...</p>
      </div>
    );
  }

  if (!user || role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b px-8 lg:px-24 py-4 flex items-center justify-between">
        <span className="text-muted-foreground text-lg font-medium italic ml-2">Admin</span>
        <nav className="flex space-x-4 text-sm font-medium">
          <Link
            href="/admin/applications"
            className={`pb-1 border-b-2 ${pathname === "/admin/applications" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Applications
          </Link>
          <Link
            href="/admin/users"
            className={`pb-1 border-b-2 ${pathname === "/admin/users" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Producers
          </Link>
          <Link
            href="/admin/sales"
            className={`pb-1 border-b-2 ${pathname === "/admin/sales" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Sales
          </Link>
          <Link
            href="/admin/moderation"
            className={`pb-1 border-b-2 ${pathname === "/admin/moderation" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Moderation
          </Link>
          <Link
            href="/admin/feedback"
            className={`pb-1 border-b-2 ${pathname === "/admin/feedback" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Feedback
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
