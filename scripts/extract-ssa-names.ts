import * as fs from 'fs';
import * as path from 'path';

interface NameCandidate {
  name: string;
  gender: 'male' | 'female' | 'neutral';
}

const SSA_DIR = path.join(__dirname, '../data/ssa-raw');
const OUTPUT_PATH = path.join(__dirname, '../data/names-extracted.json');
const MIN_YEAR = 1950;
const MAX_YEAR = 2023;
const TOP_N = 2000;

function extractNames() {
  if (!fs.existsSync(SSA_DIR)) {
    console.error(`Error: SSA data directory not found at ${SSA_DIR}`);
    console.error('Please download the SSA names data from:');
    console.error('  https://www.ssa.gov/oact/babynames/names.zip');
    console.error('Extract the contents to data/ssa-raw/');
    process.exit(1);
  }

  // Track best rank per name per gender across all qualifying years
  // Key: "Name-M" or "Name-F", Value: best (lowest) rank
  const bestRank = new Map<string, number>();

  for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
    const filePath = path.join(SSA_DIR, `yob${year}.txt`);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: File not found for year ${year}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    // Group by gender to calculate ranks within each gender
    const maleEntries: string[] = [];
    const femaleEntries: string[] = [];

    for (const line of lines) {
      const [name, gender] = line.split(',');
      if (gender === 'M') maleEntries.push(name);
      else if (gender === 'F') femaleEntries.push(name);
    }

    // SSA files are already sorted by count descending within each gender,
    // so position in the array = rank
    for (let i = 0; i < Math.min(maleEntries.length, TOP_N); i++) {
      const key = `${maleEntries[i]}-M`;
      const rank = i + 1;
      const current = bestRank.get(key);
      if (current === undefined || rank < current) {
        bestRank.set(key, rank);
      }
    }

    for (let i = 0; i < Math.min(femaleEntries.length, TOP_N); i++) {
      const key = `${femaleEntries[i]}-F`;
      const rank = i + 1;
      const current = bestRank.get(key);
      if (current === undefined || rank < current) {
        bestRank.set(key, rank);
      }
    }

    if (year % 10 === 0) {
      console.log(`Processed year ${year}...`);
    }
  }

  // Determine gender for each unique name
  const nameGenders = new Map<string, Set<string>>();
  for (const key of bestRank.keys()) {
    const lastDash = key.lastIndexOf('-');
    const name = key.substring(0, lastDash);
    const gender = key.substring(lastDash + 1);
    if (!nameGenders.has(name)) {
      nameGenders.set(name, new Set());
    }
    nameGenders.get(name)!.add(gender);
  }

  const candidates: NameCandidate[] = [];
  for (const [name, genders] of nameGenders) {
    let gender: 'male' | 'female' | 'neutral';
    if (genders.has('M') && genders.has('F')) {
      gender = 'neutral';
    } else if (genders.has('M')) {
      gender = 'male';
    } else {
      gender = 'female';
    }
    candidates.push({ name, gender });
  }

  // Sort alphabetically for stable output
  candidates.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(candidates, null, 2));

  const genderCounts = { male: 0, female: 0, neutral: 0 };
  for (const c of candidates) genderCounts[c.gender]++;

  console.log(`\nExtraction complete!`);
  console.log(`Total names: ${candidates.length}`);
  console.log(`  Male: ${genderCounts.male}`);
  console.log(`  Female: ${genderCounts.female}`);
  console.log(`  Neutral: ${genderCounts.neutral}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

extractNames();
