import { Volume2, PlayCircle, PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export interface CuratorTrack {
  id: string;
  title: string;
  type: string;
  tempo: string;
  tags: string[];
  description: string;
  coverArtUrl?: string;
}

interface CuratorCardProps {
  track: CuratorTrack;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

export function CuratorCard({ track, isPlaying, onPlayToggle }: CuratorCardProps) {
  return (
    <Card className="group relative rounded-2xl border-zinc-200/80 bg-white/40 backdrop-blur-sm hover:border-emerald-500/30 hover:bg-white/60 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden p-0">
      {/* Background Hover Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />

      <CardContent className="p-0 flex flex-row items-stretch relative z-10 h-full">
        {/* Left Side: Text Content */}
        <div className="flex flex-col justify-between flex-1 gap-4 p-6 pr-4 lg:pr-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px] text-emerald-700 tracking-wider bg-emerald-100/50 hover:bg-emerald-100/50 pr-1 pl-1.5 py-0.5 rounded border border-emerald-500/20">
                {track.type}
              </Badge>
              <span className="text-[11px] text-zinc-500 font-mono pt-0.5">{track.tempo}</span>
            </div>

            <h3 className="text-lg font-bold text-zinc-900 tracking-tight group-hover:text-emerald-700 transition-colors line-clamp-1">
              {track.title}
            </h3>

            <p className="text-sm text-zinc-600 leading-relaxed line-clamp-1 lg:line-clamp-none">
              {track.description}
            </p>
          </div>

          <div className="flex gap-2 mt-auto">
            {track.tags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[10px] text-zinc-600 font-medium px-2 py-0.5 rounded-full bg-black/5 hover:bg-black/10 border border-black/5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Right Side: Cover Art & Play Button */}
        <div className="relative aspect-square shrink-0 bg-zinc-200/50 overflow-hidden border-l border-zinc-200/80 rounded-2xl h-full">
          {track.coverArtUrl ? (
            <Image
              src={track.coverArtUrl}
              alt={track.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-emerald-500/5 text-emerald-700/30">
              <Volume2 className="w-8 h-8" />
            </div>
          )}

          {/* Play Overlay */}
          <div
            className={`absolute inset-0 bg-black/20 flex items-center justify-center z-20 transition-opacity duration-300 ${isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
          >
            <Button
              size="icon"
              variant="secondary"
              onClick={onPlayToggle}
              className="rounded-full w-12 h-12 shadow-lg hover:scale-110 transition-transform bg-white/95 text-zinc-900 hover:bg-white"
            >
              {isPlaying ? (
                <PauseCircle className="w-6 h-6 text-emerald-600" />
              ) : (
                <PlayCircle className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
