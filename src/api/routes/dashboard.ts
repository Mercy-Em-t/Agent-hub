import { Router, Request, Response } from 'express';

/**
 * Serves a minimal operator dashboard as a self-contained HTML page.
 *
 * The page uses vanilla JavaScript and the Fetch API to interact with
 * the Agent-hub REST API, so operators can approve/revoke agents and
 * sites and browse job history without needing the CLI or curl.
 *
 * Route: GET /dashboard
 */
export function dashboardRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(DASHBOARD_HTML);
  });

  return router;
}

/* ─── Static dashboard HTML ──────────────────────────────────────────────── */

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent-hub Operator Dashboard</title>
<style>
  :root {
    --bg: #0f172a; --surface: #1e293b; --border: #334155;
    --text: #f1f5f9; --muted: #94a3b8; --accent: #38bdf8;
    --green: #4ade80; --red: #f87171; --yellow: #fbbf24;
    --radius: 8px; --font: system-ui, sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--font);
         font-size: 14px; line-height: 1.5; }
  header { background: var(--surface); border-bottom: 1px solid var(--border);
           padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 18px; font-weight: 600; }
  header .badge { background: var(--accent); color: #0f172a; font-size: 11px;
                  font-weight: 700; padding: 2px 8px; border-radius: 100px; }
  .layout { display: grid; grid-template-columns: 220px 1fr; min-height: calc(100vh - 57px); }
  nav { background: var(--surface); border-right: 1px solid var(--border); padding: 16px 0; }
  nav a { display: block; padding: 8px 20px; color: var(--muted); text-decoration: none;
          cursor: pointer; transition: color .15s, background .15s; }
  nav a:hover, nav a.active { color: var(--text); background: rgba(255,255,255,.05); }
  nav a.active { border-left: 3px solid var(--accent); }
  main { padding: 24px; overflow-y: auto; }
  section { display: none; }
  section.active { display: block; }
  h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
  .toolbar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
  button { padding: 6px 14px; border: none; border-radius: var(--radius); cursor: pointer;
           font-size: 13px; font-weight: 500; transition: opacity .15s; }
  button:hover { opacity: .85; }
  .btn-primary { background: var(--accent); color: #0f172a; }
  .btn-success { background: var(--green); color: #0f172a; }
  .btn-danger  { background: var(--red);   color: #0f172a; }
  .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
  input, select { background: var(--surface); border: 1px solid var(--border); color: var(--text);
                  padding: 6px 10px; border-radius: var(--radius); font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 12px; background: var(--surface);
       color: var(--muted); font-weight: 500; font-size: 12px;
       border-bottom: 1px solid var(--border); }
  td { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:hover td { background: rgba(255,255,255,.02); }
  .badge-status { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 600; }
  .status-approved { background: rgba(74,222,128,.15); color: var(--green); }
  .status-pending  { background: rgba(251,191,36,.15);  color: var(--yellow); }
  .status-revoked  { background: rgba(248,113,113,.15); color: var(--red); }
  .status-queued   { background: rgba(251,191,36,.15);  color: var(--yellow); }
  .status-running  { background: rgba(56,189,248,.15);  color: var(--accent); }
  .status-completed { background: rgba(74,222,128,.15); color: var(--green); }
  .status-failed   { background: rgba(248,113,113,.15); color: var(--red); }
  .status-denied   { background: rgba(248,113,113,.15); color: var(--red); }
  .mono { font-family: monospace; font-size: 12px; }
  .muted { color: var(--muted); }
  #toast { position: fixed; bottom: 24px; right: 24px; background: var(--surface);
           border: 1px solid var(--border); padding: 10px 16px; border-radius: var(--radius);
           font-size: 13px; opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 999; }
  #toast.show { opacity: 1; }
  .health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .health-card { background: var(--surface); border: 1px solid var(--border); padding: 16px; border-radius: var(--radius); }
  .health-card .label { font-size: 11px; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
  .health-card .value { font-size: 22px; font-weight: 700; }
  .pagination { display: flex; gap: 8px; margin-top: 16px; align-items: center; color: var(--muted); font-size: 13px; }
  .audit-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
</style>
</head>
<body>
<header>
  <h1>Agent-hub</h1>
  <span class="badge">Operator Dashboard</span>
  <span id="health-dot" style="margin-left:auto;width:10px;height:10px;border-radius:50%;background:var(--muted)"></span>
  <span id="health-label" class="muted" style="font-size:12px">checking…</span>
</header>
<div class="layout">
<nav>
  <a class="active" data-section="overview" onclick="show('overview',this)">Overview</a>
  <a data-section="agents"   onclick="show('agents',this)">Agents</a>
  <a data-section="sites"    onclick="show('sites',this)">Sites</a>
  <a data-section="jobs"     onclick="show('jobs',this)">Jobs</a>
  <a data-section="audit"    onclick="show('audit',this)">Audit Log</a>
</nav>
<main>

<!-- OVERVIEW -->
<section id="overview" class="active">
  <h2>System Health</h2>
  <div class="health-grid" id="health-grid"></div>
  <button class="btn-secondary" onclick="loadHealth()">Refresh</button>
</section>

<!-- AGENTS -->
<section id="agents">
  <h2>Registered Agents</h2>
  <div class="toolbar">
    <input id="agents-search" placeholder="Filter by name…" oninput="renderAgents()" style="width:220px">
    <button class="btn-secondary" onclick="loadAgents()">Refresh</button>
  </div>
  <table>
    <thead><tr>
      <th>Name</th><th>Owner</th><th>Status</th><th>Registered</th><th>Actions</th>
    </tr></thead>
    <tbody id="agents-tbody"></tbody>
  </table>
  <div class="pagination" id="agents-page"></div>
</section>

<!-- SITES -->
<section id="sites">
  <h2>Registered Sites</h2>
  <div class="toolbar">
    <input id="sites-search" placeholder="Filter by domain…" oninput="renderSites()" style="width:220px">
    <button class="btn-secondary" onclick="loadSites()">Refresh</button>
  </div>
  <table>
    <thead><tr>
      <th>Domain</th><th>Owner</th><th>Status</th><th>Registered</th><th>Actions</th>
    </tr></thead>
    <tbody id="sites-tbody"></tbody>
  </table>
</section>

<!-- JOBS -->
<section id="jobs">
  <h2>Async Jobs</h2>
  <div class="toolbar">
    <select id="jobs-filter" onchange="renderJobs()">
      <option value="">All statuses</option>
      <option value="queued">Queued</option>
      <option value="running">Running</option>
      <option value="completed">Completed</option>
      <option value="failed">Failed</option>
    </select>
    <button class="btn-secondary" onclick="loadJobs()">Refresh</button>
  </div>
  <table>
    <thead><tr>
      <th>Job ID</th><th>Agent ID</th><th>Status</th><th>Created</th><th>Finished</th>
    </tr></thead>
    <tbody id="jobs-tbody"></tbody>
  </table>
</section>

<!-- AUDIT -->
<section id="audit">
  <h2>Audit Log</h2>
  <div class="audit-filters">
    <input id="audit-agent" placeholder="Agent ID" style="width:160px">
    <input id="audit-domain" placeholder="Domain" style="width:160px">
    <select id="audit-outcome">
      <option value="">All outcomes</option>
      <option value="completed">Completed</option>
      <option value="failed">Failed</option>
      <option value="denied">Denied</option>
    </select>
    <input id="audit-since" type="date" title="Since">
    <button class="btn-primary" onclick="loadAudit()">Search</button>
    <button class="btn-secondary" onclick="clearAuditFilters()">Clear</button>
  </div>
  <table>
    <thead><tr>
      <th>Time</th><th>Agent</th><th>Domain</th><th>Tools</th><th>Outcome</th><th>Duration</th>
    </tr></thead>
    <tbody id="audit-tbody"></tbody>
  </table>
  <div class="pagination" id="audit-page"></div>
</section>

</main>
</div>

<div id="toast"></div>

<script>
const API = window.location.origin;
let agentsData = [], sitesData = [], jobsData = [], auditData = [];
let auditTotal = 0, auditOffset = 0;

function show(id, el) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  if (id === 'overview') loadHealth();
  if (id === 'agents')   loadAgents();
  if (id === 'sites')    loadSites();
  if (id === 'jobs')     loadJobs();
  if (id === 'audit')    loadAudit();
}

function toast(msg, color) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = color || 'var(--border)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  return r.json();
}

// ── Health ────────────────────────────────────────────────────────────────────
async function loadHealth() {
  const d = await api('GET', '/health');
  const dot = document.getElementById('health-dot');
  const label = document.getElementById('health-label');
  dot.style.background = d.status === 'ok' ? 'var(--green)' : 'var(--red)';
  label.textContent = d.status === 'ok' ? 'Healthy' : 'Unhealthy';

  const cards = [
    { label: 'Status',       value: d.status },
    { label: 'Version',      value: d.version || '—' },
    { label: 'Uptime',       value: d.uptime ? fmtUptime(d.uptime) : '—' },
    { label: 'Active sessions', value: d.sessions?.active ?? '—' },
    { label: 'Jobs queued',  value: d.jobs?.queued ?? '—' },
    { label: 'Jobs running', value: d.jobs?.running ?? '—' },
    { label: 'Heap used',    value: d.memory?.heapUsedMb ? d.memory.heapUsedMb + ' MB' : '—' },
    { label: 'RSS',          value: d.memory?.rssMb ? d.memory.rssMb + ' MB' : '—' },
  ];
  document.getElementById('health-grid').innerHTML = cards.map(c =>
    '<div class="health-card"><div class="label">' + c.label + '</div>' +
    '<div class="value">' + c.value + '</div></div>'
  ).join('');
}

function fmtUptime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h > 0 ? h + 'h ' : '') + (m > 0 ? m + 'm ' : '') + s + 's';
}

