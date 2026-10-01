"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { FlaggedBeat } from "@/types";
import { resolveFlaggedBeat } from "@/lib/services/adminClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminModerationDashboard() {
  const [flaggedBeats, setFlaggedBeats] = useState<FlaggedBeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFlaggedBeats() {
      try {
        setLoading(true);
        const q = query(
          collection(db, "flaggedBeats"),
          where("status", "==", "pending"),
          orderBy("flaggedAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data() as FlaggedBeat);
        setFlaggedBeats(data);
      } catch (error) {
        console.error("Error fetching flagged beats:", error);
        toast.error("Error fetching moderation queue", {
          description: "Failed to load flagged beats.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchFlaggedBeats();
  }, []);

  async function handleResolve(beatId: string, action: 'dismiss' | 'remove') {
    try {
      setProcessingId(beatId);
      await resolveFlaggedBeat(beatId, action);
      
      setFlaggedBeats(prev => prev.filter(fb => fb.beatId !== beatId));
      
      toast.success("Success", {
        description: action === 'dismiss' ? "Flag dismissed successfully." : "Beat removed successfully.",
      });
    } catch (error) {
      console.error("Error resolving flag:", error);
      toast.error("Action failed", {
        description: "Failed to resolve the flagged beat.",
      });
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-destructive" />
          Moderation Queue
        </h1>
        <p className="text-muted-foreground mt-1">Review and manage flagged beats on the platform.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-lg">Pending Review</h2>
        </div>
        <div className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Flagged</TableHead>
                <TableHead>Beat</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flaggedBeats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2 opacity-80" />
                      <p>The moderation queue is clear.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                flaggedBeats.map((fb) => {
                  const date = fb.flaggedAt instanceof Date 
                    ? fb.flaggedAt 
                    : typeof fb.flaggedAt === 'string'
                      ? new Date(fb.flaggedAt)
                      : (fb.flaggedAt as Timestamp).toDate();
                  
                  const isProcessing = processingId === fb.beatId;

                  return (
                    <TableRow key={fb.beatId}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{fb.title}</TableCell>
                      <TableCell>{fb.producerName}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground" title={fb.reason}>
                        {fb.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleResolve(fb.beatId, 'dismiss')}
                          >
                            Dismiss
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleResolve(fb.beatId, 'remove')}
                            className="gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove Beat
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
