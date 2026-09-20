export type Gender = 'male' | 'female' | 'neutral';

export interface AdName {
  name: string;
  gender: Gender;
  origin: string;
  /** Current SSA rank, read from production on 2026-09-19. */
  rank: number;
}

/**
 * Real rows from production. Do not invent names or ranks; the cards are
 * meant to be accurate. Verified 2026-09-19 against the `names` table.
 */
export const CAST = {
  olivia: { name: 'Olivia', gender: 'female', origin: 'Latin', rank: 1 },
  otto: { name: 'Otto', gender: 'male', origin: 'Germanic', rank: 282 },
  juniper: { name: 'Juniper', gender: 'female', origin: 'Latin', rank: 113 },
  wren: { name: 'Wren', gender: 'neutral', origin: 'English', rank: 195 },
  esme: { name: 'Esme', gender: 'female', origin: 'French', rank: 325 },
} as const satisfies Record<string, AdName>;

/** The shape a variant must supply to swap the cast. */
export type Cast = Record<keyof typeof CAST, AdName>;
