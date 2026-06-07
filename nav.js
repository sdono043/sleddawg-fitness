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

// ── TRAINING PLAN ─────────────────────────────────────────
const TRAINING_PLAN_START = new Date('2026-06-07T00:00:00');
const TRAINING_PLAN = [
  // BASE (W1–4)
  {phase:'base',          miles:25,  key:'3×Easy + LSD 10',    workouts:{Sun:'Rest',Mon:'Easy 5',Tue:'Rest',Wed:'Easy 5',Thu:'Rest',Fri:'Easy 5',Sat:'LSD 10',    focus:'Establish aerobic base. Every run conversational pace.'}},
  {phase:'base',          miles:28,  key:'3×Easy + LSD 12',    workouts:{Sun:'Rest',Mon:'Easy 5',Tue:'Rest',Wed:'Easy 6',Thu:'Rest',Fri:'Easy 5',Sat:'LSD 12',    focus:'Add miles gradually. Track nutrition on runs over 8 miles.'}},
  {phase:'base',          miles:30,  key:'B2B Intro + Tempo',  workouts:{Sun:'Rest',Mon:'Easy 5',Tue:'Rest',Wed:'Tempo 5',Thu:'Rest',Fri:'Easy 5',Sat:'LSD 12',   focus:'First tempo. 80% effort, not race pace.'}},
  {phase:'base',          miles:22,  key:'Recovery week',      workouts:{Sun:'Rest',Mon:'Easy 4',Tue:'Rest',Wed:'Easy 4',Thu:'Rest',Fri:'Easy 4',Sat:'LSD 10',    focus:'Recovery week — back off 25%. Let the body adapt.'}},
  // BUILD (W5–8)
  {phase:'build',         miles:33,  key:'First B2B',          workouts:{Sun:'B2B 10',Mon:'Rest',Tue:'Easy 5',Wed:'Tempo 5',Thu:'Rest',Fri:'Easy 5',Sat:'LSD 13', focus:'Back-to-back weekend starts.'}},
  {phase:'build',         miles:36,  key:'B2B increase',       workouts:{Sun:'B2B 12',Mon:'Rest',Tue:'Easy 5',Wed:'Tempo 6',Thu:'Rest',Fri:'Easy 5',Sat:'LSD 14', focus:'Increase B2B Sunday. Run on tired legs.'}},
  {phase:'build',         miles:38,  key:'Night run intro',    workouts:{Sun:'B2B 12',Mon:'Rest',Tue:'Easy 6',Wed:'Night 6',Thu:'Rest',Fri:'Easy 6',Sat:'LSD 14', focus:'First night run Wednesday. Headlamp required.'}},
  {phase:'build',         miles:26,  key:'Recovery week',      workouts:{Sun:'Rest',Mon:'Easy 5',Tue:'Rest',Wed:'Easy 5',Thu:'Rest',Fri:'Easy 4',Sat:'LSD 12',    focus:'Cutback week. Sleep extra.'}},
  // PEAK (W9–13)
  {phase:'peak',          miles:42,  key:'Peak B2B + Tempo',   workouts:{Sun:'B2B 14',Mon:'Rest',Tue:'Easy 6',Wed:'Tempo 6',Thu:'Rest',Fri:'Easy 6',Sat:'LSD 16', focus:'Entering peak. Ice bath after both long days.'}},
  {phase:'peak',          miles:45,  key:'Race-sim loops',     workouts:{Sun:'B2B 14',Mon:'Rest',Tue:'Easy 6',Wed:'Race-Sim 8',Thu:'Rest',Fri:'Easy 7',Sat:'LSD 18',focus:'Race simulation — 2.215mi loops, walk/run intervals.'}},
  {phase:'peak',          miles:48,  key:'Longest B2B',        workouts:{Sun:'B2B 16',Mon:'Rest',Tue:'Easy 6',Wed:'Night 8',Thu:'Rest',Fri:'Easy 8',Sat:'LSD 18', focus:'Longest back-to-back. Night run Wednesday.'}},
  {phase:'peak',          miles:50,  key:'Peak mileage week',  workouts:{Sun:'B2B 18',Mon:'Rest',Tue:'Easy 6',Wed:'Race-Sim 10',Thu:'Rest',Fri:'Easy 6',Sat:'LSD 20',focus:'Highest mileage week. Saturday 20 miler is your benchmark.'}},
  {phase:'peak',          miles:35,  key:'Recovery week',      workouts:{Sun:'B2B 10',Mon:'Rest',Tue:'Easy 5',Wed:'Easy 6',Thu:'Rest',Fri:'Easy 4',Sat:'LSD 10',  focus:'Hard cutback after 3 peak weeks. Trust the process.'}},
  // RACE-SPECIFIC (W14–16)
  {phase:'race-specific', miles:44,  key:'Night + race-sim',   workouts:{Sun:'B2B 14',Mon:'Rest',Tue:'Easy 6',Wed:'Night 10',Thu:'Rest',Fri:'Easy 4',Sat:'Race-Sim 20',focus:'Saturday race sim: loops at race pace, race-day food.'}},
  {phase:'race-specific', miles:40,  key:'Final long effort',  workouts:{Sun:'B2B 12',Mon:'Rest',Tue:'Easy 5',Wed:'Night 8',Thu:'Rest',Fri:'Easy 5',Sat:'LSD 20', focus:'Last big weekend. Lock in gear and food choices.'}},
  {phase:'race-specific', miles:30,  key:'Confidence week',    workouts:{Sun:'B2B 10',Mon:'Rest',Tue:'Easy 5',Wed:'Easy 6',Thu:'Rest',Fri:'Easy 4',Sat:'LSD 15',  focus:'Shorter efforts feel fast. Fight urge to push.'}},
  // TAPER (W17–19)
  {phase:'taper',         miles:22,  key:'Begin taper',        workouts:{Sun:'Easy 6',Mon:'Rest',Tue:'Easy 4',Wed:'Easy 5',Thu:'Rest',Fri:'Easy 4',Sat:'Easy 8',  focus:'Taper begins. Trust your training.'}},
  {phase:'taper',         miles:16,  key:'Deep taper',         workouts:{Sun:'Easy 4',Mon:'Rest',Tue:'Easy 3',Wed:'Easy 4',Thu:'Rest',Fri:'Easy 3',Sat:'Easy 6',  focus:'Cut volume aggressively. Do not add miles.'}},
  {phase:'taper',         miles:10,  key:'Race week prep',     workouts:{Sun:'Easy 3',Mon:'Rest',Tue:'Easy 2',Wed:'Easy 3',Thu:'Rest',Fri:'Easy 2',Sat:'Rest',    focus:'Arrive rested. Sleep, hydrate, eat clean starches.'}},
  // RACE (W20)
  {phase:'race',          miles:100, key:'GREENSPRINGS 24',    workouts:{Sun:'Rest',Mon:'Rest',Tue:'Easy 2',Wed:'Easy 2',Thu:'Rest',Fri:'Rest',Sat:'RACE DAY 🏁', focus:'Race day Oct 24. Start slow, run/walk from mile 1.'}},
];

function getPlanWeekForDate(weekStart) {
  const msSinceStart = weekStart.getTime() - TRAINING_PLAN_START.getTime();
  const weekIdx = Math.floor(msSinceStart / (7 * 24 * 3600 * 1000));
  if (weekIdx < 0 || weekIdx >= TRAINING_PLAN.length) return null;
  return { weekNum: weekIdx + 1, weekIdx, ...TRAINING_PLAN[weekIdx] };
}
