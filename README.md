# Pontada Pickleball Club

Public tournament web app, with the locked Pontada Modern v1.0.1 identity. Adapted domain engines retain their MIT license; see THIRD_PARTY_NOTICES.md.

## Access

The home page and GET /api/tournament are public read-only views of one shared club tournament. /kelola uses a four-digit manager PIN, with no end-user ChatGPT account required. All writes, full JSON exports, and manager history require a valid server session. Public snapshots omit operator identities and undo events.

Production server configuration (never commit actual values):
- PONTADA_MANAGER_PIN: the four numeric digits required for manager login; missing or malformed configuration denies login.
- PONTADA_TOURNAMENT_KEY: the existing tournaments.owner_id key for the shared club record. Preserve it to retain existing results.

Copy .env.example to an ignored .dev.vars for local use. Set a disposable local club key and your test PIN. Production values belong in your host's secret settings. Changing the PIN invalidates existing sessions. Sessions expire after 12 hours; logout revokes them immediately. The server allows five PIN attempts per IP in a 15-minute window, backed by D1.

The GitHub repository contains the source. Hosting this complete app requires a Cloudflare Worker and D1; GitHub Pages alone does not execute its server or database. For a standalone deployment, use the supplied build scripts, apply the Drizzle migrations, configure the server variables, then deploy dist/server/wrangler.json with Wrangler. Sites hosting uses the existing .openai/hosting.json project and applies migrations when publishing.

## Everyday use

1. Spectators open the home page without signing in. Beranda, Jadwal and Klasemen are the three main tabs.
2. Administrators open /kelola and enter the configured manager PIN.
3. When no schedule exists, Siapkan Turnamen guides players, scoring rules, and schedule preview in three steps.
4. Start an available match. Record points, undo or correct a score, inspect the result, then confirm.
5. Export full JSON backups in Data & Arsip, or CSV standings. A validated restore preview requires confirmation.

Complete Americano supports 4/5, 8/9, 12/13, 16/17, 20/21, 24/25, 28/29, or 32 active players. Twenty players produce 95 matches, 19 matches per player, and 48 rounds on two courts. Rosters and scoring rules lock once a schedule exists; names remain editable. Editing a scheduled match rebuilds unstarted matches after the last locked round while preserving played results.

The default is total 21 points across BOTH teams: 13-8 is final. First-to-target is a separate configurable mode. Only finalized results contribute to standings.

Point operations may queue on an already-open page when connectivity is interrupted. They persist on the same browser/device, deduplicate on the server, and pause for review after a concurrent edit. Other management actions require connectivity. This is not a complete offline PWA. Data refreshes every six seconds while open. Server confirmation is required before showing saved status.

Up to ten archives, 300 recent audit entries and 120 undo events per match are retained. Full JSON backups include retained history and archives.

## Design

The master logo is public/brand/pontada-logo-master.png (including PICKLEBALL CLUB). Do not redraw it. Manrope is bundled locally under public/fonts with its OFL license. Tokens and design rules are in design-system; app/globals.css implements the fixed colors, 18px minimum supporting text and 56px minimum button targets. app/ui.tsx centralizes logo, badges, dialogs and empty states.

## Verification

```sh
node --experimental-strip-types --test tests/core.test.ts tests/access.test.ts
python3 tests/storage.test.py
node node_modules/typescript/bin/tsc --noEmit
# Against a disposable local dev server at 127.0.0.1:5173 only:
node tests/auth.integration.mjs
node tests/api.integration.mjs
```

The authentication test checks PIN rejection, session cookies, anonymous access, logout revocation, CSRF and rate limits. The API test checks public visibility, manager access, spoofed identity rejection, CSRF, setup, scoring, operation deduplication, concurrent writes, undo, finalization, reopening and backup history; it restores the prior local data. Never point it at production.
