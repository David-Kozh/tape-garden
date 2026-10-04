import { SamplePacksGalleryClient } from "@/components/SamplePacksGalleryClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Sample Packs Gallery | Tape Garden",
  description: "Discover and purchase high-quality sample packs from independent producers.",
};

export default function SamplePacksGalleryPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SamplePacksGalleryClient />
    </Suspense>
  );
}
