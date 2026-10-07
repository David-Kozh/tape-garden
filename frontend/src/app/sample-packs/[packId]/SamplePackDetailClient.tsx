"use client";

import { SamplePackWithProducer } from "@/lib/services/samplePacks";
import { useAudio } from "@/context/AudioContext";
import { useCart } from "@/context/CartContext";
import { Play, Pause, User, Tag, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

interface SamplePackDetailClientProps {
  pack: SamplePackWithProducer;
}

export function SamplePackDetailClient({ pack }: SamplePackDetailClientProps) {
  const { currentTrack, isPlaying, play, togglePlayPause } = useAudio();
  const { addItem } = useCart();

  const isCurrentPack = currentTrack?.id === pack.id;

  const handlePlayClick = () => {
    if (isCurrentPack) {
      togglePlayPause();
    } else {
      play({
        id: pack.id,
        title: pack.title,
        producerId: pack.producer.uid,
        producer: pack.producer,
        audioPreviewUrl: pack.audioPreviewUrl,
        itemType: "samplePack",
      });
    }
  };

  const handleAddToCart = () => {
    addItem({
      itemId: pack.id,
      itemType: "samplePack",
      licenseType: "standard",
      price: pack.price,
      title: pack.title,
      producerId: pack.producer.uid,
    });
    toast.success(`Added ${pack.title} to cart`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row gap-8 mb-12 items-start">
        {/* Cover Placeholder */}
        <div className="w-full md:w-1/3 aspect-square relative rounded-xl overflow-hidden bg-secondary/10 flex flex-col items-center justify-center text-secondary/40 shadow-lg">
          <PackageOpen className="w-32 h-32" />
        </div>

        {/* Metadata & Controls */}
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{pack.title}</h1>
            <Link 
              href={`/producers/${pack.producer.uid}`}
              className="flex items-center gap-2 text-xl text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <User className="w-5 h-5" />
              <span>{pack.producer.displayName}</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Button size="lg" className="rounded-full h-14 px-8 text-lg gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handlePlayClick}>
              {isCurrentPack && isPlaying ? (
                <>
                  <Pause className="w-6 h-6 fill-current" /> Pause Preview
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
              <span>Released {format(new Date(pack.createdAt as string), "MMMM d, yyyy")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {pack.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="px-3 py-1">
                <Tag className="w-3 h-3 mr-1" /> {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Description</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground bg-card border border-border rounded-xl p-6 shadow-sm">
          {pack.description.split('\n').map((paragraph, index) => (
            <p key={index} className={index > 0 ? "mt-4" : ""}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Purchasing Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-8">Purchase</h2>
        <div className="max-w-md">
          <Card className="flex flex-col border-secondary/50 shadow-md">
            <CardHeader className="bg-secondary/5">
              <CardTitle>Standard License</CardTitle>
              <CardDescription>Royalty-free sample pack</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <div className="text-4xl font-black mb-6">${pack.price}</div>
              <ul className="text-sm text-muted-foreground space-y-3 list-disc list-inside">
                <li>100% Royalty Free</li>
                <li>High quality WAV format</li>
                <li>Instant Download</li>
                <li>Use in commercial projects</li>
              </ul>
            </CardContent>
            <CardFooter className="pb-6 px-6 bg-secondary/5 pt-4 border-t border-secondary/10">
              {pack.producer.acceptingPayments ? (
                <Button size="lg" className="w-full text-lg gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleAddToCart}>
                  Add to Cart - ${pack.price}
                </Button>
              ) : (
                <Button size="lg" className="w-full text-lg gap-2 pointer-events-none" variant="secondary" disabled>
                  Currently Unavailable
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
