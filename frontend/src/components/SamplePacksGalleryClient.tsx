"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SamplePackCard } from "@/components/SamplePackCard";
import { ProducerCard } from "@/components/ProducerCard";
import { getPublishedSamplePacks, SamplePackWithProducer } from "@/lib/services/samplePacks";
import { getApprovedProducers } from "@/lib/services/gallery";
import { User } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";

const AVAILABLE_GENRES = ["Drums", "Melodies", "Vocals", "One Shots", "Loops", "FX", "Presets", "MIDI"];

export function SamplePacksGalleryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") === "artists" ? "artists" : "packs";

  const [packs, setPacks] = useState<SamplePackWithProducer[]>([]);
  const [producers, setProducers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        if (view === "packs") {
          const { packs: fetchedPacks } = await getPublishedSamplePacks({ tags: activeTags });
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
  }, [view, activeTags]);

  const handleViewChange = (newView: "packs" | "artists") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleTag = (tag: string) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredPacks = packs.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducers = producers.filter(p =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-8 mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center text-brand-grey">Sample Packs</h1>

        <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${view}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-14 h-12 rounded-full shadow-md"
            />

            {view === "packs" && (
              <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogTrigger render={<Button className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0 bg-background hover:!bg-white/40 text-brand-grey hover:bg-brand-bglight-500 hover:text-brand-black transition-colors" />}>
                  <SlidersHorizontal className="w-5 h-5" />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Filter by Category</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-2 py-4">
                    {AVAILABLE_GENRES.map(genre => (
                      <Badge
                        key={genre}
                        variant={activeTags.includes(genre) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1.5 px-3"
                        onClick={() => toggleTag(genre)}
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={() => setActiveTags([])}>Clear All</Button>
                    <Button onClick={() => setIsFilterModalOpen(false)}>Apply Filters</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Tabs
            value={view}
            onValueChange={(val) => handleViewChange(val as "packs" | "artists")}
            className="shrink-0 self-center"
          >
            <TabsList className="!h-12 rounded-full border border-input bg-brand-bglight-600">
              <TabsTrigger value="packs" className="rounded-full px-6 text-sm data-active:!bg-brand-bglight-400 data-active:!text-foreground">Packs</TabsTrigger>
              <TabsTrigger value="artists" className="rounded-full px-6 text-sm data-active:!bg-brand-bglight-400 data-active:!text-foreground">Artists</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {view === "packs" ? (
            filteredPacks.length > 0 ? (
              filteredPacks.map(pack => (
                <SamplePackCard key={pack.id} pack={pack} />
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No sample packs found matching your criteria.
              </div>
            )
          ) : (
            filteredProducers.length > 0 ? (
              filteredProducers.map(producer => (
                <ProducerCard key={producer.uid} producer={producer} />
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No artists found.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
