# Sleddawg Fitness

A single-page Strava training dashboard with AI-powered workout planning, hosted on GitHub Pages.

## What it does

- Connects to your Strava account and displays your activity history
- Shows a stats summary (total activities, distance, elevation, avg pace)
- Monthly calendar view with activity dots
- Pace trend chart across your last 10 runs
- Route map for your latest activity (and any activity via click)
- Generates a personalized 7-day training plan using the Claude API

## Setup

### 1. Strava API credentials

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and create an app
2. Note your **Client ID** and **Client Secret**
3. Set the **Authorization Callback Domain** to `sdono043.github.io`

### 2. Add your Client ID to the code

In `index.html`, find this line near the top of the `<script>` block and fill in your Client ID:

```js
const CLIENT_ID = ''; // PUT YOUR STRAVA CLIENT ID HERE
```

### 3. Connect to Strava

There are two ways to authenticate:

**Option A — Paste an access token directly**
1. Get a token via the Strava API (e.g. using the curl OAuth flow)
2. Click "Connect Strava" on the site and paste the token

**Option B — OAuth flow**
1. Click "Connect via Strava OAuth"
2. Authorize the app on Strava
3. You'll be redirected back with an authorization code
4. Run the curl command shown on screen to exchange the code for a token:
   ```
   curl -X POST https://www.strava.com/oauth/token \
     -d client_id=YOUR_ID \
     -d client_secret=YOUR_SECRET \
     -d code=THE_CODE \
     -d grant_type=authorization_code
   ```
5. Paste the `access_token` from the response into the input field

The token is saved to `localStorage` so you only need to do this once per browser.

### 4. Claude API key (for AI workout plans)

The workout plan feature calls the Claude API directly from the browser. To enable it, run this once in your browser's developer console:

```js
localStorage.setItem('claude_api_key', 'your-key-here')
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

## Deployment

The site is a static single file — no build step needed. It's deployed via GitHub Pages from the `main` branch.

Live site: [sdono043.github.io/sleddawg-fitness](https://sdono043.github.io/sleddawg-fitness)
