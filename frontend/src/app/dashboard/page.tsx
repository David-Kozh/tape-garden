"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getCountFromServer } from "firebase/firestore";
import type { User } from "@/types";
import { Clock, CheckCircle2, AlertCircle, CalendarDays, LineChart } from "lucide-react";

export default function DashboardOverview() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<User["producerProfile"] | null>(null);
  const [memberSince, setMemberSince] = useState<Date | null>(null);
  const [beatsUsed, setBeatsUsed] = useState<number>(0);
  const [packsUsed, setPacksUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      
      try {
        // Fetch User profile to get producerProfile and createdAt
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setProfile(userData.producerProfile || null);
          
          if (userData.createdAt) {
            setMemberSince(
              userData.createdAt instanceof Date 
                ? userData.createdAt 
                : new Date(userData.createdAt as string)
            );
          }
        }

        // Fetch Beat slots usage
        const beatsQuery = query(
          collection(db, "beats"),
          where("producerId", "==", user.uid),
          where("status", "==", "published")
        );
        const beatsSnapshot = await getCountFromServer(beatsQuery);
        setBeatsUsed(beatsSnapshot.data().count);

        // Fetch Sample Pack slots usage
        const packsQuery = query(
          collection(db, "samplePacks"),
          where("producerId", "==", user.uid),
          where("status", "==", "published")
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
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const beatLimit = profile?.allocatedBeatSlots || 0;
  const packLimit = profile?.allocatedSamplePackSlots || 0;
  const beatProgress = beatLimit > 0 ? (beatsUsed / beatLimit) * 100 : 0;
  const packProgress = packLimit > 0 ? (packsUsed / packLimit) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Studio Overview</h1>
        <p className="text-muted-foreground mt-1">Manage your presence and check your slot usage.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Status Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="bg-primary/10 p-2 rounded-md text-primary">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            Account Status
          </h3>
          
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {profile?.status === "approved" ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </>
                  ) : profile?.status === "suspended" ? (
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                  ) : (
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                  )}
                </span>
                <span className="font-medium capitalize text-lg">
                  {profile?.status || "Unknown"}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" /> Member Since
              </p>
              <p className="font-medium">
                {memberSince ? memberSince.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric'
                }) : "Unknown"}
              </p>
            </div>
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

      {/* Sales Chart Placeholder */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm opacity-50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <p className="bg-card border border-border px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
            <LineChart className="w-4 h-4 text-muted-foreground" />
            Sales data coming soon
          </p>
        </div>
        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 relative z-0">
          <span className="bg-accent/10 p-2 rounded-md text-accent">
            <LineChart className="w-5 h-5" />
          </span>
          Basic Sales Stats
        </h3>
        <div className="h-48 border-b border-l border-border/50 relative z-0 flex items-end">
          <div className="w-full h-1/2 border-t border-dashed border-border/30 mb-auto mt-auto absolute top-1/2 w-full"></div>
          {/* Faux bars */}
          <div className="w-full flex justify-around items-end h-full pt-4 pb-0 px-2 gap-2">
            {[30, 40, 25, 60, 45, 80, 50].map((h, i) => (
              <div key={i} className="w-full bg-muted rounded-t-sm" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
