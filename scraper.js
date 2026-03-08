const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const path = require('path');

// --- Configuration ---
const DB_PATH = path.join(__dirname, 'bands.db');
const BATCH_SIZE = 500;           // Records per API request (max 500)
const DELAY_MS = 1000;            // Delay between requests (be nice to MA servers)
const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'NBR', // Numbers
  '~'    // Other characters
];

// --- Database Setup ---
function initDb() {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bands (
      id INTEGER PRIMARY KEY,
      ma_id TEXT UNIQUE,
      name TEXT NOT NULL,
      url TEXT,
      country TEXT,
      genre TEXT,
      status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bands_name ON bands(name);
    CREATE INDEX IF NOT EXISTS idx_bands_genre ON bands(genre);
    CREATE INDEX IF NOT EXISTS idx_bands_country ON bands(country);

    CREATE TABLE IF NOT EXISTS scrape_progress (
      letter TEXT PRIMARY KEY,
      completed_at TEXT,
      total_records INTEGER
    );
  `);

  return db;
}

// --- Fetch from Metal Archives using curl ---
function fetchPage(letter, start) {
  const url = `https://www.metal-archives.com/browse/ajax-letter/l/${letter}?sEcho=1&iDisplayStart=${start}&iDisplayLength=${BATCH_SIZE}`;

  try {
    const result = execSync(
      `curl -s "${url}" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"`,
      { encoding: 'utf8', timeout: 30000 }
    );
    return JSON.parse(result);
  } catch (err) {
    console.error(`Error fetching ${letter} at ${start}:`, err.message);
    return null;
  }
}

// --- Parse band data from HTML-laden response ---
function parseBand(row) {
  // row[0]: '<a href="https://www.metal-archives.com/bands/Name/12345">Name</a>'
  // row[1]: Country
  // row[2]: Genre
  // row[3]: '<span class="active">Active</span>'

  const linkMatch = row[0].match(/href='([^']+)'[^>]*>([^<]+)</);
  const statusMatch = row[3].match(/>([^<]+)</);

  if (!linkMatch) return null;

  const url = linkMatch[1];
  const name = linkMatch[2];
  const maIdMatch = url.match(/\/(\d+)$/);
  const maId = maIdMatch ? maIdMatch[1] : null;

  return {
    ma_id: maId,
    name: name,
    url: url,
    country: row[1],
    genre: row[2],
    status: statusMatch ? statusMatch[1] : 'Unknown'
  };
}

// --- Main scrape function ---
async function scrape(options = {}) {
  const db = initDb();
  const startFromLetter = options.startFrom || null;

  // Prepare insert statement
  const insert = db.prepare(`
    INSERT INTO bands (ma_id, name, url, country, genre, status, updated_at)
    VALUES (@ma_id, @name, @url, @country, @genre, @status, CURRENT_TIMESTAMP)
    ON CONFLICT(ma_id) DO UPDATE SET
      name = @name,
      country = @country,
      genre = @genre,
      status = @status,
      updated_at = CURRENT_TIMESTAMP
  `);

  const markProgress = db.prepare(`
    INSERT OR REPLACE INTO scrape_progress (letter, completed_at, total_records)
    VALUES (?, CURRENT_TIMESTAMP, ?)
  `);

  let skipUntilFound = !!startFromLetter;
  let totalBands = 0;

  for (const letter of LETTERS) {
    // Handle --start-from flag
    if (skipUntilFound) {
      if (letter === startFromLetter) {
        skipUntilFound = false;
      } else {
        console.log(`Skipping ${letter}...`);
        continue;
      }
    }

    console.log(`\n=== Scraping letter: ${letter} ===`);

    let start = 0;
    let totalForLetter = null;
    let bandsForLetter = 0;

    while (true) {
      const data = fetchPage(letter, start);

      if (!data || !data.aaData || data.aaData.length === 0) {
        break;
      }

      if (totalForLetter === null) {
        totalForLetter = data.iTotalRecords;
        console.log(`  Total bands for ${letter}: ${totalForLetter}`);
      }

      // Insert bands in a transaction
      const insertMany = db.transaction((bands) => {
        for (const band of bands) {
          if (band) insert.run(band);
        }
      });

      const parsedBands = data.aaData.map(parseBand).filter(Boolean);
      insertMany(parsedBands);

      bandsForLetter += parsedBands.length;
      totalBands += parsedBands.length;

      console.log(`  Fetched ${start + parsedBands.length}/${totalForLetter} (total: ${totalBands})`);

      start += BATCH_SIZE;

      if (start >= totalForLetter) {
        break;
      }

      // Rate limiting
      await sleep(DELAY_MS);
    }

    // Mark letter as completed
    markProgress.run(letter, totalForLetter || 0);
  }

  console.log(`\n=== Done! Total bands scraped: ${totalBands} ===`);
  db.close();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- CLI ---
const args = process.argv.slice(2);
const startFrom = args.find(a => a.startsWith('--start-from='))?.split('=')[1];

if (args.includes('--help')) {
  console.log(`
Metal Archives Scraper

Usage:
  node scraper.js              # Full scrape (A-Z, #, ~)
  node scraper.js --start-from=M   # Resume from letter M
  node scraper.js --stats      # Show database stats
  `);
  process.exit(0);
}

if (args.includes('--stats')) {
  const db = new Database(DB_PATH);
  const count = db.prepare('SELECT COUNT(*) as count FROM bands').get();
  const byLetter = db.prepare(`
    SELECT UPPER(SUBSTR(name, 1, 1)) as letter, COUNT(*) as count
    FROM bands
    GROUP BY letter
    ORDER BY letter
  `).all();
  const progress = db.prepare('SELECT * FROM scrape_progress ORDER BY letter').all();

  console.log(`Total bands: ${count.count}`);
  console.log('\nBands by letter:');
  byLetter.forEach(r => console.log(`  ${r.letter}: ${r.count}`));
  console.log('\nScrape progress:');
  progress.forEach(r => console.log(`  ${r.letter}: ${r.total_records} (${r.completed_at})`));

  db.close();
  process.exit(0);
}

scrape({ startFrom }).catch(console.error);
