"use client";

import { useState } from "react";
import { ManagedProducer } from "../page";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProducerAdminActionsProps {
  producer: ManagedProducer;
  onUpdate: () => void;
}

export function ProducerAdminActions({ producer, onUpdate }: ProducerAdminActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [beatSlots, setBeatSlots] = useState(producer.producerProfile?.allocatedBeatSlots?.toString() || "0");
  const [packSlots, setPackSlots] = useState(producer.producerProfile?.allocatedSamplePackSlots?.toString() || "0");

  const handleUpdate = async (updates: { status?: string; allocatedBeatSlots?: number; allocatedSamplePackSlots?: number }) => {
    setIsProcessing(true);
    try {
      const updateProducerAccount = httpsCallable(functions, "updateProducerAccount");
      await updateProducerAccount({
        producerId: producer.uid,
        status: updates.status ?? producer.producerProfile?.status,
        allocatedBeatSlots: updates.allocatedBeatSlots ?? producer.producerProfile?.allocatedBeatSlots,
        allocatedSamplePackSlots: updates.allocatedSamplePackSlots ?? producer.producerProfile?.allocatedSamplePackSlots,
      });

      toast.success("Success", { description: "Producer account updated." });

      setIsEditOpen(false);
      setIsSuspendOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to update producer:", error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Failed to update account." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSlots = () => {
    const bSlots = parseInt(beatSlots, 10);
    const pSlots = parseInt(packSlots, 10);
    if (isNaN(bSlots) || isNaN(pSlots)) return;
    handleUpdate({ allocatedBeatSlots: bSlots, allocatedSamplePackSlots: pSlots });
  };

  const isSuspended = producer.producerProfile?.status === "suspended";

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
        Edit Slots
      </Button>
      <Button
        variant={isSuspended ? "default" : "destructive"}
        size="sm"
        onClick={() => setIsSuspendOpen(true)}
      >
        {isSuspended ? "Unsuspend" : "Suspend"}
      </Button>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Slot Allocations</DialogTitle>
            <DialogDescription>
              Adjust the number of upload slots available to {producer.displayName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="beatSlots">Beat Slots</Label>
              <Input
                id="beatSlots"
                type="number"
                value={beatSlots}
                onChange={(e) => setBeatSlots(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packSlots">Sample Pack Slots</Label>
              <Input
                id="packSlots"
                type="number"
                value={packSlots}
                onChange={(e) => setPackSlots(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlots} disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isSuspended ? "Unsuspend Account" : "Suspend Account"}</DialogTitle>
            <DialogDescription>
              {isSuspended
                ? `Are you sure you want to restore access for ${producer.displayName}? Their previously published items will be visible again.`
                : `Are you sure you want to suspend ${producer.displayName}? This will disable their login and hide all their published items.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={isSuspended ? "default" : "destructive"}
              onClick={() => handleUpdate({ status: isSuspended ? "approved" : "suspended" })}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : isSuspended ? "Yes, Unsuspend" : "Yes, Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
