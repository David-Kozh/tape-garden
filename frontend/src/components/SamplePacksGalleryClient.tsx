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
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center">Sample Packs</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={`Search ${view}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-12 text-lg rounded-full"
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={view}
              onChange={(e) => handleViewChange(e.target.value as "packs" | "artists")}
              className="h-12 px-4 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="packs">Packs</option>
              <option value="artists">Artists</option>
            </select>

            {view === "packs" && (
              <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogTrigger render={<Button variant="outline" className="h-12 w-12 rounded-full p-0" />}>
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
