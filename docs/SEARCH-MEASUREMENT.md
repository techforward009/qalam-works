# Search Console & measurement workflow

Search Console is configured **externally** (property ownership + sitemap). No GSC API credentials live in this repo.

## What to monitor after indexing

- Indexed pages / coverage
- Impressions, clicks, CTR, average position
- Queries and landing pages
- Mobile vs desktop
- Countries
- Core Web Vitals (also via Speed Insights)
- Crawl/indexing issues

## Cadence

- **First 2 weeks:** check every few days
- **After data stabilizes:** weekly or monthly

## Division of labor

| Source | Answers |
|--------|---------|
| Search Console | How users found us on Google |
| Vercel Analytics | What they did after arriving |
| Speed Insights | Real-device performance |

Do not confuse Search Console traffic with onsite engagement events.
