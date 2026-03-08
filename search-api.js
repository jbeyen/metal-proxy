const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// --- Configuration ---
const PORT = process.env.PORT || 3456;
const DB_PATH = path.join(__dirname, 'bands.db');

// --- Database Setup ---
const db = new Database(DB_PATH, { readonly: true });

// Prepare search statement (reusable for performance)
const searchStmt = db.prepare(`
  SELECT name, genre, country, url, status
  FROM bands
  WHERE name LIKE ?
  ORDER BY
    CASE WHEN name LIKE ? THEN 0 ELSE 1 END,  -- Exact start matches first
    LENGTH(name),                               -- Shorter names first
    name
  LIMIT 100
`);

// --- Search Function ---
function searchBands(query) {
  if (!query || query.length < 2) {
    return [];
  }

  const pattern = `%${query}%`;
  const startPattern = `${query}%`;

  return searchStmt.all(pattern, startPattern);
}

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve the HTML frontend
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const htmlPath = path.join(__dirname, 'metal-search.html');
    fs.readFile(htmlPath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  }

  // Search endpoint
  if (url.pathname === '/search') {
    const query = url.searchParams.get('q');

    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing query parameter: q' }));
      return;
    }

    try {
      const results = searchBands(query);

      // Format results to match what the frontend expects
      // Original format: { aaData: [[name_html, genre, country], ...] }
      const formatted = {
        aaData: results.map(band => [
          `<a href="${band.url}">${band.name}</a>`,
          band.genre,
          band.country
        ]),
        total: results.length,
        source: 'local-db'
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formatted));
    } catch (err) {
      console.error('Search error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed' }));
    }
    return;
  }

  // Stats endpoint
  if (url.pathname === '/stats') {
    const count = db.prepare('SELECT COUNT(*) as count FROM bands').get();
    const topGenres = db.prepare(`
      SELECT genre, COUNT(*) as count
      FROM bands
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 10
    `).all();
    const topCountries = db.prepare(`
      SELECT country, COUNT(*) as count
      FROM bands
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `).all();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalBands: count.count,
      topGenres,
      topCountries
    }));
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM bands').get();
  console.log(`Metal Search API running on http://localhost:${PORT}`);
  console.log(`Database: ${count.count} bands`);
  console.log(`Endpoints:`);
  console.log(`  GET /          - Search UI`);
  console.log(`  GET /search?q= - Search bands`);
  console.log(`  GET /stats     - Database stats`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit();
});
