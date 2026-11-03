"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, MoreVertical, Flag, Star, Music, PackageOpen } from "lucide-react";
import { BeatWithProducer } from "@/lib/services/gallery";
import { SamplePackWithProducer } from "@/lib/services/samplePacks";
import { useAudio } from "@/context/AudioContext";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { flagItem, toggleCurated } from "@/lib/services/adminClient";
import { toast } from "sonner";

export type CatalogItem =
  | ({ itemType: "beat" } & BeatWithProducer)
  | ({ itemType: "samplePack" } & SamplePackWithProducer);

interface ItemCardProps {
  item: CatalogItem;
  showProducer?: boolean;
}

export function ItemCard({ item, showProducer = true }: ItemCardProps) {
  const { currentTrack, isPlaying, play, togglePlayPause } = useAudio();
  const { role } = useAuth();

  const isCurrentItem = currentTrack?.id === item.id;
  const [isCurated, setIsCurated] = useState(item.curated ?? false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const itemHref = item.itemType === "beat" ? `/beats/${item.id}` : `/sample-packs/${item.id}`;
  const itemLabel = item.itemType === "beat" ? "Beat" : "Sample Pack";

  const handleToggleCurated = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleCurated(item.id, item.itemType, !isCurated);
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
      await flagItem(item.id, item.itemType, flagReason);
      toast.success(`${itemLabel} flagged for moderation`);
      setIsFlagDialogOpen(false);
      setFlagReason("");
    } catch {
      toast.error(`Failed to flag ${itemLabel.toLowerCase()}`);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentItem) {
      togglePlayPause();
    } else {
      play({
        id: item.id,
        title: item.title,
        producerId: item.producer.uid,
        producer: item.producer,
        audioPreviewUrl: item.audioPreviewUrl,
        coverArtUrl: item.coverArtUrl,
        itemType: item.itemType,
      });
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl group hover:ring-primary/20 transition-colors duration-300 p-0 gap-0">
      <div className="relative aspect-square bg-background overflow-hidden rounded-2xl">
        <Link href={itemHref} className="absolute inset-0 z-10">
          <span className="sr-only">View {item.title}</span>
        </Link>
        {item.coverArtUrl ? (
          <Image
            src={item.coverArtUrl}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-lilac-200/50 dark:bg-lilac-500/30 text-lilac-500">
            {item.itemType === "beat" ? (
              <Music className="w-20 h-20 group-hover:opacity-0 transition-opacity duration-300" />
            ) : (
              <PackageOpen className="w-20 h-20 group-hover:opacity-0 transition-opacity duration-300" />
            )}
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-background/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full w-16 h-16 shadow-lg hover:scale-110 transition-transform pointer-events-auto"
            onClick={handlePlayClick}
          >
            {isCurrentItem && isPlaying ? (
              <PauseCircle className="size-12 stroke-[1] text-secondary-foreground" />
            ) : (
              <PlayCircle className="size-12 stroke-[1] text-secondary-foreground" />
            )}
          </Button>
        </div>

        {/* Tags -- DEPRECATED as of 11/2/2026
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap z-20 pointer-events-none">
          {item.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} className="bg-black/10 border border-black/5 backdrop-blur-sm text-xs text-muted/80 dark:text-muted-foreground/80">
              {tag}
            </Badge>
          ))}
        </div>
        */}

        {/* Admin Menu */}
        {role === "admin" && (
          <div className="absolute top-2 right-2 z-30">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="secondary" size="icon" className="h-6 w-6 rounded-full bg-graphite-800/60 dark:bg-background/60 backdrop-blur-sm hover:bg-graphite-800/80 dark:hover:bg-background/80" />}>
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
        <Link href={itemHref} className="font-bold text-lg truncate text-foreground hover:underline block">
          {item.title}
        </Link>
        {showProducer && (
          <Link href={`/producers/${item.producer.uid}`} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block mt-0.5">
            {item.producer.displayName}
          </Link>
        )}
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          {item.itemType === "beat" ? (
            <>
              <span className="flex gap-2">
                {item.bpm && <span>{item.bpm} BPM</span>}
                {item.key && <span>{item.key}</span>}
              </span>
              <span className="font-medium text-foreground">
                ${item.licenses?.[0]?.price ?? "29.99"}
              </span>
            </>
          ) : (
            <>
              <span className="truncate max-w-[140px]">
                {item.description}
              </span>
              <span className="font-medium text-foreground pl-2">
                ${item.price}
              </span>
            </>
          )}
        </div>
      </CardContent>

      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag {itemLabel} for Moderation</DialogTitle>
            <DialogDescription>
              Are you sure you want to flag &quot;{item.title}&quot;?
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
