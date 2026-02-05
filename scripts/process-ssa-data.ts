import * as fs from 'fs';
import * as path from 'path';

interface PopularityRecord {
  name: string;
  gender: string;
  year: number;
  rank: number;
  count: number;
}

interface NameEntry {
  name: string;
  gender: string;
}

// Load names from our database to filter SSA data
function loadNames(): Set<string> {
  const namesPath = path.join(__dirname, '../data/names.json');
  const namesData: NameEntry[] = JSON.parse(fs.readFileSync(namesPath, 'utf-8'));
  return new Set(namesData.map((n) => n.name));
}

// Process a single SSA year file (format: Name,Gender,Count per line)
function processYearFile(
  filePath: string,
  year: number,
  validNames: Set<string>,
): PopularityRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  // Group by gender to calculate ranks
  const maleEntries: { name: string; count: number }[] = [];
  const femaleEntries: { name: string; count: number }[] = [];

  for (const line of lines) {
    const [name, gender, countStr] = line.split(',');
    const count = parseInt(countStr, 10);

    if (!validNames.has(name)) {
      continue;
    }

    if (gender === 'M') {
      maleEntries.push({ name, count });
    } else if (gender === 'F') {
      femaleEntries.push({ name, count });
    }
  }

  // Sort by count descending to determine rank
  maleEntries.sort((a, b) => b.count - a.count);
  femaleEntries.sort((a, b) => b.count - a.count);

  const records: PopularityRecord[] = [];

  // Add male records with rank
  maleEntries.forEach((entry, index) => {
    records.push({
      name: entry.name,
      gender: 'M',
      year,
      rank: index + 1,
      count: entry.count,
    });
  });

  // Add female records with rank
  femaleEntries.forEach((entry, index) => {
    records.push({
      name: entry.name,
      gender: 'F',
      year,
      rank: index + 1,
      count: entry.count,
    });
  });

  return records;
}

async function processSSAData() {
  const ssaDir = path.join(__dirname, '../data/ssa-raw');
  const outputPath = path.join(__dirname, '../data/popularity.json');

  // Check if SSA data directory exists
  if (!fs.existsSync(ssaDir)) {
    console.error(`Error: SSA data directory not found at ${ssaDir}`);
    console.error('Please download the SSA names data from:');
    console.error('https://www.ssa.gov/oact/babynames/names.zip');
    console.error('Extract the contents to data/ssa-raw/');
    process.exit(1);
  }

  const validNames = loadNames();
  console.log(`Loaded ${validNames.size} names from database to filter against`);

  const allRecords: PopularityRecord[] = [];

  // Process years from 1880 to 2023
  for (let year = 1880; year <= 2023; year++) {
    const fileName = `yob${year}.txt`;
    const filePath = path.join(ssaDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: File not found for year ${year}: ${fileName}`);
      continue;
    }

    const yearRecords = processYearFile(filePath, year, validNames);
    allRecords.push(...yearRecords);

    if (year % 10 === 0) {
      console.log(`Processed year ${year}...`);
    }
  }

  console.log(`\nTotal records: ${allRecords.length}`);

  // Write to output file
  fs.writeFileSync(outputPath, JSON.stringify(allRecords, null, 2));
  console.log(`Wrote popularity data to ${outputPath}`);

  // Show some stats
  const uniqueNames = new Set(allRecords.map((r) => r.name));
  const years = new Set(allRecords.map((r) => r.year));
  console.log(`\nStats:`);
  console.log(`  Unique names: ${uniqueNames.size}`);
  console.log(`  Years covered: ${Math.min(...years)} - ${Math.max(...years)}`);
  console.log(`  Total records: ${allRecords.length}`);
}

processSSAData();
