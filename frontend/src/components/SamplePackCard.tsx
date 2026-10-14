"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, PackageOpen } from "lucide-react";
import { SamplePackWithProducer } from "@/lib/services/samplePacks";
import { useAudio } from "@/context/AudioContext";
interface SamplePackCardProps {
  pack: SamplePackWithProducer;
}

export function SamplePackCard({ pack }: SamplePackCardProps) {
  const { currentTrack, isPlaying, play, togglePlayPause } = useAudio();

  const isCurrentPack = currentTrack?.id === pack.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentPack) {
      togglePlayPause();
    } else {
      play({
        id: pack.id,
        title: pack.title,
        producerId: pack.producer.uid,
        producer: pack.producer,
        audioPreviewUrl: pack.audioPreviewUrl,
        itemType: "samplePack",
      });
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl group hover:ring-secondary/20 transition-colors duration-300 p-0 gap-0">
      <div className="relative aspect-square rounded-2xl bg-brand-secondary-200/50 flex flex-col items-center justify-center text-brand-secondary-200">
        <Link href={`/sample-packs/${pack.id}`} className="absolute inset-0 z-10">
          <span className="sr-only">View {pack.title}</span>
        </Link>

        <PackageOpen className="w-20 h-20 mb-4" />

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-background/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full w-20 h-20 shadow-lg hover:scale-110 transition-transform pointer-events-auto"
            onClick={handlePlayClick}
          >
            {isCurrentPack && isPlaying ? (
              <PauseCircle className="w-16 h-16 text-secondary-foreground" />
            ) : (
              <PlayCircle className="w-16 h-16 text-secondary-foreground" />
            )}
          </Button>
        </div>

        {/* Tags */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap z-20 pointer-events-none">
          {pack.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} className="bg-black/5 hover:bg-black/10 border border-black/5 backdrop-blur-sm text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <CardContent className="p-4 relative z-20">
        <Link href={`/sample-packs/${pack.id}`} className="font-bold text-lg truncate text-foreground hover:underline block">
          {pack.title}
        </Link>
        <Link href={`/producers/${pack.producer.uid}`} className="text-sm text-muted-foreground hover:text-secondary transition-colors inline-block mt-0.5">
          {pack.producer.displayName}
        </Link>
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <span className="truncate max-w-[140px]">
            {pack.description}
          </span>
          <span className="font-medium text-foreground pl-2">
            ${pack.price}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
