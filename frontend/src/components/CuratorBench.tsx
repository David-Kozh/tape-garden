"use client";

import { useState } from "react";
import { CuratorCard, CuratorTrack } from "./CuratorCard";

interface CuratorBenchProps {
  tracks: CuratorTrack[];
}

export function CuratorBench({ tracks }: CuratorBenchProps) {
  const [activePlay, setActivePlay] = useState<string | null>(null);

  return (
    <div id="explore" className="flex flex-col gap-8 pb-6">
      <div className="flex justify-between items-end border-b border-zinc-400/80 pb-2">
        <h2 className="text-xl font-bold text-zinc-900">Curator&apos;s Bench</h2>
        <span className="text-xs text-emerald-600/80 font-semibold tracking-wider uppercase">
          {tracks.length < 10 ? `0${tracks.length}` : tracks.length} releases
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tracks.map((track) => (
          <CuratorCard
            key={track.id}
            track={track}
            isPlaying={activePlay === track.id}
            onPlayToggle={() => setActivePlay(activePlay === track.id ? null : track.id)}
          />
        ))}
      </div>
    </div>
  );
}