// ── Agents ────────────────────────────────────────────────────────────────────
async function loadAgents() {
  const d = await api('GET', '/registry/agents');
  agentsData = d.agents || [];
  renderAgents();
}

function renderAgents() {
  const q = document.getElementById('agents-search').value.toLowerCase();
  const rows = agentsData.filter(a => !q || a.name.toLowerCase().includes(q));
  document.getElementById('agents-tbody').innerHTML = rows.map(a => \`
    <tr>
      <td><strong>\${esc(a.name)}</strong><br><span class="mono muted">\${a.agentId.slice(0,8)}…</span></td>
      <td>\${esc(a.owner)}<br><span class="muted">\${esc(a.contactEmail)}</span></td>
      <td><span class="badge-status status-\${a.status}">\${a.status}</span></td>
      <td class="muted">\${fmtDate(a.registeredAt)}</td>
      <td>
        \${a.status === 'pending' ? '<button class="btn-success" onclick="agentAction(\\'' + a.agentId + '\\',\\'approve\\')">Approve</button>' : ''}
        \${a.status !== 'revoked' ? '<button class="btn-danger" style="margin-left:4px" onclick="agentAction(\\'' + a.agentId + '\\',\\'revoke\\')">Revoke</button>' : ''}
      </td>
    </tr>
  \`).join('');
}

async function agentAction(id, action) {
  if (!confirm('Are you sure you want to ' + action + ' this agent?')) return;
  const d = await api('PATCH', '/registry/agents/' + id + '/' + action);
  if (d.error) { toast('Error: ' + d.error, 'var(--red)'); return; }
  toast('Agent ' + action + 'd', 'var(--green)');
  loadAgents();
}

// ── Sites ─────────────────────────────────────────────────────────────────────
async function loadSites() {
  const d = await api('GET', '/registry/sites');
  sitesData = d.sites || [];
  renderSites();
}

function renderSites() {
  const q = document.getElementById('sites-search').value.toLowerCase();
  const rows = sitesData.filter(s => !q || s.domain.toLowerCase().includes(q));
  document.getElementById('sites-tbody').innerHTML = rows.map(s => \`
    <tr>
      <td><strong>\${esc(s.domain)}</strong><br><span class="mono muted">\${s.siteId.slice(0,8)}…</span></td>
      <td>\${esc(s.ownerName)}<br><span class="muted">\${esc(s.contactEmail)}</span></td>
      <td><span class="badge-status status-\${s.status}">\${s.status}</span></td>
      <td class="muted">\${fmtDate(s.registeredAt)}</td>
      <td>
        \${s.status === 'pending' ? '<button class="btn-success" onclick="siteAction(\\'' + s.siteId + '\\',\\'approve\\')">Approve</button>' : ''}
        \${s.status !== 'revoked' ? '<button class="btn-danger" style="margin-left:4px" onclick="siteAction(\\'' + s.siteId + '\\',\\'revoke\\')">Revoke</button>' : ''}
      </td>
    </tr>
  \`).join('');
}

async function siteAction(id, action) {
  if (!confirm('Are you sure you want to ' + action + ' this site?')) return;
  const d = await api('PATCH', '/registry/sites/' + id + '/' + action);
  if (d.error) { toast('Error: ' + d.error, 'var(--red)'); return; }
  toast('Site ' + action + 'd', 'var(--green)');
  loadSites();
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
async function loadJobs() {
  const d = await api('GET', '/agents/jobs');
  jobsData = d.jobs || [];
  renderJobs();
}

function renderJobs() {
  const filter = document.getElementById('jobs-filter').value;
  const rows = filter ? jobsData.filter(j => j.status === filter) : jobsData;
  document.getElementById('jobs-tbody').innerHTML = rows.map(j => \`
    <tr>
      <td class="mono">\${j.jobId.slice(0,8)}…</td>
      <td class="mono">\${j.agentId.slice(0,8)}…</td>
      <td><span class="badge-status status-\${j.status}">\${j.status}</span></td>
      <td class="muted">\${fmtDate(j.createdAt)}</td>
      <td class="muted">\${j.finishedAt ? fmtDate(j.finishedAt) : '—'}</td>
    </tr>
  \`).join('');
}

// ── Audit ─────────────────────────────────────────────────────────────────────
async function loadAudit(offset) {
  auditOffset = offset || 0;
  const params = new URLSearchParams({ limit: '50', offset: String(auditOffset) });
  const agentId = document.getElementById('audit-agent').value.trim();
  const domain  = document.getElementById('audit-domain').value.trim();
  const outcome = document.getElementById('audit-outcome').value;
  const since   = document.getElementById('audit-since').value;
  if (agentId) params.set('agentId', agentId);
  if (domain)  params.set('domain', domain);
  if (outcome) params.set('outcome', outcome);
  if (since)   params.set('since', since);
  const d = await api('GET', '/agents/audit?' + params);
  auditData  = d.entries || [];
  auditTotal = d.total   || 0;
  renderAudit();
}

function renderAudit() {
  document.getElementById('audit-tbody').innerHTML = auditData.map(e => \`
    <tr>
      <td class="muted">\${fmtDate(e.startedAt)}</td>
      <td class="mono">\${e.agentId.slice(0,8)}…</td>
      <td>\${esc(e.domain)}</td>
      <td class="muted">\${e.tools.join(', ')}</td>
      <td><span class="badge-status status-\${e.outcome}">\${e.outcome}</span></td>
      <td class="muted">\${e.finishedAt ? dur(e.startedAt, e.finishedAt) : '…'}</td>
    </tr>
  \`).join('');
  const pg = document.getElementById('audit-page');
  pg.innerHTML = auditTotal > 50 ? \`Showing \${auditOffset+1}–\${Math.min(auditOffset+50,auditTotal)} of \${auditTotal}
    \${auditOffset > 0 ? '<button class="btn-secondary" onclick="loadAudit(' + (auditOffset-50) + ')">← Prev</button>' : ''}
    \${auditOffset+50 < auditTotal ? '<button class="btn-secondary" onclick="loadAudit(' + (auditOffset+50) + ')">Next →</button>' : ''}
  \` : '';
}

function clearAuditFilters() {
  ['audit-agent','audit-domain','audit-since'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('audit-outcome').value = '';
  loadAudit();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(s) { return s ? new Date(s).toLocaleString() : '—'; }
function dur(a, b) {
  const ms = new Date(b) - new Date(a);
  return ms < 1000 ? ms + 'ms' : (ms/1000).toFixed(1) + 's';
}

// Boot
loadHealth();
</script>
</body>
</html>`;

export default dashboardRouter;
