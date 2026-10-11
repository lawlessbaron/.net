# Verse Atlas

A new-player friendly field guide to **Star Citizen**: everything in one easy-to-navigate hub.

| Section | What's in it |
| --- | --- |
| **New player guide** | 10 step-by-step chapters, from installing the launcher and getting your ship out of the hangar to your first paycheck, plus keybinds, a glossary and FAQ. Progress is saved per step. |
| **Missions** | Every live contract (~1,400): mission giver, pay, the reputation rank it needs, rep gained/lost, locations, enemy ships, blueprint drops, prerequisites. Filter by giver, type, system, legality and "what can I take at my rank". |
| **Mission givers & rep** | Every faction's rank ladder. Enter your standing to see your rank, what you've unlocked, and the fastest missions to the next rank. |
| **Ships & vehicles** | 330+ ships and variants (including concept ships) with full stats, in-game buy and rent prices per dealer, real-money pledge prices (standalone, warbond, packages), blueprint top/side views, an interactive **3D model viewer**, paints, and side-by-side compare. |
| **Paints & liveries** | 2,000+ paints across every ship. |
| **Pledge store prices** | Every RSI store listing with USD price, warbond deals, sales and last-seen prices. |
| **Weapons, armor & items** | ~3,700 items: personal and ship weapons, armor, components, missiles, mining gear, medical, food. Stats plus every shop that sells each one, with prices. |
| **Locations & shops** | Every station, city and outpost with services. Tick "I need food + armor + refuel" to find where to go, and see every shop's inventory. |
| **My fleet** | Link your RSI handle (public profile), import your hangar (bookmarklet or paste), and view your fleet **to scale using real top-down ship renders**, in hologram or realistic mode, with zoom-to-full-resolution, plus fleet analysis (what roles you're missing). |
| **Events & sales** | Next event countdown, yearly event timeline, current discounts and warbonds. |
| **News, videos & links** | Latest RSI comm-links and the community tools everyone uses. |

Plus global search (<kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>/</kbd>), dark cockpit theme with a light "printed guide" theme, and a referral sign-up card for new players.

## Run it

Requires Node 18+. No dependencies to install.

```bash
cd StarCitizenHub
npm start              # http://localhost:8080
```

`npm start` runs `server.mjs`, which serves the site and adds `/api/citizen/:handle` (reads a public RSI citizen page; browsers can't do this directly because of CORS).
The `site/` folder also works on any static host (GitHub Pages, Netlify, Cloudflare Pages); only the live citizen lookup needs the Node server.

## Refresh the game data

```bash
npm run data           # rebuilds site/data/*.json (uses a local .cache/)
npm run data:fresh     # ignore the cache
npm run data -- --only=missions,ships
npm run check          # syntax-check modules and validate data files
```

Run it after each patch. Sources:

- [Star Citizen Wiki API](https://api.star-citizen.wiki): missions, factions, ships, items, comm-links
- [UEX Corp](https://uexcorp.space): shop terminals and in-game prices
- [FleetYards](https://fleetyards.net): top/side renders, 3D holo models, paints, concept ships
- [Roberts Space Industries](https://robertsspaceindustries.com): citizen profiles, pledge store

CIG has **no official public API or login for third-party sites**, so account linking reads the public citizen page, and hangar import uses a bookmarklet that runs on the RSI site in the user's own browser (the same approach other hangar tools use).

## Editing content

- `site/js/content/guide.js`: new player guide chapters, keybinds, glossary, FAQ
- `site/js/content/events.js`: yearly events (add announced dates under `dates`)
- `site/js/content/site.js`: referral code and link

Verse Atlas is an unofficial fan site, not endorsed by Cloud Imperium Games.
