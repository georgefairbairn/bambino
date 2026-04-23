export type SkinToneKey =
  | 'default'
  | 'light'
  | 'medium-light'
  | 'medium'
  | 'medium-dark'
  | 'dark';

export const SKIN_TONE_OPTIONS: {
  key: SkinToneKey;
  modifier: string;
}[] = [
  { key: 'default', modifier: '' },
  { key: 'light', modifier: '\u{1F3FB}' },
  { key: 'medium-light', modifier: '\u{1F3FC}' },
  { key: 'medium', modifier: '\u{1F3FD}' },
  { key: 'medium-dark', modifier: '\u{1F3FE}' },
  { key: 'dark', modifier: '\u{1F3FF}' },
];

export const VALID_SKIN_TONES: SkinToneKey[] = SKIN_TONE_OPTIONS.map((o) => o.key);

const BASE_EMOJIS: Record<string, string> = {
  male: '\u{1F466}',
  boy: '\u{1F466}',
  female: '\u{1F467}',
  girl: '\u{1F467}',
};

const NEUTRAL_EMOJI = '\u{1F476}';

const modifierMap = Object.fromEntries(SKIN_TONE_OPTIONS.map((o) => [o.key, o.modifier]));

export function getGenderEmoji(gender: string, skinTone: SkinToneKey = 'default'): string {
  const base = BASE_EMOJIS[gender] ?? NEUTRAL_EMOJI;
  return base + (modifierMap[skinTone] ?? '');
}
