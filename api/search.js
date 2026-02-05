const https = require('https');

// v2 - force redeploy
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const q = req.query.q;

  if (!q) {
    return res.status(400).json({ error: 'Missing q parameter' });
  }

  const path = `/search/ajax-band-search/?field=name&query=${encodeURIComponent(q)}&sEcho=1&iColumns=3&iDisplayStart=0&iDisplayLength=50`;

  const options = {
    hostname: 'www.metal-archives.com',
    port: 443,
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Referer': 'https://www.metal-archives.com/',
    },
  };

  try {
    const data = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({ body, statusCode: response.statusCode, headers: response.headers }));
      });
      request.on('error', (err) => reject(err));
      request.end();
    });

    // If it looks like JSON, parse it
    if (data.body.trim().startsWith('{')) {
      const json = JSON.parse(data.body);
      return res.status(200).json(json);
    } else {
      // Return debug info
      return res.status(500).json({
        error: 'Metal Archives returned non-JSON response',
        statusCode: data.statusCode,
        preview: data.body.substring(0, 500)
      });
    }
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
};
