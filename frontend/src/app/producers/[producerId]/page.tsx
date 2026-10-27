"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { BeatCard } from "@/components/BeatCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkIcon } from "lucide-react";
import { HERO_PATTERNS } from "@/lib/patterns";

// Assuming types based on Cloud Function return
interface ProducerProfile {
  displayName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: Array<{ platform: string; url: string }>;
  backgroundPattern?: string;
}

import { useAudio } from "@/context/AudioContext";
import { BeatWithProducer } from "@/lib/services/gallery";
import { SamplePackCard } from "@/components/SamplePackCard";
import { SamplePackWithProducer } from "@/lib/services/samplePacks";

export default function ProducerPage() {
  const params = useParams();
  const producerId = params.producerId as string;
  const { currentTrack } = useAudio();

  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<BeatWithProducer[]>([]);
  const [samplePacks, setSamplePacks] = useState<SamplePackWithProducer[]>([]);
  const [activeTab, setActiveTab] = useState<"beats" | "packs">("beats");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!producerId) return;

    const fetchProfile = async () => {
      try {
        const getProducerProfile = httpsCallable(functions, "getProducerProfile");
        const result = await getProducerProfile({ producerId });
        const data = result.data as {
          profile: ProducerProfile;
          beats: Record<string, unknown>[];
          samplePacks?: Record<string, unknown>[];
        };

        setProfile(data.profile);
        setBeats(data.beats.map(b => ({
          ...b,
          producer: {
            uid: producerId,
            displayName: data.profile.displayName,
            avatarUrl: data.profile.avatarUrl
          }
        } as BeatWithProducer)));

        setSamplePacks((data.samplePacks || []).map(p => ({
          ...p,
          producer: {
            uid: producerId,
            displayName: data.profile.displayName,
            avatarUrl: data.profile.avatarUrl
          }
        } as SamplePackWithProducer)));
      } catch (err: unknown) {
        console.error("Error fetching producer profile:", err);
        setError((err as Error).message || "Failed to load producer profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [producerId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col container max-w-6xl mx-auto py-8 lg:py-12 px-4 space-y-8 sm:space-y-12">
        {/* Profile Header Skeleton Card */}
        <div className="rounded-2xl md:rounded-3xl border border-white/35 bg-white/20 backdrop-blur-sm shadow-sm p-6 sm:p-8 md:p-10 flex flex-row items-start gap-6 md:gap-10 text-left">
          <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-full shrink-0" />
          <div className="space-y-4 text-left flex-1 max-w-2xl">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-20 w-full" />
            <div className="flex justify-start gap-4">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>

        {/* Beats Grid Skeleton Card */}
        <div className="flex-1 rounded-2xl md:rounded-3xl border border-white/35 bg-white/20 backdrop-blur-sm shadow-sm p-6 sm:p-8 md:p-10 space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-24 px-4 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Producer Not Found</h1>
        <p className="text-muted-foreground">{error || "This profile is unavailable or does not exist."}</p>
        <Button variant="outline" className="mt-8" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const patternUrl = profile.backgroundPattern && profile.backgroundPattern !== "none" ? HERO_PATTERNS[profile.backgroundPattern] : null;

  return (
    <div
      className="flex-1 flex flex-col w-full relative"
      style={patternUrl ? { backgroundImage: `url("${patternUrl}")` } : undefined}
    >
      <div className={`flex-1 flex flex-col container max-w-6xl mx-auto pt-8 lg:pt-12 px-4 space-y-8 sm:space-y-12 transition-all duration-300 ${currentTrack ? "pb-36" : "pb-8 lg:pb-12"
        }`}>
        {/* Profile Header Glass Card */}
        <section className="rounded-2xl md:rounded-3xl border border-white/35 bg-white/15 backdrop-blur-[2px] shadow-sm p-6 sm:p-8 md:p-10 flex flex-row items-start gap-6 md:gap-10 text-left">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 border-4 border-white/80 shadow-lg">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback className="text-2xl sm:text-4xl bg-muted text-muted-foreground">
              {profile.displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-3 sm:space-y-4 max-w-2xl min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {profile.displayName}
            </h1>

            {profile.bio && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {profile.bio}
              </p>
            )}

            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex flex-wrap justify-start gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                {profile.socialLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "secondary", size: "sm", className: "rounded-full gap-2 shadow-xs" })}
                  >
                    <LinkIcon className="w-4 h-4" />
                    {link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Gallery Glass Card */}
        <section className="flex-1 rounded-2xl md:rounded-3xl border border-white/35 bg-white/15 backdrop-blur-[2px] shadow-sm p-6 sm:p-8 md:p-10">
          <div className="mb-8 space-y-3">
            <div className="flex items-end justify-between border-b border-border/30">
              <h2 className="text-2xl font-bold tracking-tight text-foreground pb-2.5">
                Gallery
              </h2>

              {samplePacks.length > 0 && (
                <div role="tablist" aria-label="Producer content" className="flex items-center gap-6 -mb-px">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "beats"}
                    onClick={() => setActiveTab("beats")}
                    className={`relative pb-2.5 text-sm sm:text-base font-semibold transition-colors cursor-pointer ${activeTab === "beats"
                      ? "text-foreground"
                      : "text-brand-lgrey hover:text-foreground/80"
                      }`}
                  >
                    Beats
                    {activeTab === "beats" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "packs"}
                    onClick={() => setActiveTab("packs")}
                    className={`relative pb-2.5 text-sm sm:text-base font-semibold transition-colors cursor-pointer ${activeTab === "packs"
                      ? "text-foreground"
                      : "text-brand-lgrey hover:text-foreground/80"
                      }`}
                  >
                    Sample Packs
                    {activeTab === "packs" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <p className="text-muted-foreground text-sm sm:text-base">
              {activeTab === "beats"
                ? `Explore available beats by ${profile.displayName}`
                : `Explore sample packs by ${profile.displayName}`}
            </p>
          </div>

          {activeTab === "beats" ? (
            beats.length === 0 ? (
              <div className="text-center py-20 bg-white/20 rounded-2xl border border-dashed border-border/60">
                <h3 className="text-lg font-medium text-foreground mb-2">No Beats Found</h3>
                <p className="text-muted-foreground">This producer hasn&apos;t published any beats yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {beats.map((beat) => (
                  <BeatCard key={beat.id} beat={beat} showProducer={false} />
                ))}
              </div>
            )
          ) : (
            samplePacks.length === 0 ? (
              <div className="text-center py-20 bg-white/20 rounded-2xl border border-dashed border-border/60">
                <h3 className="text-lg font-medium text-foreground mb-2">No Sample Packs Found</h3>
                <p className="text-muted-foreground">This producer hasn&apos;t published any sample packs yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {samplePacks.map((pack) => (
                  <SamplePackCard key={pack.id} pack={pack} showProducer={false} />
                ))}
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
