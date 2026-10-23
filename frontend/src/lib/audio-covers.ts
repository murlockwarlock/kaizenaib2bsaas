export const AUDIO_COVER_PATHS = [
  '/examples/audio/music.svg',
  '/examples/audio/sfx.svg',
  '/examples/audio/voice.svg',
  '/examples/audio/dialogue.svg',
  '/examples/audio/podcast.svg',
] as const;

export function getAudioCover(index: number) {
  const safeIndex = Math.abs(index) % AUDIO_COVER_PATHS.length;
  return AUDIO_COVER_PATHS[safeIndex];
}
