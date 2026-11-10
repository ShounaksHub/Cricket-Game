'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

export interface AudioTrack {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  durationApprox?: string;
}

export const SOUNDTRACK_PLAYLIST: AudioTrack[] = [
  {
    id: 'dil-jashn-bole',
    title: 'Dil Jashn Bole',
    subtitle: 'ICC CWC 2023 Anthem',
    src: '/audio/dil-jashn-bole.mp3',
  },
  {
    id: 'de-ghuma-ke',
    title: 'De Ghuma Ke',
    subtitle: 'ICC CWC 2011 Theme • Shankar-Ehsaan-Loy',
    src: '/audio/de-ghuma-ke.mp3',
  },
  {
    id: 'csk-anthem',
    title: 'CSK Anthem',
    subtitle: 'Chennai Super Kings • Whistle Podu',
    src: '/audio/csk-anthem.mp3',
  },
  {
    id: 'rcb-anthem',
    title: 'RCB Anthem',
    subtitle: 'Royal Challengers Bengaluru • Play Bold',
    src: '/audio/rcb-anthem.mp3',
  },
  {
    id: 'mi-anthem',
    title: 'MI Anthem',
    subtitle: 'Mumbai Indians • Duniya Hila Denge',
    src: '/audio/mi-anthem.mp3',
  },
  {
    id: 'kkr-anthem',
    title: 'KKR Anthem',
    subtitle: 'Kolkata Knight Riders • Korbo Lorbo Jeetbo',
    src: '/audio/kkr-anthem.mp3',
  },
  {
    id: 'char-chooka',
    title: 'Char Chooka',
    subtitle: 'Cricket Stadium Anthem',
    src: '/audio/char-chooka.mp3',
  },
  {
    id: 'bobs-beat',
    title: "Bob's Beat",
    subtitle: 'WDL • High-Octane Arena Electro',
    src: '/audio/bobs-beat.mp3',
  },
];

interface AudioContextType {
  isPlaying: boolean;
  isMuted: boolean;
  currentTrackIndex: number;
  currentTrack: AudioTrack;
  volume: number;
  hasEnteredArena: boolean;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectTrack: (index: number) => void;
  setVolume: (vol: number) => void;
  enterArena: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

const STORAGE_KEY_ENTERED = 'CRICKET_DREAM_XI_ARENA_ENTERED';
const STORAGE_KEY_MUTED = 'CRICKET_DREAM_XI_AUDIO_MUTED';
const STORAGE_KEY_VOLUME = 'CRICKET_DREAM_XI_AUDIO_VOLUME';
const STORAGE_KEY_TRACK = 'CRICKET_DREAM_XI_AUDIO_TRACK';

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.4);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [hasEnteredArena, setHasEnteredArena] = useState(false);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = SOUNDTRACK_PLAYLIST[currentTrackIndex] || SOUNDTRACK_PLAYLIST[0];

  // Initialize from localStorage and prepare audio element
  useEffect(() => {
    setIsClientLoaded(true);

    const savedEntered = localStorage.getItem(STORAGE_KEY_ENTERED);
    if (savedEntered === 'true') {
      setHasEnteredArena(true);
    }

    const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
    if (savedMuted === 'true') {
      setIsMuted(true);
    }

    const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVol) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        setVolumeState(parsed);
      }
    }

    const savedTrack = localStorage.getItem(STORAGE_KEY_TRACK);
    if (savedTrack) {
      const idx = parseInt(savedTrack, 10);
      if (!isNaN(idx) && idx >= 0 && idx < SOUNDTRACK_PLAYLIST.length) {
        setCurrentTrackIndex(idx);
      }
    }

    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // Sync audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = SOUNDTRACK_PLAYLIST[currentTrackIndex];
    if (!track) return;

    const wasPlaying = isPlaying;
    audio.src = track.src;
    audio.loop = false; // We manage loop via onended to auto-cycle playlist or repeat
    audio.volume = isMuted ? 0 : volume;

    // Auto advance to next track on end (continuous loop through playlist)
    audio.onended = () => {
      setCurrentTrackIndex((prev) => {
        const next = (prev + 1) % SOUNDTRACK_PLAYLIST.length;
        localStorage.setItem(STORAGE_KEY_TRACK, String(next));
        return next;
      });
    };

    if ((wasPlaying || hasEnteredArena) && !isMuted) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error playing track:', track.title, err);
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex]);

  // Sync mute & volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [isMuted, volume]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (!audio.src || audio.src === '') {
        audio.src = SOUNDTRACK_PLAYLIST[currentTrackIndex].src;
      }
      audio.volume = isMuted ? 0 : volume;
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('Audio play request blocked by browser policy:', err);
      setIsPlaying(false);
    }
  }, [currentTrackIndex, isMuted, volume]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_MUTED, String(next));
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => {
      const next = (prev + 1) % SOUNDTRACK_PLAYLIST.length;
      localStorage.setItem(STORAGE_KEY_TRACK, String(next));
      return next;
    });
  }, []);

  const prevTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => {
      const next = (prev - 1 + SOUNDTRACK_PLAYLIST.length) % SOUNDTRACK_PLAYLIST.length;
      localStorage.setItem(STORAGE_KEY_TRACK, String(next));
      return next;
    });
  }, []);

  const selectTrack = useCallback((index: number) => {
    if (index >= 0 && index < SOUNDTRACK_PLAYLIST.length) {
      setCurrentTrackIndex(index);
      localStorage.setItem(STORAGE_KEY_TRACK, String(index));
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
  }, []);

  // Enter Arena handler: user gesture unlocks browser AudioContext
  const enterArena = useCallback(async () => {
    setHasEnteredArena(true);
    localStorage.setItem(STORAGE_KEY_ENTERED, 'true');
    const audio = audioRef.current;
    if (audio) {
      try {
        if (!audio.src) {
          audio.src = SOUNDTRACK_PLAYLIST[currentTrackIndex].src;
        }
        audio.volume = isMuted ? 0 : volume;
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback error after user enter gesture:', err);
      }
    }
  }, [currentTrackIndex, isMuted, volume]);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        isMuted,
        currentTrackIndex,
        currentTrack,
        volume,
        hasEnteredArena,
        play,
        pause,
        togglePlay,
        toggleMute,
        nextTrack,
        prevTrack,
        selectTrack,
        setVolume,
        enterArena,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}

