"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BeatCard } from "@/components/BeatCard";
import { SamplePackCard } from "@/components/SamplePackCard";
import { ProducerCard } from "@/components/ProducerCard";
import { getPublishedBeats, getApprovedProducers, BeatWithProducer } from "@/lib/services/gallery";
import { getPublishedSamplePacks, SamplePackWithProducer } from "@/lib/services/samplePacks";
import { User } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";

const AVAILABLE_BEAT_GENRES = ["Hip Hop", "R&B", "Trap", "Lo-Fi", "Pop", "Electronic", "Boom Bap", "Drill"];
const AVAILABLE_PACK_CATEGORIES = ["Drums", "Melodies", "Vocals", "One Shots", "Loops", "FX", "Presets", "MIDI"];

export function BeatsGalleryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  const view: "beats" | "packs" | "artists" =
    viewParam === "artists"
      ? "artists"
      : viewParam === "packs" || viewParam === "sample-packs"
      ? "packs"
      : "beats";

  const [beats, setBeats] = useState<BeatWithProducer[]>([]);
  const [packs, setPacks] = useState<SamplePackWithProducer[]>([]);
  const [producers, setProducers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [beatTags, setBeatTags] = useState<string[]>([]);
  const [packTags, setPackTags] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const activeTags = view === "beats" ? beatTags : packTags;
  const availableTags = view === "beats" ? AVAILABLE_BEAT_GENRES : AVAILABLE_PACK_CATEGORIES;
  const filterTitle = view === "beats" ? "Filter by Genre" : "Filter by Category";

  // Fetch data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        if (view === "beats") {
          const { beats: fetchedBeats } = await getPublishedBeats({ tags: beatTags });
          setBeats(fetchedBeats);
        } else if (view === "packs") {
          const { packs: fetchedPacks } = await getPublishedSamplePacks({ tags: packTags });
          setPacks(fetchedPacks);
        } else {
          const { producers: fetchedProducers } = await getApprovedProducers();
          setProducers(fetchedProducers);
        }
      } catch (error) {
        console.error("Error fetching gallery data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [view, beatTags, packTags]);

  const handleViewChange = (newView: "beats" | "packs" | "artists") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleTag = (tag: string) => {
    if (view === "beats") {
      setBeatTags(prev =>
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    } else if (view === "packs") {
      setPackTags(prev =>
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    }
  };

  const clearCurrentTags = () => {
    if (view === "beats") {
      setBeatTags([]);
    } else if (view === "packs") {
      setPackTags([]);
    }
  };

  // Client-side search filtering (since Firestore native prefix search is limited and case-sensitive)
  const filteredBeats = beats.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPacks = packs.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducers = producers.filter(p =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchPlaceholder =
    view === "beats"
      ? "Search beats..."
      : view === "packs"
      ? "Search sample packs..."
      : "Search artists...";

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
      <div className="flex flex-col gap-6 md:gap-8 mb-6 md:mb-12">
        <h1 className="hidden md:block text-3xl md:text-4xl font-extrabold tracking-tight text-center text-brand-grey">Gallery</h1>

        <div className="flex items-center gap-2 sm:gap-4 max-w-4xl mx-auto w-full">
          <div className="relative flex-1 min-w-0 h-12">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none z-10" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-12 pr-11 sm:pr-14 h-12 rounded-full border-input shadow-md border-opacity-30 w-full text-xs sm:text-sm"
            />

            {view !== "artists" && (
              <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogTrigger render={<Button className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0 bg-background hover:!bg-white/40 text-brand-grey hover:bg-brand-bglight-500 hover:text-brand-black transition-colors z-10" />}>
                  <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                  {activeTags.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{filterTitle}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-2 py-4">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={activeTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1.5 px-3"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={clearCurrentTags}>Clear All</Button>
                    <Button onClick={() => setIsFilterModalOpen(false)}>Apply Filters</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Tabs
            value={view}
            onValueChange={(val) => handleViewChange(val as "beats" | "packs" | "artists")}
            className="shrink-0"
          >
            <TabsList className="!h-12 p-1 rounded-full border border-input bg-brand-bglight-600 border-opacity-30">
              <TabsTrigger value="beats" className="rounded-full px-3 sm:px-6 text-xs sm:text-sm data-active:!bg-brand-bglight-400 data-active:!text-foreground">Beats</TabsTrigger>
              <TabsTrigger value="packs" className="rounded-full px-3 sm:px-6 text-xs sm:text-sm data-active:!bg-brand-bglight-400 data-active:!text-foreground">Sample Packs</TabsTrigger>
              <TabsTrigger value="artists" className="rounded-full px-3 sm:px-6 text-xs sm:text-sm data-active:!bg-brand-bglight-400 data-active:!text-foreground">Artists</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {view === "beats" && (
            filteredBeats.length > 0 ? (
              filteredBeats.map(beat => (
                <BeatCard key={beat.id} beat={beat} />
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No beats found matching your criteria.
              </div>
            )
          )}

          {view === "packs" && (
            filteredPacks.length > 0 ? (
              filteredPacks.map(pack => (
                <SamplePackCard key={pack.id} pack={pack} />
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No sample packs found matching your criteria.
              </div>
            )
          )}

          {view === "artists" && (
            filteredProducers.length > 0 ? (
              filteredProducers.map(producer => (
                <ProducerCard key={producer.uid} producer={producer} />
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No artists found matching your criteria.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
