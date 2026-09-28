'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { PlayableTrack, PlayerState } from '@/types';

interface AudioContextValue extends PlayerState {
  play: (track?: PlayableTrack, queue?: PlayableTrack[], startIndex?: number) => void;
  pause: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  seekPercent: (percent: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setQueue: (tracks: PlayableTrack[], startIndex?: number) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
  return ctx;
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.5,
    isMuted: false,
  });

  // Previous volume before mute (to restore)
  const volumeBeforeMute = useRef(0.5);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.5;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      }));
    };

    const onLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration || 0,
      }));
    };

    const onEnded = () => {
      // Auto-advance to next track
      setState((prev) => {
        if (prev.queueIndex < prev.queue.length - 1) {
          const nextIndex = prev.queueIndex + 1;
          const nextTrack = prev.queue[nextIndex];
          audio.src = nextTrack.src;
          audio.play().catch(() => {});
          return {
            ...prev,
            currentTrack: nextTrack,
            queueIndex: nextIndex,
            isPlaying: true,
            currentTime: 0,
          };
        }
        return { ...prev, isPlaying: false, currentTime: 0 };
      });
    };

    const onPlay = () => setState((prev) => ({ ...prev, isPlaying: true }));
    const onPause = () => setState((prev) => ({ ...prev, isPlaying: false }));

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback((track?: PlayableTrack, queue?: PlayableTrack[], startIndex?: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (track) {
      audio.src = track.src;
      audio.play().catch(() => {});
      setState((prev) => ({
        ...prev,
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        queue: queue || prev.queue,
        queueIndex: startIndex ?? (queue ? queue.findIndex((t) => t.id === track.id) : prev.queueIndex),
      }));
    } else {
      audio.play().catch(() => {});
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setState((prev) => {
      if (prev.queueIndex < prev.queue.length - 1) {
        const nextIndex = prev.queueIndex + 1;
        const nextTrack = prev.queue[nextIndex];
        audio.src = nextTrack.src;
        audio.play().catch(() => {});
        return {
          ...prev,
          currentTrack: nextTrack,
          queueIndex: nextIndex,
          isPlaying: true,
          currentTime: 0,
        };
      }
      return prev;
    });
  }, []);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setState((prev) => {
      if (prev.queueIndex > 0) {
        const prevIndex = prev.queueIndex - 1;
        const prevTrack = prev.queue[prevIndex];
        audio.src = prevTrack.src;
        audio.play().catch(() => {});
        return {
          ...prev,
          currentTrack: prevTrack,
          queueIndex: prevIndex,
          isPlaying: true,
          currentTime: 0,
        };
      }
      // If at start, restart current track
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return prev;
    });
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(Math.max(0, time), audio.duration);
  }, []);

  const seekPercent = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = percent * audio.duration;
  }, []);

  const setVolume = useCallback((vol: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.min(Math.max(0, vol), 1);
    audio.volume = clamped;
    setState((prev) => ({ ...prev, volume: clamped, isMuted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setState((prev) => {
      if (prev.isMuted) {
        const restored = volumeBeforeMute.current || 0.5;
        audio.volume = restored;
        return { ...prev, volume: restored, isMuted: false };
      } else {
        volumeBeforeMute.current = prev.volume;
        audio.volume = 0;
        return { ...prev, volume: 0, isMuted: true };
      }
    });
  }, []);

  const setQueue = useCallback((tracks: PlayableTrack[], startIndex?: number) => {
    setState((prev) => ({
      ...prev,
      queue: tracks,
      queueIndex: startIndex ?? 0,
    }));
  }, []);

  const value: AudioContextValue = {
    ...state,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    seek,
    seekPercent,
    setVolume,
    toggleMute,
    setQueue,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}
