import Link from "next/link";
import Image from "next/image";
import { CassetteTape, Flower2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CuratorBench } from "@/components/CuratorBench";
import { getRandomCuratedItems, CuratedCatalogItem } from "@/lib/services/gallery";
import { CatalogItem } from "@/components/ItemCard";
import heroBackground from "../../public/background.jpg";

export const dynamic = "force-dynamic";

export default async function Home() {
  let curatedItems: CuratedCatalogItem[] = [];
  try {
    curatedItems = await getRandomCuratedItems(2);
  } catch (error) {
    console.error("Error fetching curated items:", error);
  }

  const defaultTracks: CatalogItem[] = [
    {
      id: "subterranean",
      itemType: "beat",
      producerId: "default",
      title: "Subterranean Textures",
      bpm: 84,
      key: "C Min",
      tags: ["Ambient", "Lo-Fi", "Analog"],
      status: "published",
      createdAt: "",
      updatedAt: "",
      audioPreviewUrl: "",
      licenses: [{ type: "non-exclusive", price: 29.99 }],
      producer: {
        uid: "default",
        displayName: "Tape Garden",
      },
    },
    {
      id: "analog-haze",
      itemType: "samplePack",
      producerId: "default",
      title: "Analog Haze",
      description: "Vintage synthesizer loops recorded direct-to-tape.",
      tags: ["Warmth", "Saturated", "Synth"],
      price: 24.99,
      status: "published",
      createdAt: "",
      updatedAt: "",
      audioPreviewUrl: "",
      producer: {
        uid: "default",
        displayName: "Tape Garden",
      },
    },
  ];

  // Merge: Take all real curated items, and if fewer than 2, fill the rest with defaultTracks
  const displayTracks: CatalogItem[] = [...curatedItems, ...defaultTracks].slice(0, 2);

  return (
    <div className="flex-1 w-full relative text-zinc-900 selection:bg-emerald-500/20 selection:text-emerald-900 flex flex-col justify-between overflow-x-hidden antialiased md:px-4">

      {/* Main Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full flex flex-col gap-8 relative z-10 md:pt-4">

        {/* Hero Copy */}
        <div
          className="w-full flex flex-col gap-6 relative p-4 md:p-12 lg:p-16 md:rounded-3xl overflow-hidden border-b md:border border-zinc-200/50 shadow-sm bg-background"
        >
          <Image
            src={heroBackground}
            alt=""
            fill
            preload
            fetchPriority="high"
            decoding="sync"
            placeholder="blur"
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover object-center opacity-90 pointer-events-none z-0"
          />



          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-2 w-full">
            {/* Left Side Copy */}
            <div className="flex flex-col gap-8 max-w-3xl">
              <h1 className="mt-2 text-3xl sm:text-4xl md:text-6xl font-lexend font-bold tracking-tight text-brand-black leading-none">
                Curated Beats.<br />
                <span className="relative inline-block mt-2">
                  <div className="absolute inset-x-[-7%] top-[-20%] bottom-[-35%] bg-background dark:bg-brand-white opacity-60 blur-[40px] -z-10 rounded-full pointer-events-none" />
                  <span className="bg-gradient-to-r from-leaf-700 via-leaf-950 to-lilac-950 bg-clip-text text-transparent relative z-10">
                    Grow Your Garden.
                  </span>
                </span>
              </h1>

              <div className="flex flex-col gap-8 p-6 md:p-8 mb-2 rounded-2xl bg-graphite-600/50 backdrop-blur-sm border border-white/30 shadow-sm max-w-2xl">
                <p className="text-base lg:text-lg text-brand-white leading-relaxed tracking-wide">
                  A deliberately minimal space designed for music producers to show their best work.<br />Buy and sell beats without the extra noise.
                </p>

                <div className="flex items-center gap-4">
                  <Link href="/gallery" className={buttonVariants({ variant: "default", size: "lg", className: "!bg-leaf-500 !border-leaf-500 hover:!bg-leaf-800 hover:!border-leaf-400 text-white/90 rounded-md !px-8 shadow-md !font-bold !text-md" })}>
                    Browse
                  </Link>
                  <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg", className: "!border-lilac-400 !text-lilac-400 hover:!bg-lilac-800 hover:!text-white/90 rounded-md !px-8 !font-bold !text-md" })}>
                    Login
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side Tag */}
            <div className="order-first md:order-last inline-flex items-center gap-2 px-3 py-1 rounded-full bg-leaf-300/50 border border-leaf-500/20 text-leaf-800 text-xs lg:text-sm font-semibold whitespace-nowrap shrink-0 md:mt-3">
              <Flower2 className="w-4 h-4 animate-pulse" />
              Now Entering Beta
            </div>
          </div>
        </div>

        {/* Minimal Curator Section extracted to Client Component */}
        <CuratorBench tracks={displayTracks} />

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-400/40 px-6 pt-4 pb-2 md:px-12 text-zinc-500 text-xs flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
        <div className="flex items-center gap-2">
          <CassetteTape className="w-5 h-5 text-leaf-600/60" />
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
