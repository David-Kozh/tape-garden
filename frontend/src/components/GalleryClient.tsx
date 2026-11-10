"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ItemCard } from "@/components/ItemCard";
import { FeaturedCard } from "@/components/FeaturedCard";
import { ProducerCard } from "@/components/ProducerCard";
import { getPublishedBeats, getApprovedProducers, BeatWithProducer } from "@/lib/services/gallery";
import { getPublishedSamplePacks, SamplePackWithProducer } from "@/lib/services/samplePacks";
import { searchAlgoliaBeats, isAlgoliaConfigured } from "@/lib/algolia";
import { User } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";

const AVAILABLE_BEAT_GENRES = ["Hip Hop", "R&B", "Trap", "Lo-Fi", "Pop", "Electronic", "Boom Bap", "Drill"];
const AVAILABLE_PACK_CATEGORIES = ["Drums", "Melodies", "Vocals", "One Shots", "Loops", "FX", "Presets", "MIDI"];

export function GalleryClient() {
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
  const [algoliaBeats, setAlgoliaBeats] = useState<BeatWithProducer[]>([]);
  const [isSearchingBeats, setIsSearchingBeats] = useState(false);
  const [packs, setPacks] = useState<SamplePackWithProducer[]>([]);
  const [producers, setProducers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [beatTags, setBeatTags] = useState<string[]>([]);
  const [packTags, setPackTags] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const activeTags = view === "beats" ? beatTags : packTags;
  const availableTags = view === "beats" ? AVAILABLE_BEAT_GENRES : AVAILABLE_PACK_CATEGORIES;
  const filterTitle = view === "beats" ? "Filter by Genre" : "Filter by Category";
  const algoliaEnabled = isAlgoliaConfigured();

  // Debounce search query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch default catalog data from Firestore
  useEffect(() => {
    async function loadData() {
      // When actively searching beats via Algolia, skip redundant Firestore beat fetches
      if (view === "beats" && algoliaEnabled && debouncedSearchQuery.trim() !== "") {
        return;
      }

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
  }, [view, beatTags, packTags, debouncedSearchQuery, algoliaEnabled]);

  // Execute typo-tolerant Algolia search when view === "beats" and query is non-empty
  useEffect(() => {
    let isCancelled = false;

    async function runAlgoliaSearch() {
      if (view !== "beats" || !algoliaEnabled || debouncedSearchQuery.trim() === "") {
        setIsSearchingBeats(false);
        return;
      }

      setIsSearchingBeats(true);
      try {
        const hits = await searchAlgoliaBeats(debouncedSearchQuery, beatTags);
        if (!isCancelled) {
          setAlgoliaBeats(hits);
        }
      } catch (error) {
        console.error("Error searching beats via Algolia:", error);
        if (!isCancelled) {
          setAlgoliaBeats([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingBeats(false);
        }
      }
    }

    runAlgoliaSearch();

    return () => {
      isCancelled = true;
    };
  }, [view, debouncedSearchQuery, beatTags, algoliaEnabled]);

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

  const isAlgoliaSearchActive =
    view === "beats" && algoliaEnabled && debouncedSearchQuery.trim() !== "";

  // Use Algolia hits when searching on Beats tab (if configured); otherwise fall back to client-side filtering
  const filteredBeats = isAlgoliaSearchActive
    ? algoliaBeats
    : beats.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const filteredPacks = packs.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducers = producers.filter(p =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isViewLoading = isLoading || (view === "beats" && isSearchingBeats);

  const searchPlaceholder =
    view === "beats"
      ? "Search beats..."
      : view === "packs"
        ? "Search sample packs..."
        : "Search artists...";

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
      <div className="flex flex-col gap-6 md:gap-8 mb-6 md:mb-12">
        <h1 className="hidden md:block text-3xl lg:text-4xl font-extrabold tracking-tight text-center text-muted-foreground">Gallery</h1>

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
                <DialogTrigger render={<Button className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0 bg-background hover:!bg-white/40 text-muted-foreground hover:bg-brand-bglight-500 hover:text-brand-black transition-colors z-10" />}>
                  <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                  {activeTags.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-leaf-600" />
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
            <TabsList className="!h-12 p-1 rounded-full border border-input bg-brand-bglight-400 dark:bg-graphite-700 border-opacity-30">
              <TabsTrigger value="beats" className="rounded-full px-3 sm:px-6 text-[10px] md:text-xs data-active:!bg-brand-bglight-300 data-active:!text-foreground dark:data-active:!bg-graphite-600">Beats</TabsTrigger>
              <TabsTrigger value="packs" className="rounded-full px-3 sm:px-6 text-[10px] md:text-xs data-active:!bg-brand-bglight-300 data-active:!text-foreground dark:data-active:!bg-graphite-600">Samples</TabsTrigger>
              <TabsTrigger value="artists" className="rounded-full px-3 sm:px-6 text-[10px] md:text-xs data-active:!bg-brand-bglight-300 data-active:!text-foreground dark:data-active:!bg-graphite-600">Artists</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isViewLoading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {view === "beats" && (
            filteredBeats.length > 0 ? (
              <>
                <div className="col-span-full grid grid-cols-2 gap-4 md:hidden">
                  {filteredBeats.map(beat => (
                    <FeaturedCard key={beat.id} item={{ ...beat, itemType: "beat" }} />
                  ))}
                </div>
                <div className="col-span-full hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredBeats.map(beat => (
                    <ItemCard key={beat.id} item={{ ...beat, itemType: "beat" }} />
                  ))}
                </div>
              </>
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground py-12 gap-3">
                <p>No beats found matching your criteria. Try alternate keywords or reset your filters.</p>
                {(searchQuery.trim() !== "" || beatTags.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setDebouncedSearchQuery("");
                      setBeatTags([]);
                    }}
                  >
                    Reset Search & Filters
                  </Button>
                )}
              </div>
            )
          )}

          {view === "packs" && (
            filteredPacks.length > 0 ? (
              <>
                <div className="col-span-full grid grid-cols-2 gap-4 md:hidden">
                  {filteredPacks.map(pack => (
                    <FeaturedCard key={pack.id} item={{ ...pack, itemType: "samplePack" }} />
                  ))}
                </div>
                <div className="col-span-full hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredPacks.map(pack => (
                    <ItemCard key={pack.id} item={{ ...pack, itemType: "samplePack" }} />
                  ))}
                </div>
              </>
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
