# Metal Search

A mobile-friendly search bar for metal bands, powered by data from [Metal Archives](https://www.metal-archives.com/).

**Try it here:** https://metal-search.fly.dev

## What it does

- Searches 195,000+ metal bands
- Returns band name results with subgenre and country
- Links out to the band's page on Metal Archives

 ## How it works 
 

Metal Archives doesn't have a public API and the site isn't mobile optimized. The project:

- Scrapes band data from Metal Archives (with the webmaster's blessing - thank you!)
- Stores it in a local SQLite database
- Serves a simple search API from that database

We did this to avoid Cloudflare bot detection that blocks cloud-hosted proxies.

## Why 

I love Metal Archives as a resource and use it for exactly one thing: looking up bands. I do this exclusively on my phone from either record shops or shows - the site isn't responsive, so I end up trying to tap on (what felt like) a 3-pixel-high search box in a corner of the screen. I just wanted a page with a giant metal search bar -  that's it. 

I first set this up to run locally, since I hit walls with their bot detection. After discussing with their webmaster, I decided to scrape the data I was interested in (I might set up a cron job to do it once a week), and build an API to query the data on my machine directly. If you want to play with it...


## Running Locally

```bash
npm install
npm start
# Open http://localhost:3456
```

## Updating the Data

The scraper fetches all bands from Metal Archives. Run it periodically to stay current:

```bash
npm run scrape         # Full scrape (~195k bands)
npm run scrape:stats   # Show database statistics
```

Then redeploy:

```bash
flyctl deploy
```

## Project Structure

```
metal-search/
├── search-api.js      # API server (serves frontend + search endpoint)
├── scraper.js         # Fetches all bands from Metal Archives
├── metal-search.html  # Search UI
├── bands.db           # SQLite database (195k bands, ~49MB)
├── fly.toml           # Fly.io deployment config
└── Dockerfile         # Container definition
```

## Deployment

Hosted on [Fly.io](https://fly.io) (free tier). To deploy your own:

```bash
flyctl launch
flyctl deploy
```

## Some data

- **195,027 bands** as of February 2026
- Fields: name, genre, country, status, Metal Archives URL
- Top genres: Black Metal, Death Metal, Heavy Metal, Thrash Metal
- Top countries: United States, Germany, Brazil, Italy, United Kingdom

## Thank you!

Data sourced from [Metal Archives](https://www.metal-archives.com/) with permission from the webmaster for weekly scraping and local storage.
