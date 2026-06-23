import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_PATH = path.join(__dirname, '../data/celebrity-names.json');
const MODEL = 'claude-sonnet-4-6';
const MAX_RETRIES = 3;

interface CelebEntry {
  name: string;
  note: string;
}

const PROMPT = `You are a baby-name expert compiling first names with a STRONG, widely-recognized
celebrity association — names most people would immediately connect to a famous person.

Include two kinds:
1. Names of famous people themselves (e.g., "Zendaya", "Idris", "Beyonce", "Adele").
2. Notable celebrity baby names (e.g., "North", "Saint", "Stormi", "Apple").

Rules:
- Only include a name if the association is widely recognized — omit weak or generic links.
- A "note" is a short attribution, e.g. "Zendaya, actress" or "North West, daughter of Kim Kardashian".
- Use the most common spelling of the first name only (no surnames in the "name" field).
- Return a JSON array of objects with exactly two string fields: "name" and "note".

Return ONLY the JSON array, no other text. Aim for a few hundred high-confidence entries.`;

async function callOnce(client: Anthropic, attempt = 1): Promise<CelebEntry[]> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: PROMPT }],
    });
    const block = response.content[0];
    const text = block?.type === 'text' ? block.text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response');
    const parsed: unknown[] = JSON.parse(match[0]);
    const out: CelebEntry[] = [];
    for (const e of parsed) {
      if (
        e &&
        typeof e === 'object' &&
        typeof (e as any).name === 'string' &&
        typeof (e as any).note === 'string' &&
        (e as any).name.length > 0 &&
        (e as any).note.length > 0
      ) {
        out.push({ name: (e as any).name.trim(), note: (e as any).note.trim() });
      }
    }
    return out;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      return callOnce(client, attempt + 1);
    }
    throw error;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }
  const client = new Anthropic();
  const entries = await callOnce(client);
  // De-dupe by name (keep first note).
  const byName = new Map<string, CelebEntry>();
  for (const e of entries) if (!byName.has(e.name)) byName.set(e.name, e);
  const sorted = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2));
  console.log(`Wrote ${sorted.length} celebrity entries to ${OUTPUT_PATH}.`);
  console.log('Review/spot-check this file before running apply:celebrity-tags.');
}

main();
