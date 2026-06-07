// ── SHARED NAV ────────────────────────────────────────────
function renderNav(activePage) {
  const pages = [
    { id: 'dashboard', label: 'Dashboard', href: 'index.html' },
    { id: 'planner',   label: 'Planner',   href: 'planner.html' },
    { id: 'scorecard', label: 'Scorecard', href: 'scorecard.html' },
  ];

  const token = localStorage.getItem('strava_access_token');
  const statusHtml = token
    ? `<div class="connected-badge"><div class="dot"></div><span>Strava connected</span></div>`
    : `<span style="font-family:'DM Mono',monospace;font-size:0.7rem;color:var(--text3)">Not connected</span>`;

  document.getElementById('nav-placeholder').innerHTML = `
    <nav>
      <a href="index.html" class="logo">SLEDD<span>AWG</span></a>
      <div class="nav-links">
        ${pages.map(p => `
          <a href="${p.href}" class="nav-link${activePage === p.id ? ' active' : ''}">${p.label}</a>
        `).join('')}
      </div>
      <div id="nav-status">${statusHtml}</div>
    </nav>`;
}

// ── SHARED UTILS ──────────────────────────────────────────
function metersToMiles(m) { return m * 0.000621371; }
function metersToFeet(m)  { return Math.round(m * 3.28084); }
function secsToPace(secs, meters) {
  if (!meters || meters < 10) return '—';
  const secsPerMile = secs / metersToMiles(meters);
  const mins = Math.floor(secsPerMile / 60);
  const s = Math.round(secsPerMile % 60).toString().padStart(2, '0');
  return `${mins}:${s}`;
}
function formatDuration(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d;
}
function isoDate(d) { return d.toISOString().split('T')[0]; }

// ── STRAVA TOKEN AUTO-REFRESH ─────────────────────────────
// Silently refreshes the access token if it has expired or is about to.
// Requires strava_client_id, strava_client_secret, strava_refresh_token
// to be set in localStorage (via local-config.js or the connect screen).
async function ensureStravaToken() {
  const expiresAt  = parseInt(localStorage.getItem('strava_expires_at') || '0');
  const refreshTok = localStorage.getItem('strava_refresh_token');
  const clientId   = localStorage.getItem('strava_client_id');
  const clientSec  = localStorage.getItem('strava_client_secret');

  if (!refreshTok || !clientId || !clientSec) return; // no refresh creds, skip
  const nowSecs = Math.floor(Date.now() / 1000);
  if (expiresAt > nowSecs + 300) return; // still valid for 5+ min

  try {
    const resp = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSec,
        refresh_token: refreshTok,
        grant_type: 'refresh_token',
      })
    });
    if (!resp.ok) return;
    const data = await resp.json();
    localStorage.setItem('strava_access_token',  data.access_token);
    localStorage.setItem('strava_refresh_token', data.refresh_token);
    localStorage.setItem('strava_expires_at',    data.expires_at);
  } catch(e) { /* fail silently — stale token will surface as API error */ }
}

// ── STRAVA FETCH ──────────────────────────────────────────
async function fetchActivities(token, perPage = 80) {
  await ensureStravaToken();
  const t = localStorage.getItem('strava_access_token') || token;
  const r = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=1`,
    { headers: { Authorization: `Bearer ${t}` } }
  );
  if (!r.ok) throw new Error('Strava API error ' + r.status);
  return r.json();
}

// ── PLANNED WORKOUTS (localStorage) ──────────────────────
function getPlannedWorkouts() {
  try { return JSON.parse(localStorage.getItem('planned_workouts') || '{}'); }
  catch { return {}; }
}
function savePlannedWorkouts(obj) {
  localStorage.setItem('planned_workouts', JSON.stringify(obj));
}
function getWeeklyGoal() {
  return parseFloat(localStorage.getItem('weekly_goal_miles') || '20');
}
function saveWeeklyGoal(miles) {
  localStorage.setItem('weekly_goal_miles', miles);
}
