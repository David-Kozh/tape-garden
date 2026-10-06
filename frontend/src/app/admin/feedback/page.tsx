"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Feedback, FeedbackCategory, FeedbackStatus } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterCategory, setFilterCategory] = useState<FeedbackCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "all">("all");

  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Feedback[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Feedback);
      });
      setFeedbackList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (feedbackId: string, newStatus: FeedbackStatus) => {
    try {
      await updateDoc(doc(db, "feedback", feedbackId), { status: newStatus });
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredFeedback = feedbackList.filter(f => {
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case "new": return "bg-blue-500 hover:bg-blue-600";
      case "reviewed": return "bg-yellow-500 hover:bg-yellow-600";
      case "resolved": return "bg-green-500 hover:bg-green-600";
      default: return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback Management</h1>
        <p className="text-muted-foreground mt-2">
          Review and categorize feedback submitted by beta producers.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FeedbackStatus | "all")}
          className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as FeedbackCategory | "all")}
          className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Categories</option>
          <option value="general">General</option>
          <option value="bug">Bug Report</option>
          <option value="feature_request">Feature Request</option>
          <option value="ux_issue">UX Issue</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      ) : (
        <div className="border border-border rounded-md">
          {filteredFeedback.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No feedback found matching the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 bg-card">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize border-border text-foreground">
                        {item.category.replace("_", " ")}
                      </Badge>
                      <Badge className={`${getStatusColor(item.status)} text-white`}>
                        {item.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto sm:ml-2">
                        {item.createdAt 
                          ? new Date(
                              typeof item.createdAt === "object" && "toDate" in item.createdAt 
                                ? (item.createdAt as { toDate: () => Date }).toDate() 
                                : (item.createdAt as string | number)
                            ).toLocaleDateString() 
                          : "Just now"}
                      </span>
                    </div>
                    <p className="text-sm text-card-foreground leading-relaxed whitespace-pre-wrap">{item.message}</p>
                    <p className="text-xs text-muted-foreground">Producer ID: {item.producerId}</p>
                  </div>
                  <div className="flex sm:flex-col sm:items-end gap-2 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="outline" size="sm" />
                        }
                      >
                        Update Status
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id!, "new")}>
                          Mark as New
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id!, "reviewed")}>
                          Mark as Reviewed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id!, "resolved")}>
                          Mark as Resolved
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
