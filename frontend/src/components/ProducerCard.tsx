import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@/types";

interface ProducerCardProps {
  producer: User;
}

export function ProducerCard({ producer }: ProducerCardProps) {
  return (
    <Link href={`/producers/${producer.uid}`} className="block group">
      <Card className="overflow-hidden hover:border-primary transition-colors duration-300">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden bg-muted border-2 border-transparent group-hover:border-primary transition-colors">
            {producer.producerProfile?.avatarUrl ? (
              <Image
                src={producer.producerProfile.avatarUrl}
                alt={producer.displayName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-muted-foreground text-2xl font-bold">
                {producer.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
            {producer.displayName}
          </h3>
          {producer.producerProfile?.bio && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {producer.producerProfile.bio}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
