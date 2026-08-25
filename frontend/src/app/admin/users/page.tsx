"use client";

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { ProducerAdminActions } from "./components/producer-admin-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ProducerStats {
  publishedBeatsCount: number;
  publishedSamplePacksCount: number;
}

export interface ManagedProducer {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  producerProfile: {
    status: "approved" | "suspended" | "pending" | "declined";
    allocatedBeatSlots: number;
    allocatedSamplePackSlots: number;
  };
  stats: ProducerStats;
}

export default function AdminUsersPage() {
  const [producers, setProducers] = useState<ManagedProducer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducers = async () => {
    try {
      const getAdminProducers = httpsCallable(functions, "getAdminProducers");
      const result = await getAdminProducers();
      const data = result.data as { producers: ManagedProducer[] };
      setProducers(data.producers);
    } catch (err) {
      console.error("Error refreshing producers:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadProducers = async () => {
      try {
        const getAdminProducers = httpsCallable(functions, "getAdminProducers");
        const result = await getAdminProducers();
        const data = result.data as { producers: ManagedProducer[] };
        if (isMounted) {
          setProducers(data.producers);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching producers:", err);
        if (isMounted) setError("Failed to load producers.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProducers();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive p-8">{error}</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Producer Accounts</h2>
        <p className="text-muted-foreground mt-1">
          Manage producer accounts, adjust slot allocations, and suspend users if necessary.
        </p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Beats (Used/Alloc)</TableHead>
              <TableHead>Packs (Used/Alloc)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {producers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground p-8">
                  No producers found.
                </TableCell>
              </TableRow>
            ) : (
              producers.map((producer) => (
                <TableRow key={producer.uid}>
                  <TableCell className="font-medium">{producer.displayName}</TableCell>
                  <TableCell>{producer.email}</TableCell>
                  <TableCell>
                    <Badge variant={producer.producerProfile?.status === "approved" ? "default" : "destructive"}>
                      {producer.producerProfile?.status || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {producer.stats?.publishedBeatsCount || 0} / {producer.producerProfile?.allocatedBeatSlots || 0}
                  </TableCell>
                  <TableCell>
                    {producer.stats?.publishedSamplePacksCount || 0} / {producer.producerProfile?.allocatedSamplePackSlots || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProducerAdminActions producer={producer} onUpdate={refreshProducers} />
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
