"use client";

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
export interface PlayableAudioItem {
  id: string;
  title: string;
  producerId: string;
  producer: {
    uid: string;
    displayName: string;
    avatarUrl?: string;
  };
  audioPreviewUrl: string;
  coverArtUrl?: string;
  itemType: "beat" | "samplePack";
}

interface AudioContextType {
  currentTrack: PlayableAudioItem | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  play: (track: PlayableAudioItem) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (level: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayableAudioItem | null>(null);
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

  const play = (track: PlayableAudioItem) => {
    if (!audioRef.current) return;

    if (currentTrack?.id === track.id) {
      // If it's the same track, just resume
      if (audioRef.current.paused) {
        audioRef.current.play();
      }
      return;
    }

    // Load new track
    setCurrentTrack(track);
    audioRef.current.src = track.audioPreviewUrl;
    audioRef.current.play().catch(e => console.error("Error playing audio:", e));
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    
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
        currentTrack,
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
