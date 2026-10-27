"use client";

import { useAudio } from "@/context/AudioContext";
import { Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer() {
  const { currentTrack, isPlaying, progress, duration, volume, togglePlayPause, seek, setVolume, closePlayer } = useAudio();
  const [previousVolume, setPreviousVolume] = useState(0.5);
  const isMuted = volume === 0;

  if (!currentTrack) return null;

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(previousVolume || 1);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    seek(val);
  };

  const handleVolumeChange = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    setVolume(val);
  };

  return (
    <div
      className="fixed left-0 bottom-0 right-0 h-24 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border z-50 flex items-center px-4 sm:px-8 transition-all duration-300"
    >
      <div className="container mx-auto max-w-7xl flex items-center justify-between w-full h-full gap-2 sm:gap-4">

        {/* Track Info */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 sm:w-[25%] sm:min-w-[175px]">
          <div className="relative w-14 h-14 rounded-md overflow-hidden bg-secondary flex-shrink-0 hidden sm:block">
            {currentTrack.coverArtUrl ? (
              <Image
                src={currentTrack.coverArtUrl}
                alt={currentTrack.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {currentTrack.title.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col truncate min-w-0">
            <Link href={currentTrack.itemType === "samplePack" ? `/sample-packs/${currentTrack.id}` : `/beats/${currentTrack.id}`} className="font-semibold hover:underline truncate text-sm sm:text-base">
              {currentTrack.title}
            </Link>
            <Link href={`/producers/${currentTrack.producer.uid}`} className="text-xs sm:text-sm text-muted-foreground hover:underline truncate">
              {currentTrack.producer.displayName}
            </Link>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0 max-w-2xl gap-2">
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </Button>
          </div>
          <div className="flex items-center w-full gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground font-mono">
            <span>{formatTime(progress)}</span>
            <Slider
              value={[progress]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Actions */}
        <div className="flex items-center justify-end sm:w-[25%] sm:min-w-[100px] gap-1 sm:gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleVolumeToggle} className="hidden sm:inline-flex">
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <div className="w-24 hidden sm:block">
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={closePlayer} className="text-muted-foreground hover:text-foreground sm:ml-2">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
