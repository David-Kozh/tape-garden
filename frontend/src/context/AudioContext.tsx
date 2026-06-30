"use client";

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { BeatWithProducer } from "@/lib/services/gallery";

interface AudioContextType {
  currentBeat: BeatWithProducer | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  play: (beat: BeatWithProducer) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (level: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentBeat, setCurrentBeat] = useState<BeatWithProducer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
      
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => {
        setProgress(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.pause();
        audio.src = "";
      };
    }
  }, []);

  const play = (beat: BeatWithProducer) => {
    if (!audioRef.current) return;

    if (currentBeat?.id === beat.id) {
      // If it's the same beat, just resume
      if (audioRef.current.paused) {
        audioRef.current.play();
      }
      return;
    }

    // Load new beat
    setCurrentBeat(beat);
    audioRef.current.src = beat.audioPreviewUrl;
    audioRef.current.play().catch(e => console.error("Error playing audio:", e));
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentBeat) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const setVolume = (level: number) => {
    if (audioRef.current) {
      audioRef.current.volume = level;
      setVolumeState(level);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentBeat,
        isPlaying,
        progress,
        duration,
        volume,
        play,
        togglePlayPause,
        seek,
        setVolume,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
