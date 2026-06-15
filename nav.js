// ── SHARED NAV ────────────────────────────────────────────
function renderNav(activePage) {
  const pages = [
    { id: 'dashboard', label: 'Dashboard', href: 'index.html' },
    { id: 'planner',   label: 'Planner',   href: 'planner.html' },
    { id: 'scorecard', label: 'Scorecard', href: 'scorecard.html' },
    { id: 'hiit',      label: 'HIIT',      href: 'hiit.html' },
    { id: 'swim',      label: 'Swim',      href: 'swim.html' },
  ];

  const token = localStorage.getItem('strava_access_token');
  const statusHtml = token
    ? `<div class="connected-badge"><div class="dot"></div><span>Strava connected</span></div>`
    : `<span style="font-family:'DM Mono',monospace;font-size:0.7rem;color:var(--text3)">Not connected</span>`;

  document.getElementById('nav-placeholder').innerHTML = `
    <nav>
      <a href="index.html" class="logo"><img src="logo.png" alt="Sleddawg Fitness" style="height:2.2rem;width:auto;vertical-align:middle;display:block;"></a>
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
// 19-week plan, Week 1 = Jun 7 2026, Race = Oct 24 2026
const TRAINING_PLAN_START = new Date('2026-06-07T00:00:00');
const TRAINING_PLAN = [
  // BASE PHASE (Wk 1-6, Jun 7 – Jul 18)
  {phase:'base',          miles:34,  key:'Entry base week',              workouts:{Sun:'Rest',Mon:'Easy 5',Tue:'Rest',Wed:'Easy 6',Thu:'Easy 8',Fri:'Rest',Sat:'LSD 15',    focus:'Establish your base. All runs fully conversational. Lock in your routine and run days.'}},
  {phase:'base',          miles:41,  key:'Build long run',               workouts:{Sun:'Rest',Mon:'Easy 5',Tue:'Rest',Wed:'Easy 8',Thu:'Easy 10',Fri:'Rest',Sat:'LSD 18',   focus:'First real long run. Practice eating every 4 miles. Time on feet over pace.'}},
  {phase:'base',          miles:44,  key:'LSD 20 milestone',             workouts:{Sun:'Rest',Mon:'Easy 6',Tue:'Rest',Wed:'Easy 8',Thu:'Easy 10',Fri:'Rest',Sat:'LSD 20',   focus:'First 20-miler. Carry full nutrition and hydration. Run to finish, not pace.'}},
  {phase:'base',          miles:50,  key:'Push to 22 long',              workouts:{Sun:'Rest',Mon:'Easy 6',Tue:'Rest',Wed:'Easy 10',Thu:'Easy 12',Fri:'Rest',Sat:'LSD 22',  focus:'50-mile week. Strong foundation. Stay patient on the long run — save energy for the back half.'}},
  {phase:'base',          miles:58,  key:'Medium-long + LSD 25',         workouts:{Sun:'Rest',Mon:'Easy 8',Tue:'Rest',Wed:'Easy 10',Thu:'Easy 15',Fri:'Rest',Sat:'LSD 25',  focus:'First 25-miler. Thursday is medium-long effort — not a recovery jog. Fuel every 45–60 min.'}},
  {phase:'base',          miles:43,  key:'Recovery week',                workouts:{Sun:'Rest',Mon:'Easy 8',Tue:'Rest',Wed:'Easy 10',Thu:'Easy 10',Fri:'Rest',Sat:'LSD 15',  focus:'Pull back. Let your legs absorb the last 5 weeks. Sleep more than usual.'}},
  // BUILD PHASE (Wk 7-8, Jul 19 – Aug 1)
  {phase:'build',         miles:65,  key:'LSD 28 — biggest easy week',   workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 12',Thu:'Easy 15',Fri:'Rest',Sat:'LSD 28', focus:'Biggest run so far. Treat the 28 as a race preview. Eat/drink exactly what you will on Oct 24.'}},
  {phase:'build',         miles:50,  key:'First meaningful stack',        workouts:{Sun:'Rest',Mon:'Easy 8',Tue:'Rest',Wed:'Easy 12',Thu:'Rest',Fri:'LSD 20',Sat:'B2B 10',  focus:'First back-to-back. Long run Friday, recovery run Saturday simulates race-day fatigue. Stay easy Saturday.'}},
  // ULTRA-SPECIFIC PHASE (Wk 9-12, Aug 2 – Aug 29)
  {phase:'race-specific', miles:54,  key:'Stack 20+12',                  workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 12',Thu:'Rest',Fri:'LSD 20',Sat:'B2B 12', focus:'Running on tired legs is the most race-specific training you can do. Saturday B2B should feel controlled.'}},
  {phase:'race-specific', miles:62,  key:'Stack 25+12',                  workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 15',Thu:'Rest',Fri:'LSD 25',Sat:'B2B 12', focus:'Wednesday is medium-long effort. The 25+12 weekend stack is your first serious race simulation.'}},
  {phase:'race-specific', miles:65,  key:'Stack 30+10',                  workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 15',Thu:'Rest',Fri:'LSD 30',Sat:'B2B 10', focus:'30 miles in one run. Expect to walk sections — that is correct and race-specific. Fuel every loop.'}},
  {phase:'build',         miles:48,  key:'Recovery — stack 20+10',       workouts:{Sun:'Rest',Mon:'Easy 8',Tue:'Rest',Wed:'Easy 10',Thu:'Rest',Fri:'LSD 20',Sat:'B2B 10',  focus:'Recovery week. Stack is lighter — let your body consolidate the ultra-specific gains.'}},
  // PEAK PHASE (Wk 13-16, Aug 30 – Sep 26)
  {phase:'peak',          miles:70,  key:'Stack 30+15',                  workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 15',Thu:'Rest',Fri:'LSD 30',Sat:'B2B 15', focus:'30+15 is 45 miles across two days. Your legs will feel this week. That is the training effect.'}},
  {phase:'peak',          miles:70,  key:'Stack 35+10 — biggest single run', workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 15',Thu:'Rest',Fri:'LSD 35',Sat:'B2B 10', focus:'35 miles — your longest training run. This is your mental benchmark. You can do this. Stay fueled.'}},
  {phase:'peak',          miles:75,  key:'Stack 25+20 — 45mi in two days', workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 20',Thu:'Rest',Fri:'LSD 25',Sat:'B2B 20', focus:'Most important week of the plan. 45 miles Fri–Sat. Wednesday medium-long is your biggest midweek ever.'}},
  {phase:'peak',          miles:70,  key:'Final peak — stack 30+15',     workouts:{Sun:'Rest',Mon:'Easy 10',Tue:'Rest',Wed:'Easy 15',Thu:'Rest',Fri:'LSD 30',Sat:'B2B 15', focus:'Final peak block. Wear your race kit. Practice your walk/run intervals on the Saturday B2B.'}},
  // TAPER (Wk 17-19, Sep 27 – Oct 17)
  {phase:'taper',         miles:33,  key:'Begin taper',                  workouts:{Sun:'Rest',Mon:'Easy 8',Tue:'Rest',Wed:'Easy 10',Thu:'Rest',Fri:'Rest',Sat:'LSD 15',    focus:'Taper begins. Legs may feel heavy or sluggish — both normal. Do not add miles. Trust your training.'}},
  {phase:'taper',         miles:24,  key:'Deep taper',                   workouts:{Sun:'Rest',Mon:'Easy 6',Tue:'Rest',Wed:'Easy 8',Thu:'Rest',Fri:'Rest',Sat:'Easy 10',    focus:'Cut volume aggressively. You will feel sluggish. That is the taper. Do not add miles. Finalize gear.'}},
  {phase:'taper',         miles:11,  key:'Race week shakeout',           workouts:{Sun:'Rest',Mon:'Easy 4',Tue:'Rest',Wed:'Easy 4',Thu:'Easy 3',Fri:'Rest',Sat:'Rest',     focus:'Final shakeout. Legs charged. Drop bags packed. Headlamp charged. Race starts Oct 24 at 8am.'}},
  // RACE (W20)
  {phase:'race',          miles:100, key:'GREENSPRINGS 24',              workouts:{Sun:'Rest',Mon:'Rest',Tue:'Rest',Wed:'Rest',Thu:'Rest',Fri:'Rest',Sat:'RACE DAY 🏁',    focus:'Race day Oct 24. Goal: 100 miles / ~45 loops. Start slow, run/walk from mile 1, fuel every loop.'}},
];

function getPlanWeekForDate(weekStart) {
  const msSinceStart = weekStart.getTime() - TRAINING_PLAN_START.getTime();
  const weekIdx = Math.floor(msSinceStart / (7 * 24 * 3600 * 1000));
  if (weekIdx < 0 || weekIdx >= TRAINING_PLAN.length) return null;
  return { weekNum: weekIdx + 1, weekIdx, ...TRAINING_PLAN[weekIdx] };
}
