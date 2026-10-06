"use client";

import { useState, useEffect } from "react";
import { db, functions } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, updateDoc, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Plus, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type FirestoreTimestamp = { seconds: number; nanoseconds: number } | { toDate: () => Date };

interface Invite {
  id: string;
  inviteeName: string;
  expirationTimestamp: FirestoreTimestamp;
  status: "pending" | "used" | "expired";
  createdAt: FirestoreTimestamp;
}

export function AdminInvitesManagement() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteeName, setInviteeName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedLink, setLastGeneratedLink] = useState<string | null>(null);

  const fetchInvites = async (isInitial = false) => {
    try {
      const invitesRef = collection(db, "invites");
      const q = query(invitesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetchedInvites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invite[];
      setInvites(fetchedInvites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast.error("Failed to fetch invites");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInvites = async () => {
      try {
        const invitesRef = collection(db, "invites");
        const q = query(invitesRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const fetchedInvites = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Invite[];
        if (isMounted) setInvites(fetchedInvites);
      } catch (error) {
        console.error("Error fetching invites:", error);
        if (isMounted) toast.error("Failed to fetch invites");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInvites();
    return () => { isMounted = false; };
  }, []);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteeName.trim()) return;

    setIsGenerating(true);
    setLastGeneratedLink(null);

    try {
      const generateInviteFn = httpsCallable<{ inviteeName: string }, { token: string }>(functions, "generateInvite");
      const result = await generateInviteFn({ inviteeName: inviteeName.trim() });
      const token = result.data.token;
      
      const link = `${window.location.origin}/invite/${token}`;
      setLastGeneratedLink(link);
      setInviteeName("");
      toast.success("Invite generated successfully!");
      fetchInvites();
    } catch (error) {
      console.error("Error generating invite:", error);
      toast.error("Failed to generate invite");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard");
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invite?")) return;
    
    try {
      await updateDoc(doc(db, "invites", inviteId), { status: "expired" });
      toast.success("Invite revoked");
      fetchInvites();
    } catch (error) {
      console.error("Error revoking invite:", error);
      toast.error("Failed to revoke invite");
    }
  };

  const formatExpiration = (timestamp: FirestoreTimestamp | null | undefined) => {
    if (!timestamp) return "Unknown";
    const date = 'toDate' in timestamp ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  return (
    <div className="space-y-6 mt-16 pt-8 border-t">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Curated Invites</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate direct invite links for producers to bypass the standard application pipeline.
        </p>
      </div>

      <div className="bg-secondary/20 p-6 rounded-lg border space-y-4">
        <h4 className="font-medium">Generate New Invite</h4>
        <form onSubmit={handleGenerateInvite} className="flex items-end gap-4 max-w-xl">
          <div className="space-y-2 flex-1">
            <Input 
              placeholder="Invitee Name (e.g., J Dilla)" 
              value={inviteeName}
              onChange={(e) => setInviteeName(e.target.value)}
              disabled={isGenerating}
              required
            />
          </div>
          <Button type="submit" disabled={isGenerating || !inviteeName.trim()}>
            {isGenerating ? "Generating..." : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Link
              </>
            )}
          </Button>
        </form>

        {lastGeneratedLink && (
          <div className="mt-4 p-4 border border-green-500/20 bg-green-500/10 rounded-md flex items-center justify-between">
            <div className="truncate flex-1 mr-4 text-sm font-mono text-green-700 dark:text-green-400">
              {lastGeneratedLink}
            </div>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(lastGeneratedLink)} className="shrink-0 border-green-500/20 hover:bg-green-500/20">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invitee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Token</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-4">
                  <Skeleton className="h-8 w-full max-w-md mx-auto" />
                </TableCell>
              </TableRow>
            ) : invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground p-8">
                  No invites created yet.
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.inviteeName}</TableCell>
                  <TableCell>
                    <Badge variant={invite.status === "pending" ? "default" : invite.status === "used" ? "secondary" : "destructive"}>
                      {invite.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatExpiration(invite.expirationTimestamp)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {invite.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Copy Link"
                        onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.id}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {invite.status === "pending" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10"
                          title="Revoke Invite"
                          onClick={() => handleRevoke(invite.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
