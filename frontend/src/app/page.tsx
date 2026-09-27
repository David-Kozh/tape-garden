"use client";

import { useState } from "react";
import { CassetteTape, ArrowRight, Radio, Volume2 } from "lucide-react";

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
    <div className="relative min-h-screen text-zinc-900 selection:bg-emerald-500/20 selection:text-emerald-900 flex flex-col justify-between overflow-x-hidden font-inter antialiased">

      {/* Main Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full flex flex-col justify-center gap-16 relative z-10">

        {/* Hero Copy */}
        <div className="max-w-2xl flex flex-col gap-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-300/50 border border-emerald-500/20 text-emerald-700 text-xs font-semibold w-fit">
            <Radio className="w-3 h-3 animate-pulse" />
            Now In Scaffolding Phase
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Curated Beats.<br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              Boutique Sound Packs.
            </span>
          </h1>

          <p className="text-base md:text-lg text-zinc-600 leading-relaxed font-normal">
            An intentional, unhurried space designed for music producers and sound curators.
            No aggressive call-to-actions, no noisy storefronts. Just rare warmth, analog depth,
            and pure artistic craft.
          </p>
        </div>

        {/* Minimal Curator Section */}
        <div id="explore" className="flex flex-col gap-8">
          <div className="flex justify-between items-end border-b border-zinc-300 pb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Curator&apos;s Bench</h2>
              <p className="text-xs text-zinc-500 mt-1">Sneak peek at upcoming releases currently being finalized.</p>
            </div>
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
      <footer className="border-t border-zinc-300/60 px-6 py-8 md:px-12 text-zinc-500 text-xs flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
        <div className="flex items-center gap-2">
          <CassetteTape className="w-3.5 h-3.5 text-emerald-600/60" />
          <span>&copy; {new Date().getFullYear()} Tape Garden. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
