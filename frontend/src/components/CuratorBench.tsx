"use client";

import { FeaturedCard } from "./FeaturedCard";
import { CatalogItem } from "./ItemCard";

interface CuratorBenchProps {
  tracks: CatalogItem[];
}

export function CuratorBench({ tracks }: CuratorBenchProps) {
  return (
    <div className="flex flex-col gap-6 pb-6 mx-4 md:mx-0">
      <div className="flex justify-between items-end border-b border-muted-foreground/40 pb-2">
        <h2 className="text-xl font-bold text-muted-foreground">Curator&apos;s Bench</h2>
        <span className="text-xs text-leaf-600/80 font-semibold tracking-wider uppercase">
          {tracks.length < 10 ? `0${tracks.length}` : tracks.length} releases
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {tracks.map((track) => (
          <FeaturedCard
            key={track.id}
            item={track}
            showProducer={false}
            curated={true}
          />
        ))}
      </div>
    </div>
  );
}
