export type VoiceOption = {
  value: string;
  label: string;
};

export type AudioModel = {
  id: string;
  name: string;
  type: 'text-to-speech' | 'text-to-dialogue';
};

export type SunoDescKey = 'suno_v5_desc' | 'suno_v45plus_desc' | 'suno_v45_desc' | 'suno_v4_desc';

export type SunoModel = {
  id: string;
  name: string;
  descKey: SunoDescKey;
};

export type DialogueLine = {
  voice: string;
  text: string;
};

export const AUDIO_MODELS: AudioModel[] = [
  { id: 'elevenlabs/text-to-speech-turbo-2-5', name: 'ElevenLabs Turbo 2.5', type: 'text-to-speech' },
  { id: 'elevenlabs/text-to-speech-multilingual-v2', name: 'ElevenLabs Multilingual V2', type: 'text-to-speech' },
  { id: 'elevenlabs/text-to-dialogue-v3', name: 'ElevenLabs Dialogue V3', type: 'text-to-dialogue' },
];

export const SUNO_MODEL_IDS: SunoModel[] = [
  { id: 'suno/V5', name: 'Suno V5', descKey: 'suno_v5_desc' },
  { id: 'suno/V4_5PLUS', name: 'Suno V4.5+', descKey: 'suno_v45plus_desc' },
  { id: 'suno/V4_5', name: 'Suno V4.5', descKey: 'suno_v45_desc' },
  { id: 'suno/V4', name: 'Suno V4', descKey: 'suno_v4_desc' },
];

export const VOICES: VoiceOption[] = [
  { value: 'Roger', label: 'Roger · Narrator' },
  { value: 'Sarah', label: 'Sarah · Clear female' },
  { value: 'Brian', label: 'Brian · Deep male' },
  { value: 'Lily', label: 'Lily · Soft female' },
  { value: 'Charlie', label: 'Charlie · Youthful' },
  { value: 'Jessica', label: 'Jessica · Bright female' },
  { value: 'Will', label: 'Will · Warm male' },
  { value: 'River', label: 'River · Balanced neutral' },
];

export const DEFAULT_DIALOGUE: DialogueLine[] = [{ voice: VOICES[0].value, text: '' }];
