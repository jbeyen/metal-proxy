# Metal Archives Proxy

A Vercel serverless function that proxies search requests to [Metal Archives](https://www.metal-archives.com/).

## Status: Working locally

This approach doesn't work in production yet; Metal Archives uses anti-bot protection, so the proxy works locally (good) but fails when deployed (less good).

## In Progress:

Building a scraper + local database instead. I spoke with Metal Archives's webmaster and now I'm working on - 
- Scraping band data from my home machine - in progress; ran it once, now to set it up weekly
- I'll store it in my own database - done
- I'll searches from that database - to do

## Why 

I love Metal Archives as a resource and use it for exactly one thing: looking up bands. I do this exclusively on my phone from either record shops or shows - the site isn't responsive, so I end up trying to tap on (what feels like) a 3-pixel-high search box in a corner of the screen. I just wanted a page with a giant metal search bar -  that's it. My plan is to set this up so that I can use it outside my home (and maybe you'll be able to too).

## License

MIT
