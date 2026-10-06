import Link from "next/link";
import { CassetteTape, Flower2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CuratorBench } from "@/components/CuratorBench";
import { getRandomCuratedBeats } from "@/lib/services/gallery";
import { CuratorTrack } from "@/components/CuratorCard";

export default async function Home() {
  const curatedBeats = await getRandomCuratedBeats(2);
  
  // Format the real beats to match the CuratorTrack interface
  const formattedBeats: CuratorTrack[] = curatedBeats.map(beat => ({
    id: beat.id,
    title: beat.title,
    type: "Beat",
    tempo: `${beat.bpm} BPM`,
    tags: beat.tags?.slice(0, 3) || [],
    description: `Produced by ${beat.producer.displayName}. Curated specially for the Garden.`,
    coverArtUrl: beat.coverArtUrl,
  }));

  const defaultTracks: CuratorTrack[] = [
    {
      id: "subterranean",
      title: "Subterranean Textures",
      type: "Beat Pack",
      tempo: "84 BPM",
      tags: ["Ambient", "Lo-Fi", "Analog"],
      description: "Low-end focused textures with lush tape decay. Curated for deep listening.",
    },
    {
      id: "analog-haze",
      title: "Analog Haze",
      type: "Sample Pack",
      tempo: "",
      tags: ["Warmth", "Saturated", "Synth"],
      description: "Vintage synthesizer loops recorded direct-to-tape. Back Room exclusive.",
    },
  ];

  // Merge: Take all real curated beats, and if fewer than 2, fill the rest with defaultTracks
  const displayTracks = [...formattedBeats, ...defaultTracks].slice(0, 2);

  return (
    <div className="flex-1 w-full relative text-zinc-900 selection:bg-emerald-500/20 selection:text-emerald-900 flex flex-col justify-between overflow-x-hidden font-inter antialiased px-2 sm:px-4">

      {/* Main Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full flex flex-col justify-around gap-8 relative z-10 pt-4">

        {/* Hero Copy */}
        <div
          className="w-full flex flex-col gap-6 animate-fade-in relative p-8 md:p-12 lg:p-16 rounded-3xl overflow-hidden border border-zinc-200/50 shadow-sm"
        >
          <div
            className="absolute inset-0 z-0 opacity-90 pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: "url('/background.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
          />



          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-2 w-full">
            {/* Left Side Copy */}
            <div className="flex flex-col gap-8 max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                Curated Beats.<br />
                <span className="relative inline-block mt-1">
                  <div className="absolute inset-x-[-7%] top-[-20%] bottom-[-35%] bg-background opacity-60 blur-[40px] -z-10 rounded-full pointer-events-none" />
                  <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-600 bg-clip-text text-transparent relative z-10">
                    Grow Your Garden.
                  </span>
                </span>
              </h1>

              <div className="flex flex-col gap-8 p-6 md:p-8 rounded-2xl bg-gray-600/40 backdrop-blur-sm border border-white/30 shadow-sm max-w-2xl">
                <p className="text-base lg:text-lg text-white/90 leading-relaxed font-medium">
                  A deliberately minimal space designed for music producers to show their best work.
                  <span className="font-bold"> Storefronts</span> built like an <span className="italic">art-gallery</span>, not a marketplace -- no extra noise.
                </p>

                <div className="flex items-center gap-4">
                  <Link href="/beats" className={buttonVariants({ variant: "default", size: "lg", className: "!bg-emerald-600 !border-emerald-600 hover:!bg-emerald-800 hover:!border-emerald-400 text-white/90 rounded-md !px-8 shadow-md !font-bold !text-md" })}>
                    Browse
                  </Link>
                  <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg", className: "!border-emerald-300 !text-emerald-300 hover:!bg-emerald-800 hover:!text-white/90 rounded-md !px-8 !font-bold !text-md" })}>
                    Login
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side Tag */}
            <div className="order-first md:order-last inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-300/50 border border-emerald-500/20 text-emerald-700 text-xs lg:text-sm font-semibold whitespace-nowrap shrink-0 md:mt-3">
              <Flower2 className="w-4 h-4 animate-pulse" />
              Now Entering Alpha
            </div>
          </div>
        </div>

        {/* Minimal Curator Section extracted to Client Component */}
        <CuratorBench tracks={displayTracks} />

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-400/40 px-6 pt-4 pb-2 md:px-12 text-zinc-500 text-xs flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
        <div className="flex items-center gap-2">
          <CassetteTape className="w-4 h-4 text-emerald-600/60" />
          <span>&copy; {new Date().getFullYear()} Tape Garden. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
          <Link href="/apply" className="hover:text-zinc-900 transition-colors">Apply</Link>
          <a href="https://github.com/David-Kozh/tape-garden" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
