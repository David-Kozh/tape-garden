"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db, functions } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getCountFromServer } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { User } from "@/types";
import { Clock, CheckCircle2, AlertCircle, UserCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BasicSalesStats } from "@/components/dashboard/BasicSalesStats";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FeedbackModal } from "@/components/dashboard/FeedbackModal";
export default function DashboardOverview() {
  const { user, role } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<User["producerProfile"] | null>(null);
  const [beatsUsed, setBeatsUsed] = useState<number>(0);
  const [packsUsed, setPacksUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    if (role && role !== "producer" && role !== "admin") {
      router.replace("/dashboard/collection");
    }
  }, [role, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || (role && role !== "producer" && role !== "admin")) return;
      
      try {
        // Fetch User profile to get producerProfile and createdAt
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setProfile(userData.producerProfile || null);
          
          if (userData.stripeAccountId) {
            setStripeAccountId(userData.stripeAccountId);
          }
          if (userData.producerProfile?.stripeStatus) {
            const currentStatus = userData.producerProfile.stripeStatus;
            setStripeStatus(currentStatus);
            
            // Auto-verify if stuck in pending
            if (currentStatus === "pending") {
              try {
                const verifyStripeAccount = httpsCallable(functions, "verifyStripeAccount");
                const res = await verifyStripeAccount();
                const verifyData = res.data as { status: string };
                if (verifyData.status === "active") {
                  setStripeStatus("active");
                }
              } catch (e) {
                console.error("Error verifying Stripe account status:", e);
              }
            }
          }
        }

        // Fetch Beat slots usage
        const beatsQuery = query(
          collection(db, "beats"),
          where("producerId", "==", user.uid),
          where("status", "in", ["published", "draft"])
        );
        const beatsSnapshot = await getCountFromServer(beatsQuery);
        setBeatsUsed(beatsSnapshot.data().count);

        // Fetch Sample Pack slots usage
        const packsQuery = query(
          collection(db, "samplePacks"),
          where("producerId", "==", user.uid),
          where("status", "in", ["published", "draft"])
        );
        const packsSnapshot = await getCountFromServer(packsQuery);
        setPacksUsed(packsSnapshot.data().count);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, role]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const createStripeConnectAccount = httpsCallable(functions, "createStripeConnectAccount");
      const result = await createStripeConnectAccount({ origin: window.location.origin });
      const { url } = result.data as { url: string };
      window.location.href = url;
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Error", { description: err.message || "Failed to connect to Stripe." });
      setStripeLoading(false);
    }
  };

  const handleViewStripeDashboard = async () => {
    setStripeLoading(true);
    try {
      const getStripeDashboardLink = httpsCallable(functions, "getStripeDashboardLink");
      const result = await getStripeDashboardLink({ origin: window.location.origin });
      const { url } = result.data as { url: string };
      window.open(url, "_blank");
      setStripeLoading(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Error", { description: err.message || "Failed to load Stripe dashboard." });
      setStripeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role && role !== "producer" && role !== "admin") {
    return null; // Will redirect via useEffect
  }

  const beatLimit = profile?.allocatedBeatSlots || 0;
  const packLimit = profile?.allocatedSamplePackSlots || 0;
  const beatProgress = beatLimit > 0 ? (beatsUsed / beatLimit) * 100 : 0;
  const packProgress = packLimit > 0 ? (packsUsed / packLimit) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Studio Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your presence and check your slot usage.</p>
        </div>
        {user && (
          <div className="flex flex-col sm:flex-row gap-2">
            <FeedbackModal />
            <Link href={`/producers/${user.uid}`}>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <UserCircle className="w-4 h-4" />
                View Public Profile
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stripe Payouts Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="bg-primary/10 p-2 rounded-md text-primary">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            Stripe Payouts
          </h3>
          
          <div className="flex-1 flex flex-col justify-center">
            {!stripeAccountId ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">You are not connected to Stripe. Connect your account to receive payouts for beat and sample pack sales.</p>
                <Button onClick={handleConnectStripe} disabled={stripeLoading} className="w-full">
                  {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect Stripe
                </Button>
              </div>
            ) : stripeStatus === "pending" ? (
              <div className="space-y-4">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Your Stripe account is pending verification. Please complete onboarding.</p>
                <Button onClick={handleConnectStripe} disabled={stripeLoading} variant="outline" className="w-full">
                  {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Resume Onboarding
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Your Stripe account is active and ready to receive payouts.</p>
                <Button onClick={handleViewStripeDashboard} disabled={stripeLoading} variant="outline" className="w-full">
                  {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  View Stripe Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Slot Usage Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <span className="bg-secondary/10 p-2 rounded-md text-secondary">
              <Clock className="w-5 h-5" />
            </span>
            Upload Slot Usage
          </h3>
          
          <div className="space-y-8">
            {/* Beat Slots */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h4 className="font-medium text-foreground">Beat Slots</h4>
                  <p className="text-sm text-muted-foreground">Monthly cumulative limit</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">{beatsUsed}</span>
                  <span className="text-muted-foreground"> / {beatLimit}</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3 mb-1 overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${beatProgress >= 100 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min(beatProgress, 100)}%` }}
                ></div>
              </div>
              {beatProgress >= 100 && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3 h-3" />
                  You have reached your beat upload limit.
                </p>
              )}
            </div>

            {/* Sample Pack Slots */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h4 className="font-medium text-foreground">Sample Pack Slots</h4>
                  <p className="text-sm text-muted-foreground">Monthly cumulative limit</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">{packsUsed}</span>
                  <span className="text-muted-foreground"> / {packLimit}</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3 mb-1 overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${packProgress >= 100 ? 'bg-destructive' : 'bg-secondary'}`}
                  style={{ width: `${Math.min(packProgress, 100)}%` }}
                ></div>
              </div>
              {packProgress >= 100 && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3 h-3" />
                  You have reached your sample pack upload limit.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <BasicSalesStats />

    </div>
  );
}
