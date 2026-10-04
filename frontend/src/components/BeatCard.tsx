"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, MoreVertical, Flag, Star } from "lucide-react";
import { BeatWithProducer } from "@/lib/services/gallery";
import { useAudio } from "@/context/AudioContext";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { flagBeat, toggleCurated } from "@/lib/services/adminClient";
import { toast } from "sonner";

interface BeatCardProps {
  beat: BeatWithProducer;
}

export function BeatCard({ beat }: BeatCardProps) {
  const { currentTrack, isPlaying, play, togglePlayPause } = useAudio();
  const { role } = useAuth();

  const isCurrentBeat = currentTrack?.id === beat.id;
  const [isCurated, setIsCurated] = useState(beat.curated ?? false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const handleToggleCurated = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleCurated(beat.id, !isCurated);
      setIsCurated(!isCurated);
      toast.success(isCurated ? "Removed from curated" : "Added to curated");
    } catch {
      toast.error("Failed to update curated status");
    }
  };

  const handleFlagSubmit = async () => {
    if (!flagReason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    try {
      await flagBeat(beat.id, flagReason);
      toast.success("Beat flagged for moderation");
      setIsFlagDialogOpen(false);
      setFlagReason("");
    } catch {
      toast.error("Failed to flag beat");
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentBeat) {
      togglePlayPause();
    } else {
      play({ ...beat, itemType: "beat" });
    }
  };

  return (
    <Card className="overflow-hidden group hover:border-primary transition-colors duration-300">
      <div className="relative aspect-square bg-muted">
        <Link href={`/beats/${beat.id}`} className="absolute inset-0 z-10">
          <span className="sr-only">View {beat.title}</span>
        </Link>
        {beat.coverArtUrl ? (
          <Image
            src={beat.coverArtUrl}
            alt={beat.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-secondary/20 text-muted-foreground">
            No Cover
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full w-12 h-12 shadow-lg hover:scale-110 transition-transform pointer-events-auto"
            onClick={handlePlayClick}
          >
            {isCurrentBeat && isPlaying ? (
              <PauseCircle className="w-6 h-6 text-secondary-foreground" />
            ) : (
              <PlayCircle className="w-6 h-6 text-secondary-foreground" />
            )}
          </Button>
        </div>

        {/* Tags */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap z-20 pointer-events-none">
          {beat.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Admin Menu */}
        {role === "admin" && (
          <div className="absolute top-2 right-2 z-30 bg-black">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleToggleCurated}>
                  <Star className="mr-2 h-4 w-4" />
                  {isCurated ? "Remove from Curated" : "Add to Curated"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsFlagDialogOpen(true)} className="text-destructive focus:text-destructive">
                  <Flag className="mr-2 h-4 w-4" />
                  Flag for Moderation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <CardContent className="p-4 relative z-20">
        <Link href={`/beats/${beat.id}`} className="font-bold text-lg truncate text-foreground hover:underline block">
          {beat.title}
        </Link>
        <Link href={`/producers/${beat.producer.uid}`} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block mt-0.5">
          {beat.producer.displayName}
        </Link>
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <span className="flex gap-2">
            {beat.bpm && <span>{beat.bpm} BPM</span>}
            {beat.key && <span>{beat.key}</span>}
          </span>
          <span className="font-medium text-foreground">
            ${beat.licenses?.[0]?.price ?? "29.99"}
          </span>
        </div>
      </CardContent>

      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Beat for Moderation</DialogTitle>
            <DialogDescription>
              Are you sure you want to flag &quot;{beat.title}&quot;?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for flagging</Label>
              <Textarea
                id="reason"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Copyright infringement, inappropriate content..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleFlagSubmit}>Submit Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
