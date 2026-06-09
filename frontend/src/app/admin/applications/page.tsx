"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Application {
  id: string;
  email: string;
  displayName: string;
  portfolioUrl: string;
  note: string;
  status: "pending" | "approved" | "declined";
  createdAt: Timestamp;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog State
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [dialogAction, setDialogAction] = useState<"approve" | "decline" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps: Application[] = [];
      snapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() } as Application);
      });
      setApplications(apps);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching applications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAction = async () => {
    if (!selectedApp || !dialogAction) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      const reviewFn = httpsCallable(functions, "reviewApplication");
      await reviewFn({ applicationId: selectedApp.id, action: dialogAction });
      
      // Close dialog on success
      setSelectedApp(null);
      setDialogAction(null);
    } catch (error) {
      console.error("Error reviewing application:", error);
      setActionError(error instanceof Error ? error.message : "Failed to review application.");
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingApps = applications.filter(a => a.status === "pending");
  const approvedApps = applications.filter(a => a.status === "approved");
  const declinedApps = applications.filter(a => a.status === "declined");

  const openDialog = (app: Application, action: "approve" | "decline") => {
    setSelectedApp(app);
    setDialogAction(action);
    setActionError(null);
  };

  const renderTable = (apps: Application[], showActions: boolean = false) => {
    if (apps.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground border rounded-md bg-muted/20">
          No applications found in this queue.
        </div>
      );
    }

    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Portfolio</TableHead>
              <TableHead>Note</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {app.createdAt ? app.createdAt.toDate().toLocaleDateString() : "N/A"}
                </TableCell>
                <TableCell className="font-medium">{app.displayName}</TableCell>
                <TableCell>{app.email}</TableCell>
                <TableCell>
                  <a 
                    href={app.portfolioUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate max-w-[150px] inline-block"
                    title={app.portfolioUrl}
                  >
                    View Portfolio
                  </a>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate text-sm text-muted-foreground" title={app.note}>
                    {app.note || "—"}
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDialog(app, "decline")}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Decline
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => openDialog(app, "approve")}
                    >
                      Approve
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading applications...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Review Queue</h2>
        <p className="text-muted-foreground mt-1">
          Review, approve, or politely decline incoming producer applications.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({pendingApps.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-0">
          {renderTable(pendingApps, true)}
        </TabsContent>
        <TabsContent value="approved" className="mt-0">
          {renderTable(approvedApps, false)}
        </TabsContent>
        <TabsContent value="declined" className="mt-0">
          {renderTable(declinedApps, false)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve" ? "Approve Application" : "Decline Application"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "approve" 
                ? `Are you sure you want to approve ${selectedApp?.displayName}? This will provision their producer account and grant them access to the dashboard.`
                : `Are you sure you want to decline ${selectedApp?.displayName}? This will send them a polite rejection email.`}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
              {actionError}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedApp(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              variant={dialogAction === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : dialogAction === "approve" ? "Yes, Approve" : "Yes, Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
