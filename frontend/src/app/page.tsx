"use client";

import { useState } from "react";
import { CassetteTape, ArrowRight, Radio, Volume2, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, role, loading, logout } = useAuth();
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
    <div className="relative min-h-screen bg-[#08080a] text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300 flex flex-col justify-between overflow-x-hidden font-sans antialiased">
      
      {/* Dynamic Ambient Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] aspect-square rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[50%] aspect-square rounded-full bg-blue-950/10 blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-zinc-900/50 bg-[#08080a]/60 px-6 py-4 md:px-12 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-500/20 group-hover:scale-105">
            <CassetteTape className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent group-hover:from-white group-hover:to-zinc-200">
            Tape Garden
          </span>
        </div>
        
        <nav className="flex items-center gap-6">
          <a href="#explore" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
            Explore
          </a>
          <a href="#backroom" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400/80" />
            Back Room
          </a>
          
          <div className="h-4 w-[1px] bg-zinc-800/80" />
          
          {loading ? (
            <div className="w-12 h-4 bg-zinc-900 animate-pulse rounded" />
          ) : user ? (
            <div className="flex items-center gap-5">
              {role === "admin" && (
                <Link href="/admin" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                  Admin
                </Link>
              )}
              {role === "producer" && (
                <Link href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                  Dashboard
                </Link>
              )}
              {role === "buyer" && (
                <Link href="/purchases" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                  My Purchases
                </Link>
              )}
              <button 
                onClick={logout}
                className="text-xs font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link 
              href="/login" 
              className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              Enter
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </nav>
      </header>

      {/* Main Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 md:py-32 w-full flex flex-col justify-center gap-16 relative z-10">
        
        {/* Hero Copy */}
        <div className="max-w-2xl flex flex-col gap-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-fit">
            <Radio className="w-3 h-3 animate-pulse" />
            Now In Scaffolding Phase
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Curated Beats.<br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
              Boutique Sound Packs.
            </span>
          </h1>
          
          <p className="text-base md:text-lg text-zinc-400 leading-relaxed font-normal">
            An intentional, unhurried space designed for music producers and sound curators. 
            No aggressive call-to-actions, no noisy storefronts. Just rare warmth, analog depth, 
            and pure artistic craft.
          </p>
        </div>

        {/* Minimal Curator Section */}
        <div id="explore" className="flex flex-col gap-8">
          <div className="flex justify-between items-end border-b border-zinc-900 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Curator&apos;s Bench</h2>
              <p className="text-xs text-zinc-500 mt-1">Sneak peek at upcoming releases currently being finalized.</p>
            </div>
            <span className="text-xs text-emerald-400/60 font-semibold tracking-wider uppercase">02 releases</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tracks.map((track) => (
              <div 
                key={track.id}
                className="group relative rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 md:p-8 flex flex-col justify-between gap-6 hover:border-zinc-800/80 hover:bg-zinc-950/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
              >
                {/* Background Hover Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/0 via-emerald-500/0 to-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-emerald-400/80 font-mono tracking-wider bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                      {track.type}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">{track.tempo}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                    {track.title}
                  </h3>

                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {track.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2">
                    {track.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] text-zinc-500 font-medium px-2 py-0.5 rounded-full bg-zinc-900">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button 
                    onClick={() => setActivePlay(activePlay === track.id ? null : track.id)}
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-colors duration-200 cursor-pointer"
                  >
                    {activePlay === track.id ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
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
      <footer className="border-t border-zinc-900/60 bg-[#060608] px-6 py-8 md:px-12 text-zinc-500 text-xs flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
        <div className="flex items-center gap-2">
          <CassetteTape className="w-3.5 h-3.5 text-emerald-500/60" />
          <span>&copy; {new Date().getFullYear()} Tape Garden. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
