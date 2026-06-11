import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, ShoppingCart } from "lucide-react";

interface Beat {
  id: string;
  title: string;
  coverArtUrl?: string;
  bpm?: number;
  key?: string;
  price: number;
  tags?: string[];
  producerId: string;
}

interface BeatCardProps {
  beat: Beat;
}

export function BeatCard({ beat }: BeatCardProps) {
  return (
    <Card className="overflow-hidden group hover:border-primary transition-colors duration-300">
      <div className="relative aspect-square bg-muted">
        {beat.coverArtUrl ? (
          <Image
            src={beat.coverArtUrl}
            alt={beat.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-secondary/20 text-muted-foreground">
            No Cover
          </div>
        )}
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button size="icon" variant="secondary" className="rounded-full w-12 h-12 shadow-lg hover:scale-110 transition-transform">
            <PlayCircle className="w-6 h-6 text-secondary-foreground" />
          </Button>
        </div>
        
        {/* Tags */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {beat.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-bold text-lg truncate text-foreground">{beat.title}</h3>
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <span className="flex gap-2">
            {beat.bpm && <span>{beat.bpm} BPM</span>}
            {beat.key && <span>{beat.key}</span>}
          </span>
          <span className="font-medium text-foreground">${beat.price}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Button className="w-full gap-2" variant="default">
          <ShoppingCart className="w-4 h-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
