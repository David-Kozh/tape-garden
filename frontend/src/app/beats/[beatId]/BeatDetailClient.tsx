"use client";

import { BeatWithProducer } from "@/lib/services/gallery";
import { useAudio } from "@/context/AudioContext";
import { Play, Pause, User, Music2, Tag, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

interface BeatDetailClientProps {
  beat: BeatWithProducer;
}

export function BeatDetailClient({ beat }: BeatDetailClientProps) {
  const { currentBeat, isPlaying, play, togglePlayPause } = useAudio();

  const isCurrentBeat = currentBeat?.id === beat.id;

  const handlePlayClick = () => {
    if (isCurrentBeat) {
      togglePlayPause();
    } else {
      play(beat);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row gap-8 mb-12 items-start">
        {/* Cover Art */}
        <div className="w-full md:w-1/3 aspect-square relative rounded-xl overflow-hidden bg-secondary shadow-lg">
          {beat.coverArtUrl ? (
            <Image
              src={beat.coverArtUrl}
              alt={beat.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-6xl">
              {beat.title.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Metadata & Controls */}
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{beat.title}</h1>
            <Link 
              href={`/producers/${beat.producer.uid}`}
              className="flex items-center gap-2 text-xl text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <User className="w-5 h-5" />
              <span>{beat.producer.displayName}</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Button size="lg" className="rounded-full h-14 px-8 text-lg gap-2" onClick={handlePlayClick}>
              {isCurrentBeat && isPlaying ? (
                <>
                  <Pause className="w-6 h-6 fill-current" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" /> Play Preview
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Music2 className="w-4 h-4" />
              <span className="font-mono">{beat.bpm} BPM</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Key className="w-4 h-4" />
              <span className="font-mono">{beat.key}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Released {format(new Date(beat.createdAt as string), "MMMM d, yyyy")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {beat.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="px-3 py-1">
                <Tag className="w-3 h-3 mr-1" /> {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Licensing Section */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold tracking-tight mb-8">Licensing Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {beat.licenses?.map((license) => (
            <Card key={license.type} className="flex flex-col">
              <CardHeader>
                <CardTitle className="capitalize">{license.type}</CardTitle>
                <CardDescription>License terms and usage rights</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-3xl font-bold mb-4">${license.price}</div>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  {license.type === "non-exclusive" && (
                    <>
                      <li>High quality MP3/WAV</li>
                      <li>Up to 10,000 streams</li>
                      <li>Basic performance rights</li>
                    </>
                  )}
                  {license.type === "exclusive" && (
                    <>
                      <li>High quality MP3/WAV + Stems</li>
                      <li>Unlimited streams</li>
                      <li>Full commercial rights</li>
                      <li>Beat removed from store</li>
                    </>
                  )}
                  {license.type === "unlimited" && (
                    <>
                      <li>High quality MP3/WAV + Stems</li>
                      <li>Unlimited streams</li>
                      <li>Full commercial rights</li>
                    </>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled>Add to Cart</Button>
              </CardFooter>
            </Card>
          ))}
          {(!beat.licenses || beat.licenses.length === 0) && (
            <div className="col-span-full text-muted-foreground py-8">
              No licenses available for this beat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
