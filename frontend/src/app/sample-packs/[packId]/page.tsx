import { getSamplePackById } from "@/lib/services/samplePacks";
import { notFound } from "next/navigation";
import { SamplePackDetailClient } from "./SamplePackDetailClient";
import { Metadata } from "next";

interface SamplePackPageProps {
  params: Promise<{
    packId: string;
  }>;
}

export async function generateMetadata({ params }: SamplePackPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const pack = await getSamplePackById(resolvedParams.packId);

  if (!pack) {
    return {
      title: "Sample Pack Not Found | Tape Garden",
    };
  }

  return {
    title: `${pack.title} by ${pack.producer.displayName} | Tape Garden`,
    description: `Purchase ${pack.title} by ${pack.producer.displayName}. ${pack.description}`,
  };
}

export default async function SamplePackDetailPage({ params }: SamplePackPageProps) {
  const resolvedParams = await params;
  const pack = await getSamplePackById(resolvedParams.packId);

  if (!pack) {
    notFound();
  }

  return <SamplePackDetailClient pack={pack} />;
}
