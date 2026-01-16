// Sound utility for playing audio effects

// Cache audio instances to avoid re-creating them
const audioCache = new Map<string, HTMLAudioElement>();

/**
 * Play a sound effect from the given URL
 * @param soundUrl - The URL or path to the sound file
 * @param volume - Volume level from 0 to 1 (default: 1)
 */
export const playSound = (soundUrl: string, volume = 1): void => {
  try {
    let audio = audioCache.get(soundUrl);

    if (!audio) {
      audio = new Audio(soundUrl);
      audioCache.set(soundUrl, audio);
    }

    // Reset to start if already playing
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));

    audio.play().catch((error) => {
      // Ignore autoplay restrictions or other playback errors
      console.warn('Failed to play sound:', error);
    });
  } catch (error) {
    console.warn('Error creating audio:', error);
  }
};

/**
 * Preload a sound file for faster playback
 * @param soundUrl - The URL or path to the sound file
 */
export const preloadSound = (soundUrl: string): void => {
  if (!audioCache.has(soundUrl)) {
    const audio = new Audio(soundUrl);
    audio.preload = 'auto';
    audioCache.set(soundUrl, audio);
  }
};
