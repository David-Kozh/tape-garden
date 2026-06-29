import { BeatsGalleryClient } from "@/components/BeatsGalleryClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Beats Gallery | Tape Garden",
  description: "Discover and purchase high-quality beats from independent producers.",
};

export default function BeatsGalleryPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <BeatsGalleryClient />
    </Suspense>
  );
}
