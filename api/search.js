export default async function handler(req, res) {
  // Set CORS headers so any webpage can call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // Handle preflight requests (browser asks "can I call this?" before actually calling)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing q parameter' });
  }

  const maUrl = `https://www.metal-archives.com/search/ajax-band-search/?field=name&query=${encodeURIComponent(q)}&sEcho=1&iColumns=3&iDisplayStart=0&iDisplayLength=50`;

  try {
    const response = await fetch(maUrl, {
      headers: {
        // Mimic a real browser so Metal Archives doesn't block us
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://www.metal-archives.com/',
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Metal Archives' });
  }
}
