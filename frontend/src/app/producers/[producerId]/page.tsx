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

// Assuming types based on Cloud Function return
interface ProducerProfile {
  displayName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: Array<{ platform: string; url: string }>;
}

interface Beat {
  id: string;
  title: string;
  coverArtUrl?: string;
  bpm?: number;
  key?: string;
  price: number;
  tags?: string[];
  producerId: string;
  status: string;
}

export default function ProducerPage() {
  const params = useParams();
  const producerId = params.producerId as string;

  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!producerId) return;

    const fetchProfile = async () => {
      try {
        const getProducerProfile = httpsCallable(functions, "getProducerProfile");
        const result = await getProducerProfile({ producerId });
        const data = result.data as { profile: ProducerProfile; beats: Beat[] };
        
        setProfile(data.profile);
        setBeats(data.beats);
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
      <div className="container max-w-6xl mx-auto py-12 px-4 space-y-12">
        {/* Profile Header Skeleton */}
        <div className="flex flex-col items-center space-y-4 md:flex-row md:items-start md:space-x-8 md:space-y-0">
          <Skeleton className="w-32 h-32 rounded-full" />
          <div className="space-y-4 text-center md:text-left flex-1">
            <Skeleton className="h-8 w-64 mx-auto md:mx-0" />
            <Skeleton className="h-20 w-full max-w-2xl mx-auto md:mx-0" />
            <div className="flex justify-center md:justify-start gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>

        {/* Beats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
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

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4 space-y-16">
      {/* Profile Header */}
      <section className="flex flex-col items-center md:flex-row md:items-start md:space-x-10 text-center md:text-left">
        <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
          <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
            {profile.displayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="mt-6 md:mt-0 space-y-4 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {profile.displayName}
          </h1>
          
          {profile.bio && (
            <p className="text-muted-foreground leading-relaxed">
              {profile.bio}
            </p>
          )}

          {profile.socialLinks && profile.socialLinks.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              {profile.socialLinks.map((link, idx) => (
                <a 
                  key={idx} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "secondary", size: "sm", className: "rounded-full gap-2" })}
                >
                  <LinkIcon className="w-4 h-4" />
                  {link.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Beats Gallery */}
      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gallery</h2>
          <p className="text-muted-foreground">Explore available beats by {profile.displayName}</p>
        </div>

        {beats.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed border-border">
            <h3 className="text-lg font-medium text-foreground mb-2">No Beats Found</h3>
            <p className="text-muted-foreground">This producer hasn&apos;t published any beats yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {beats.map((beat) => (
              <BeatCard key={beat.id} beat={beat} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
