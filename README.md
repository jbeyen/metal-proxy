# Metal Archives Proxy

A Vercel serverless function that proxies search requests to [Metal Archives](https://www.metal-archives.com/).

## Status: In Progress

This approach doesn't work in production, and I'm still working on it. Metal Archives uses Cloudflare anti-bot protection, so the proxy works locally (good) but fails when deployed (less good).

## Next Steps

Building a scraper + local database instead. I spoke with Metal Archives's webmaster and now I'm working on - 
- Scraping band data weekly from my home machine
- I'll store it in my own database
- I'll searches from that database

## Why 

I love Metal Archives as a resource and use it for exactly one thing: looking up bands. I do this exclusively on my phone from either record shops or shows - the site isn't responsive, so I end up trying to tap on (what feels like) a 3-pixel-high search box on the very top right of the screen. I just wanted to have a page with a giant metal search bar, so here we are. I hope to get this up and running so I can use it outside my home (and maybe you'll be able to too).

## License

MIT
