# Sleddawg Fitness

Personal training dashboard and HIIT workout generator, hosted on GitHub Pages.

**Live site: [sdono043.github.io/sleddawg-fitness](https://sdono043.github.io/sleddawg-fitness)**

## Features

- **Dashboard** — Connects to Strava, shows activity stats, pace trend chart, calendar, and route map. AI-generates a personalized 7-day training plan.
- **Planner** — 25-week training plan targeting Greensprings 24 (100 miles, Oct 24 2026). AI-tunes the current week based on recent Strava activity and weather.
- **Scorecard** — Weekly plan vs. actual mileage breakdown with streak tracking.
- **HIIT Generator** — AI-generates CrossFit-style workouts based on time available and focus area (upper/lower/full body). Tracks workout history and avoids repeating recent sessions.

## For friends

The **HIIT Generator** works for anyone — just visit the site and hit Generate. No account or setup needed.

The **Strava features** work if you connect your own Strava account via the Dashboard. The training planner targets a specific race, so it's most useful as-is for Sam.

## Tech

- Static HTML/CSS/JS — no build step, no framework
- Strava API for activity data
- Claude API (Anthropic) for AI workout generation, routed through a Cloudflare Worker proxy
- Hosted on GitHub Pages

## Development setup (for contributors)

### Strava credentials

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and create an app
2. Set the **Authorization Callback Domain** to `sdono043.github.io`
3. Update `CLIENT_ID` in `index.html` with your Client ID

### Local config

Create a `local-config.js` file (gitignored) to set credentials without editing source files:

```js
localStorage.setItem('strava_client_id', 'YOUR_ID');
localStorage.setItem('strava_client_secret', 'YOUR_SECRET');
localStorage.setItem('strava_access_token', 'YOUR_TOKEN');
```

### AI features

AI calls go through a Cloudflare Worker proxy that holds the Anthropic API key — no key needed in the browser. To run your own instance, deploy a Worker that forwards requests to `api.anthropic.com/v1/messages` and update the `WORKER_URL` constant in `hiit.html` and the fetch URLs in `index.html` / `planner.html`.
