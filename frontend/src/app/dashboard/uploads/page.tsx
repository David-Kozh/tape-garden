"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db, functions } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { Beat, SamplePack } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, Music, Archive, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function UploadsDashboard() {
  const { user } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUploads() {
      if (!user) return;
      try {
        const beatsQuery = query(collection(db, "beats"), where("producerId", "==", user.uid), where("status", "in", ["draft", "published"]));
        const beatsSnapshot = await getDocs(beatsQuery);
        setBeats(beatsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Beat));

        const packsQuery = query(collection(db, "samplePacks"), where("producerId", "==", user.uid), where("status", "in", ["draft", "published"]));
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

  const toggleStatus = async (collectionName: "beats" | "samplePacks", id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      await updateDoc(doc(db, collectionName, id), { status: newStatus });
      
      if (collectionName === "beats") {
        setBeats(beats.map(b => b.id === id ? { ...b, status: newStatus } : b));
      } else {
        setPacks(packs.map(p => p.id === id ? { ...p, status: newStatus } : p));
      }
      toast.success(`Item successfully ${newStatus === "published" ? "published" : "changed to draft"}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteBeat = async (beatId: string) => {
    try {
      const deleteBeatFn = httpsCallable(functions, "deleteBeat");
      await deleteBeatFn({ beatId });
      setBeats(beats.filter(b => b.id !== beatId));
      toast.success("Beat successfully deleted.");
    } catch (error) {
      console.error("Error deleting beat:", error);
      toast.error("Failed to delete beat.");
    }
  };

  const handleDeleteSamplePack = async (packId: string) => {
    try {
      const deleteSamplePackFn = httpsCallable(functions, "deleteSamplePack");
      await deleteSamplePackFn({ packId });
      setPacks(packs.filter(p => p.id !== packId));
      toast.success("Sample pack successfully deleted.");
    } catch (error) {
      console.error("Error deleting sample pack:", error);
      toast.error("Failed to delete sample pack.");
    }
  };

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
                      <div className="flex gap-2">
                        <Link href={`/dashboard/uploads/${beat.id}/edit`}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => toggleStatus("beats", beat.id, beat.status)}
                        >
                          {beat.status === "published" ? (
                            <><EyeOff className="w-4 h-4 mr-2" /> Hide</>
                          ) : (
                            <><Eye className="w-4 h-4 mr-2" /> Publish</>
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          } />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. If this beat has not been purchased, it will be permanently deleted and your upload slot will be freed. If it has been purchased, it will be hidden from the public gallery but remain accessible to buyers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBeat(beat.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                      <div className="flex gap-2">
                        <Link href={`/dashboard/uploads/sample-packs/${pack.id}/edit`}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => toggleStatus("samplePacks", pack.id, pack.status)}
                        >
                          {pack.status === "published" ? (
                            <><EyeOff className="w-4 h-4 mr-2" /> Hide</>
                          ) : (
                            <><Eye className="w-4 h-4 mr-2" /> Publish</>
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          } />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. If this sample pack has not been purchased, it will be permanently deleted and your upload slot will be freed. If it has been purchased, it will be hidden from the public gallery but remain accessible to buyers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteSamplePack(pack.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
