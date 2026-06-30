import { getBeatById } from "@/lib/services/gallery";
import { notFound } from "next/navigation";
import { BeatDetailClient } from "./BeatDetailClient";
import { Metadata } from "next";

interface BeatPageProps {
  params: Promise<{
    beatId: string;
  }>;
}

export async function generateMetadata({ params }: BeatPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const beat = await getBeatById(resolvedParams.beatId);
  
  if (!beat) {
    return {
      title: "Beat Not Found | Tape Garden",
    };
  }

  return {
    title: `${beat.title} by ${beat.producer.displayName} | Tape Garden`,
    description: `Listen and purchase ${beat.title} by ${beat.producer.displayName}. ${beat.bpm} BPM, Key: ${beat.key}`,
  };
}

export default async function BeatDetailPage({ params }: BeatPageProps) {
  const resolvedParams = await params;
  const beat = await getBeatById(resolvedParams.beatId);

  if (!beat) {
    notFound();
  }

  return <BeatDetailClient beat={beat} />;
}
