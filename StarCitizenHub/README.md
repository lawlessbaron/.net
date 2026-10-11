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
| **Share studio** | Anyone can make a picture or 6-second video of their fleet, a ship, or their reputation in square, landscape or story sizes, with a ready-made caption. Admins also get a marketing panel that auto-generates a week of posts (ship of the day, next event, top contracts, rep climbs, deals, patch numbers). |
| **Suggestions** | Signed-in users post ideas and upvote them; admins set status and reply. |
| **Account** | Discord sign-in, synced data, contract log, RSI handle verification, public fleet page. |

Plus global search (<kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>/</kbd>), dark cockpit theme with a light "printed guide" theme, and a referral sign-up card for new players.

## Run it

Requires Node 18+.

```bash
cd StarCitizenHub
npm install            # one dependency: pg (only used when accounts are on)
npm start              # http://localhost:8080
```

`npm start` runs `server.mjs`, which serves the site and adds `/api/citizen/:handle` (reads a public RSI citizen page; browsers can't do this directly because of CORS).
The `site/` folder also works on any static host (GitHub Pages, Netlify, Cloudflare Pages); only the live citizen lookup needs the Node server.

## Accounts (optional): Discord sign-in

Signed-out visitors keep everything in their browser. With accounts turned on, people can **Sign in with Discord** to:

- sync their fleet, reputation, contract log and guide progress across devices,
- log contracts with **"I finished this"** on any mission (rep is added, rank-ups are announced, every change is undoable),
- verify their RSI handle by putting a short code in their RSI bio (no passwords, ever),
- share a public fleet page at `#/u/<rsi-handle>`,
- download or delete everything stored about them,
- post and upvote ideas on the **Suggestions** board (`#/suggestions`). Admins listed in `ADMIN_DISCORD_IDS` can mark ideas Planned / In progress / Done / Declined, reply, and remove posts. Each person can post 5 suggestions a day.

Turn it on by setting `DATABASE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` and `PUBLIC_URL` (see `.env.example`). Tables are created automatically on start.

## Deploy on Railway

1. **New service from this GitHub repo.** In the service settings set **Root Directory** to `StarCitizenHub`. `railway.json` sets `npm start` and the `/api/health` health check.
2. **Add a Postgres database** to the project.
3. **Create a Discord app** at <https://discord.com/developers/applications>. Under OAuth2, add the redirect `https://<your-domain>/auth/discord/callback` and copy the Client ID and Client Secret.
4. **Set service variables:**
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
   - `PUBLIC_URL` = `https://<your-domain>` (no trailing slash)
   - `ADMIN_DISCORD_IDS` = your Discord user ID (Discord → Settings → Advanced → Developer Mode, then right-click your name → Copy User ID). Separate several with commas.
5. **Deploy.** The logs should say `Accounts: on (Discord sign-in)`.

### Leaks feed (Discord)

The **News & leaks** page can follow channels in a Discord server, for example the leaks channel
`https://discord.com/channels/422137133923434506/422137614854914048` (server `422137133923434506`, channel `422137614854914048`).

1. In your Discord app (the same one used for sign-in) open **Bot**, create the bot, copy its token, and switch on **Message Content Intent**.
2. A server admin of that Discord server must add the bot:
   `https://discord.com/oauth2/authorize?client_id=<DISCORD_CLIENT_ID>&scope=bot&permissions=66560`
   (View Channels + Read Message History). Discord doesn't allow reading a server without this. Scraping with a user account breaks Discord's rules and gets accounts banned.
3. Set `DISCORD_BOT_TOKEN`, `DISCORD_FEED_CHANNELS=422137614854914048:Leaks` and optionally `FEED_AUTO_PUBLISH=1`.

By default new posts wait for an admin to approve them under **News & leaks → Leaks & rumors**. Keep approval on if the channel shares NDA (Evocati) material, which CIG has taken down before.

To refresh game data after a patch, run `npm run data` locally and push the updated `site/data/` files (Railway redeploys automatically).

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

**Ship art.** Top, side and angled renders and 3D models come from FleetYards. Painted (textured) renders exist for about 120 ships and variants; the rest are shown from their detailed plain-hull render tinted in the manufacturer's usual hull colour and labelled as approximate. Public 3D models have no textures, so the viewer offers Painted (hull colour), Plain and Hologram modes. Fully textured models would have to be extracted from the game files, which belong to CIG.

CIG has **no official public API or login for third-party sites**, so account linking reads the public citizen page, and hangar import uses a bookmarklet that runs on the RSI site in the user's own browser (the same approach other hangar tools use).

## Editing content

- `site/js/content/guide.js`: new player guide chapters, keybinds, glossary, FAQ
- `site/js/content/events.js`: yearly events (add announced dates under `dates`)
- `site/js/content/site.js`: referral code and link

Verse Atlas is an unofficial fan site, not endorsed by Cloud Imperium Games.
