"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, PackageOpen } from "lucide-react";
import { BeatUploadForm } from "./BeatUploadForm";
import { SamplePackUploadForm } from "./SamplePackUploadForm";

export default function NewUploadPage() {
  const [uploadType, setUploadType] = useState<"beat" | "samplePack" | null>(null);

  if (uploadType === "beat") {
    return <BeatUploadForm onCancel={() => setUploadType(null)} />;
  }

  if (uploadType === "samplePack") {
    return <SamplePackUploadForm onCancel={() => setUploadType(null)} />;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">What are you releasing?</h1>
        <p className="text-xl text-muted-foreground">
          Choose the type of asset you want to publish to the Tape Garden catalog.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <Card 
          className="group cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
          onClick={() => setUploadType("beat")}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Beat</CardTitle>
            <CardDescription className="text-base mt-2">
              Upload an instrumental track with stems. License it non-exclusively to buyers.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground text-center">
            Max 200MB archive size
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer hover:border-secondary/50 hover:bg-secondary/5 transition-all duration-300"
          onClick={() => setUploadType("samplePack")}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PackageOpen className="w-8 h-8 text-secondary" />
            </div>
            <CardTitle className="text-2xl">Sample Pack</CardTitle>
            <CardDescription className="text-base mt-2">
              Upload a collection of loops, one-shots, or presets. Sell it for a flat price.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground text-center">
            Max 500MB archive size
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
