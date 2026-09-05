# 🏈 Domination League — 2026 War Room

Live draft board and season tracker for a 12-team Yahoo fantasy football league (pick 2, 45-second clock, custom scoring).

**[Open the app](https://nikhilgreenbot.github.io/draft-fantasy-war-room/)**

Built the same way as [PL Predictions Pro](https://nikhilgreenbot.github.io/premierLeague-Predictions-pro-by-Parth/) — vanilla HTML/CSS/JS on GitHub Pages. No build step.

---

## What it is

A Bills-colored war room for **DOmination Leauge** (Yahoo #30476):

- **Tonight** — pick-2 lock list, 23/26 package, snake picks, hard rules
- **Board** — searchable queue names; tap to copy the Yahoo search string and add to roster
- **Roster** — starter slots saved on the phone (localStorage)
- **Form** — ESPN scoreboard + Sleeper box scores, **rescored with this league's settings**
- **League** — 7-pt passing TDs, first downs, juiced IDP
- **Duties** — co-GM split for draft night

2025 custom PPG is baked in so the board works even if APIs hiccup on draft night.

---

## Live data (honest version)

| Source | What you get | Auth |
|---|---|---|
| **Sleeper** (CORS-open) | NFL week/season box scores, league state | None |
| **ESPN site API** | Scoreboard / games | None |
| **Yahoo Fantasy** | Official matchup points, draft room, waivers | **OAuth + a backend.** Not possible from a static GitHub Pages site. |

This app computes *your* scoring on NFL stats (completions, first downs, IDP solos, etc.). Use it for form and draft value. Open Yahoo for the official weekly total.

To wire Yahoo later: register an app at [Yahoo Sports Developer](https://sports.yahoo.com/developer/), put the token exchange on a tiny Cloudflare Worker / Vercel function, then proxy `https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.30476`. Do not put a client secret in this repo.

---

## Local

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

---

## Stack

- HTML / CSS / JS — zero dependencies
- Fonts: Bebas Neue + Barlow (Google Fonts)
- Player thumbs: Sleeper CDN
- Hosted on GitHub Pages

---

## Credits

War room strategy for a 12-team custom-scoring Yahoo league. Colorway inspired by Buffalo; no official NFL or Bills marks.

[nikhilbastikar.dev](https://nikhilbastikar.dev) · [@nikhilGreenBot](https://github.com/nikhilGreenBot)
