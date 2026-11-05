"use client";

import { Volume2, PlayCircle, PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useAudio } from "@/context/AudioContext";
import { CatalogItem } from "@/components/ItemCard";

interface FeaturedCardProps {
  item: CatalogItem;
  showProducer?: boolean;
  curated?: boolean;
}

export function FeaturedCard({ item, showProducer = true, curated = false }: FeaturedCardProps) {
  const { currentTrack, isPlaying, play, togglePlayPause } = useAudio();

  const isCurrentItem = currentTrack?.id === item.id;
  const itemHref = item.itemType === "beat" ? `/beats/${item.id}` : `/sample-packs/${item.id}`;
  const itemLabel = item.itemType === "beat" ? "Beat" : "Sample Pack";
  const description =
    item.itemType === "samplePack" && item.description
      ? item.description
      : showProducer
        ? `Produced by ${item.producer.displayName}.`
        : "";
  const price = item.itemType === "beat" ? (item.licenses?.[0]?.price ?? "29.99") : item.price;

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
    <Card className="col-span-2 group relative rounded-2xl border-zinc-200/80 bg-white/40 dark:bg-graphite-600 backdrop-blur-sm hover:border-emerald-500/30 hover:bg-white/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden p-0">
      {/* Background Hover Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-leaf-500/0 via-leaf-500/0 to-leaf-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />

      <CardContent className="p-0 flex flex-row items-stretch relative z-10 h-full">
        {/* Left Side: Cover Art & Play Button */}
        <div className="relative aspect-square shrink-0 bg-zinc-200/50 dark:bg-zinc-100/20 overflow-hidden border-r border-zinc-200/80 dark:border-graphite-200 rounded-2xl h-full">
          {item.coverArtUrl ? (
            <Image
              src={item.coverArtUrl}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-lilac-200/5 text-lilac-700/30 dark:text-lilac-500/50">
              <Volume2 className="w-8 h-8" />
            </div>
          )}

          {/* Play Overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center z-20 transition-colors duration-300 ${isCurrentItem && isPlaying ? "bg-black/20" : "bg-black/0 group-hover:bg-black/20"
              }`}
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePlayClick}
              className={`rounded-full w-12 h-12 bg-white/30 dark:bg-lilac-100/20 backdrop-blur-md border border-white/40 dark:border-bg-lilac-white/20 shadow-lg hover:scale-110 transition-all duration-300 text-zinc-900 dark:text-lilac-white hover:bg-lilac-200/20 dark:hover:bg-lilac-400/40 hover:border-lilac-200/60 dark:hover:border-lilac-400/40 hover:text-zinc-900 dark:hover:text-lilac-white ${isCurrentItem && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
            >
              {isCurrentItem && isPlaying ? (
                <PauseCircle className="size-10 stroke-[1] md:stroke-[1.5]" />
              ) : (
                <PlayCircle className="size-10 stroke-[1] md:stroke-[1.5]" />
              )}
            </Button>
          </div>
        </div>

        {/* Right Side: Text Content */}
        <div className="flex flex-col justify-between flex-1 gap-5 px-5 py-4 md:p-6 min-w-0 text-left">
          <div className="flex flex-col gap-2">
            {curated && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-[9.5px] md:text-[10px] text-leaf-700 dark:text-leaf-200 tracking-wider bg-leaf-100/30 dark:bg-leaf-900/30 hover:bg-leaf-100/50 px-1 py-0 md:px-1.5 leading-tight rounded border border-leaf-500/20"
                >
                  {itemLabel}
                </Badge>
              </div>
            )}

            <div>
              <Link href={itemHref}>
                <h3 className="text-lg font-bold text-muted-foreground group-hover:text-leaf-700 transition-colors line-clamp-1 leading-tight">
                  {item.title}
                </h3>
              </Link>

              {item.itemType === "samplePack" ? (
                <div className="flex items-center justify-between gap-2 pt-3">
                  {description && (
                    <p className="text-sm text-muted-foreground/70 leading-relaxed line-clamp-1 min-w-0">
                      {description}
                    </p>
                  )}
                  <Badge
                    variant="secondary"
                    className="ml-auto shrink-0 text-[10px] md:text-[11px] font-mono font-semibold text-leaf-600 dark:text-leaf-200 tracking-wider bg-leaf-100/50 dark:bg-leaf-950/40 hover:bg-leaf-100/70 dark:hover:bg-leaf-900/60 px-1.5 py-0 leading-tight rounded border border-leaf-500/30 dark:border-leaf-500/30"
                  >
                    ${price}
                  </Badge>
                </div>
              ) : (
                <>
                  {description && (
                    <p className="text-sm text-muted-foreground/70 leading-relaxed line-clamp-1 lg:line-clamp-none pt-1">
                      {description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-3">
                    {item.bpm && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] md:text-[10px] font-mono text-muted-foreground tracking-wider bg-transparent group-hover:!bg-leaf-500/10 px-1.5 py-0 leading-tight rounded border border-muted-foreground/50"
                      >
                        {item.bpm} BPM
                      </Badge>
                    )}
                    {item.key && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] md:text-[10px] font-mono text-muted-foreground tracking-wider bg-transparent group-hover:!bg-leaf-500/10 px-1.5 py-0 leading-tight rounded border border-muted-foreground/50"
                      >
                        {item.key}
                      </Badge>
                    )}

                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] md:text-[11px] font-mono font-semibold text-leaf-600 dark:text-leaf-200 tracking-wider bg-leaf-100/50 dark:bg-leaf-950/40 hover:bg-leaf-100/70 dark:hover:bg-leaf-900/60 px-1.5 py-0 leading-tight rounded border border-leaf-500/30 dark:border-leaf-500/30"
                    >
                      ${price}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
