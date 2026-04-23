import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

interface ExtractedName {
  name: string;
  gender: 'male' | 'female' | 'neutral';
}

interface EnrichedName {
  name: string;
  gender: string;
  origin: string;
  meaning: string;
  phonetic: string;
}

const EXTRACTED_PATH = path.join(__dirname, '../data/names-extracted.json');
const OUTPUT_PATH = path.join(__dirname, '../data/names.json');
const BATCH_SIZE = 50;
const MODEL = 'claude-sonnet-4-6';
const MAX_RETRIES = 3;

function loadExtractedNames(): ExtractedName[] {
  if (!fs.existsSync(EXTRACTED_PATH)) {
    console.error(`Error: Extracted names not found at ${EXTRACTED_PATH}`);
    console.error('Run "npm run extract-names" first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(EXTRACTED_PATH, 'utf-8'));
}

function loadExistingNames(): Map<string, EnrichedName> {
  const map = new Map<string, EnrichedName>();
  if (fs.existsSync(OUTPUT_PATH)) {
    const existing: EnrichedName[] = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    for (const name of existing) {
      map.set(name.name, name);
    }
  }
  return map;
}

function saveNames(names: EnrichedName[]) {
  const sorted = [...names].sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2));
}

function buildPrompt(names: ExtractedName[]): string {
  const nameList = names.map((n) => `- ${n.name} (${n.gender})`).join('\n');

  return `You are a baby name expert. For each name below, provide:
1. "origin": The cultural or etymological origin (e.g., "Hebrew", "Latin", "Korean", "Yoruba", "Sanskrit"). Be specific — use the most accurate cultural origin, not broad categories.
2. "meaning": 2-3 sentences covering the etymology and cultural/historical context. Include the literal meaning and any notable associations. Write in a warm, informative tone suitable for expectant parents.
3. "phonetic": A simple pronunciation guide using capitalized syllables with emphasis marked (e.g., "EM-ah", "LEE-um", "ah-LEE-see-ah").

Return a JSON array. Each element must have exactly these fields: "name", "origin", "meaning", "phonetic". Keep the exact name spelling provided.

Names:
${nameList}

Return ONLY the JSON array, no other text.`;
}

function validateEntry(entry: unknown): entry is { name: string; origin: string; meaning: string; phonetic: string } {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.name === 'string' &&
    typeof e.origin === 'string' &&
    typeof e.meaning === 'string' &&
    typeof e.phonetic === 'string' &&
    e.name.length > 0 &&
    e.origin.length > 0 &&
    e.meaning.length > 0 &&
    e.phonetic.length > 0
  );
}

async function enrichBatch(
  client: Anthropic,
  batch: ExtractedName[],
  attempt: number = 1,
): Promise<EnrichedName[]> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: buildPrompt(batch) }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON array from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed: unknown[] = JSON.parse(jsonMatch[0]);
    const results: EnrichedName[] = [];

    for (const entry of parsed) {
      if (validateEntry(entry)) {
        // Find the original extracted name to get the gender
        const original = batch.find((b) => b.name === entry.name);
        if (original) {
          results.push({
            name: entry.name,
            gender: original.gender,
            origin: entry.origin,
            meaning: entry.meaning,
            phonetic: entry.phonetic,
          });
        }
      } else {
        console.warn(`  Warning: Invalid entry skipped: ${JSON.stringify(entry)}`);
      }
    }

    return results;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`  Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return enrichBatch(client, batch, attempt + 1);
    }
    throw error;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Get an API key at https://console.anthropic.com');
    console.error('Then run: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const client = new Anthropic();
  const extracted = loadExtractedNames();
  const existing = loadExistingNames();

  // Filter out already-enriched names
  const toEnrich = extracted.filter((n) => !existing.has(n.name));

  console.log(`Total extracted names: ${extracted.length}`);
  console.log(`Already enriched: ${existing.size}`);
  console.log(`Remaining to enrich: ${toEnrich.length}`);

  if (toEnrich.length === 0) {
    console.log('All names already enriched!');
    return;
  }

  // Collect all enriched names (existing + new)
  const allNames = new Map(existing);
  const totalBatches = Math.ceil(toEnrich.length / BATCH_SIZE);

  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const batch = toEnrich.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const enrichedSoFar = existing.size + i;

    console.log(
      `Batch ${batchNum}/${totalBatches} — ${enrichedSoFar}/${extracted.length} names enriched`,
    );

    try {
      const results = await enrichBatch(client, batch);
      for (const name of results) {
        allNames.set(name.name, name);
      }

      // Save after each batch for resumability
      saveNames(Array.from(allNames.values()));
      console.log(`  Enriched ${results.length}/${batch.length} names`);
    } catch (error) {
      console.error(`  Error on batch ${batchNum} after ${MAX_RETRIES} retries:`, error);
      console.error('  Progress saved. Re-run to resume.');
      process.exit(1);
    }
  }

  console.log(`\nEnrichment complete!`);
  console.log(`Total names in ${OUTPUT_PATH}: ${allNames.size}`);
}

main();
