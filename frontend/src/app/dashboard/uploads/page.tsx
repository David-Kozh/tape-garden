"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Beat, SamplePack } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Music, Archive } from "lucide-react";

export default function UploadsDashboard() {
  const { user } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUploads() {
      if (!user) return;
      try {
        const beatsQuery = query(collection(db, "beats"), where("producerId", "==", user.uid));
        const beatsSnapshot = await getDocs(beatsQuery);
        setBeats(beatsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Beat));

        const packsQuery = query(collection(db, "samplePacks"), where("producerId", "==", user.uid));
        const packsSnapshot = await getDocs(packsQuery);
        setPacks(packsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as SamplePack));
      } catch (error) {
        console.error("Error fetching uploads:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUploads();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Uploads</h1>
          <p className="text-muted-foreground mt-1">Manage your beats and sample packs.</p>
        </div>
        <Link href="/dashboard/uploads/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Upload className="w-4 h-4" />
            New Upload
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Beats
              </CardTitle>
              <CardDescription>Manage your uploaded beats.</CardDescription>
            </CardHeader>
            <CardContent>
              {beats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No beats uploaded yet.</p>
              ) : (
                <ul className="space-y-4">
                  {beats.map(beat => (
                    <li key={beat.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{beat.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{beat.status} • {beat.bpm} BPM</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-primary" />
                Sample Packs
              </CardTitle>
              <CardDescription>Manage your sample packs.</CardDescription>
            </CardHeader>
            <CardContent>
              {packs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sample packs uploaded yet.</p>
              ) : (
                <ul className="space-y-4">
                  {packs.map(pack => (
                    <li key={pack.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{pack.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{pack.status} • ${pack.price}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
