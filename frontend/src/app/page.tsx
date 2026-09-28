"use client";

import { useState } from "react";
import Link from "next/link";
import { CassetteTape, ArrowRight, Flower2, Volume2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  const [activePlay, setActivePlay] = useState<string | null>(null);

  const tracks = [
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
      tempo: "92 BPM",
      tags: ["Warmth", "Saturated", "Synth"],
      description: "Rare vintage synthesizer loops recorded direct-to-tape. Back Room exclusive.",
    },
  ];

  return (
    <div className="flex-1 w-full relative text-zinc-900 selection:bg-emerald-500/20 selection:text-emerald-900 flex flex-col justify-between overflow-x-hidden font-inter antialiased px-2">

      {/* Main Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full flex flex-col justify-around gap-16 relative z-10 pt-4">

        {/* Hero Copy */}
        <div
          className="w-full flex flex-col gap-6 animate-fade-in relative p-8 md:p-12 lg:p-16 rounded-3xl overflow-hidden border border-zinc-200/50 shadow-sm"
        >
          <div
            className="absolute inset-0 z-0 opacity-75 pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: "url('/background.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
          />

          {/* Blurred Background Orbs for Legibility */}
          <div className="absolute -top-[10%] -left-[5%] w-[500px] h-[500px] bg-background blur-[50px] rounded-full z-[1] pointer-events-none opacity-25" />
          <div className="absolute top-[10%] left-[0%] w-[800px] h-[400px] bg-background blur-[50px] rounded-[100%] z-[1] pointer-events-none opacity-60" />
          <div className="absolute -bottom-[40%] left-[0%] w-[300px] h-[400px] bg-background blur-[60px] rounded-full z-[1] pointer-events-none opacity-25" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8 w-full">
            {/* Left Side Copy */}
            <div className="flex flex-col gap-8 max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                Curated Beats.<br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                  Grow Your Garden.
                </span>
              </h1>

              <p className="text-base md:text-lg text-zinc-600 leading-relaxed font-normal max-w-2xl">
                A deliberately minimal space designed for music producers to show their best work.
                Storefronts built like an art-gallery, not a marketplace -- no extra noise.
              </p>

              <div className="flex items-center gap-4 mt-2">
                <Link href="#" className={buttonVariants({ variant: "default", size: "lg", className: "!bg-emerald-700 !border-emerald-700 hover:!bg-emerald-600 hover:!border-emerald-600 text-white/90 rounded-md !px-8 shadow-md !font-bold !text-md" })}>
                  Browse
                </Link>
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg", className: "!border-emerald-600 !text-emerald-700 hover:!bg-emerald-600 hover:!text-white/90 rounded-md !px-8 !font-bold !text-md" })}>
                  Login
                </Link>
              </div>
            </div>

            {/* Right Side Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-300/50 border border-emerald-500/20 text-emerald-700 text-xs lg:text-sm font-semibold whitespace-nowrap shrink-0 md:mt-3">
              <Flower2 className="w-4 h-4 animate-pulse" />
              Now Entering Alpha
            </div>
          </div>
        </div>

        {/* Minimal Curator Section */}
        <div id="explore" className="flex flex-col gap-8 pb-6">
          <div className="flex justify-between items-end border-b border-zinc-400/80 pb-2">
            <h2 className="text-xl font-bold text-zinc-900">Curator&apos;s Bench</h2>
            <span className="text-xs text-emerald-600/80 font-semibold tracking-wider uppercase">02 releases</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="group relative rounded-2xl border border-zinc-200/80 bg-white/40 backdrop-blur-sm p-6 md:p-8 flex flex-col justify-between gap-6 hover:border-emerald-500/30 hover:bg-white/60 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                {/* Background Hover Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-emerald-700 font-mono tracking-wider bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-500/20">
                      {track.type}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">{track.tempo}</span>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                    {track.title}
                  </h3>

                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {track.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2">
                    {track.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] text-zinc-600 font-medium px-2 py-0.5 rounded-full bg-black/5 border border-black/5">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setActivePlay(activePlay === track.id ? null : track.id)}
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-emerald-700 transition-colors duration-200 cursor-pointer"
                  >
                    {activePlay === track.id ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                        Playing preview
                      </>
                    ) : (
                      <>
                        Preview sound
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-400/40 px-6 pt-6 md:px-12 text-zinc-500 text-xs flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
        <div className="flex items-center gap-2">
          <CassetteTape className="w-3.5 h-3.5 text-emerald-600/60" />
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
