# Agent-hub System Readiness Audit

_Generated: 2026-05-04_

---

## ✅ Use Cases Fully Implemented & Ready

### 1. Agent Lifecycle Management

| Action | Endpoint |
|--------|----------|
| Register an agent (returns `agentId` + `apiKey`) | `POST /registry/agents` |
| Approve an agent | `PATCH /registry/agents/:id/approve` |
| Revoke an agent | `PATCH /registry/agents/:id/revoke` |
| List all agents | `GET /registry/agents` |
| Get a specific agent | `GET /registry/agents/:id` |

Every new agent starts in `pending` status. An operator must approve it before it can execute tasks. Once revoked it cannot be re-approved.

---

### 2. Site Consent & Governance

| Action | Endpoint |
|--------|----------|
| Register a website as a consenting participant | `POST /registry/sites` |
| Approve a site (opens it to agents) | `PATCH /registry/sites/:id/approve` |
| Revoke a site (blocks agent access immediately) | `PATCH /registry/sites/:id/revoke` |
| List all sites | `GET /registry/sites` |
| Get a specific site | `GET /registry/sites/:id` |

Agents can only visit domains that have been registered **and** approved as sites.

---

### 3. Gateway Enforcement (7-layer security)

Every `POST /agents/run` call passes through `AgentGateway.check()` before a browser session is opened:

1. Agent must be registered with the correct `apiKey`
2. Agent must have `status: approved`
3. Target domain must be registered and approved as a site
4. Target domain must **not** be in the agent's `deniedDomains`
5. Target domain must be in the agent's `allowedDomains` (if that list is non-empty)
6. All intended tools must be in the agent's `allowedTools` (if that list is non-empty)
7. All intended tools must be in the site's `allowedCapabilities` (if that list is non-empty)

---

### 4. Browser Automation — 10 Built-in Tools

| Tool | What it does |
|------|--------------|
| `navigate` | Go to a URL; wait for page ready |
| `click` | Click a CSS/text selector |
| `fill` | Fill a text input or textarea |
| `select` | Choose `<select>` option(s) |
| `hover` | Hover the mouse over an element |
| `scroll` | Scroll the page or a specific element (up/down/left/right) |
| `keyPress` | Press a keyboard key (e.g. `Enter`, `Tab`, `Escape`) |
| `readContent` | Extract text content of a matched element |
| `screenshot` | Capture a full-page PNG screenshot |
| `waitForSelector` | Wait for a DOM element to become visible |

All tools are validated by Zod schemas and surfaced via `GET /tools` (live catalog with JSON Schemas) so agents can self-discover valid inputs without reading source code.

---

### 5. Synchronous Task Execution

`POST /agents/run` — runs a `WebAgent` step sequence synchronously and returns all step results inline.

```jsonc
{
  "agentId": "<uuid>",
  "apiKey": "<secret>",
  "startUrl": "https://example.com",
  "steps": [
    { "tool": "click",    "input": { "selector": "#login" } },
    { "tool": "fill",     "input": { "selector": "#email", "value": "user@example.com" } },
    { "tool": "keyPress", "input": { "key": "Enter" } }
  ]
}
```

---

### 6. Asynchronous Job Queue

| Action | Endpoint |
|--------|----------|
| Submit a task (returns `jobId` immediately, HTTP 202) | `POST /agents/run/async` |
| Poll for job status and results | `GET /agents/jobs/:jobId` |
| List all submitted jobs | `GET /agents/jobs` |

Job states: `queued` → `running` → `completed` / `failed`.

---

### 7. Session Management

- One isolated Playwright `BrowserContext` per session (equivalent to a separate browser profile)
- Session lifecycle: `idle` → `running` → `completed` / `error`
- Configurable `maxConcurrentSessions` (default: 10)
- `GET /agents/sessions` — list active sessions
- Sessions are automatically closed after each task run

---

### 8. Agent-First Discovery Endpoints

| Endpoint | What it returns |
|----------|----------------|
| `GET /capabilities` | Bootstrap manifest: hub description, all interfaces, auth requirements, 5-step quickstart |
| `GET /tools` | Live tool catalog — name, description, JSON Schema input definitions |
| `GET /openapi.json` | Full OpenAPI 3.1 specification |

All three require no authentication — an AI agent can self-orient from zero.

---

### 9. CLI (15 commands, zero extra dependencies)

Uses Node built-in `https` only.

```
health
capabilities
tools
agents list
agents get <id>
agents register
agents approve <id>
agents revoke <id>
sites list
sites register
sites approve <id>
sites revoke <id>
run
submit
jobs list
jobs get <jobId>
```

Invoked via: `npx ts-node src/cli/index.ts <command>`

---

### 10. MCP Server (15 tools, zero extra dependencies)

Model Context Protocol 2024-11-05 over stdio JSON-RPC 2.0. Compatible with Claude Desktop, Cursor, and any MCP client.

| MCP Tool | Maps to |
|----------|---------|
| `hub_health` | `GET /health` |
| `hub_capabilities` | `GET /capabilities` |
| `hub_list_tools` | `GET /tools` |
| `hub_register_agent` | `POST /registry/agents` |
| `hub_approve_agent` | `PATCH /registry/agents/:id/approve` |
| `hub_revoke_agent` | `PATCH /registry/agents/:id/revoke` |
| `hub_list_agents` | `GET /registry/agents` |
| `hub_get_agent` | `GET /registry/agents/:id` |
| `hub_register_site` | `POST /registry/sites` |
| `hub_approve_site` | `PATCH /registry/sites/:id/approve` |
| `hub_list_sites` | `GET /registry/sites` |
| `hub_run_task` | `POST /agents/run` |
| `hub_submit_task` | `POST /agents/run/async` |
| `hub_poll_job` | `GET /agents/jobs/:jobId` |
| `hub_list_jobs` | `GET /agents/jobs` |

---

### 11. WhatsApp Notifications

Lifecycle events (registered, approved, revoked) are sent to the agent owner's phone number via the Twilio Messaging API.

- **Implementation:** `TwilioWhatsAppNotifier` — Node built-in `https`, no extra packages
- **Environment variables required:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- **Fallback:** `NullWhatsAppNotifier` (no-op) when credentials are absent
- **Webhook:** `POST /whatsapp/webhook` receives inbound TwiML messages from Twilio

---

### 12. Rich Agent Onboarding Declaration

Beyond basic identity, agents can declare structured governance metadata:

| Field | Type | Purpose |
|-------|------|---------|
| `goals` | `string[]` | Outcomes the agent is trying to achieve |
| `workingProcedure` | `string[]` | Ordered SOP steps (how it works) |
| `responsibilityBounds` | `{ responsible, notResponsible }` | What the agent IS and IS NOT accountable for |
| `website` | URL string | Agent's primary home URL |
| `ownerPhone` | E.164 string | WhatsApp number for lifecycle notifications |

All fields are optional in both the TypeScript interface and the Zod validation schema.

---

## ❌ Use Cases Not Yet Implemented (Gaps)

### 🔴 High Priority

| Gap | Description |
|-----|-------------|
| **Operator authentication** | Any HTTP client can approve/revoke agents and sites. Admin endpoints (`PATCH /registry/agents/:id/approve`, etc.) have no operator API key or auth layer. |
| **Persistent storage** | All registries, jobs, and sessions are in-memory only. A server restart wipes everything. No database adapter (SQLite, Postgres, Redis) exists. |
| **WhatsApp inbound commands** | `POST /whatsapp/webhook` receives TwiML but has no command-processing logic. Owners cannot issue `approve <name>`, `revoke <name>`, `status`, or `help` commands via WhatsApp. |
| **Webhook / push notifications on job completion** | No way for an async job to push results to a caller. Agents must poll `GET /agents/jobs/:jobId`. No webhook-on-complete support. |
| **Pagination** | `GET /registry/agents`, `GET /registry/sites`, `GET /agents/jobs` return unbounded lists with no `limit`/`offset`/cursor support. |

---

### 🟡 Medium Priority

| Gap | Description |
|-----|-------------|
| **Multi-page / multi-tab navigation** | `WebAgent` runs one page per task. No support for opening multiple tabs, following redirects to new windows, or handling popups/dialogs. |
| **File upload / download** | No `uploadFile` or `downloadFile` tool. Agents cannot interact with `<input type="file">` or save downloaded content. |
| **JavaScript evaluation tool** | `PageController.evaluate()` exists internally but is not exposed as a built-in `AgentTool` step that tasks can invoke. |
| **Agent update endpoint** | No `PATCH /registry/agents/:id` to update `allowedDomains`, `allowedTools`, `constraints`, etc. after registration. Currently requires revoke + re-register. |
| **`hub_get_site` in CLI and MCP** | `GET /registry/sites/:id` exists in the REST API but there is no `hub_get_site` MCP tool and no `sites get <id>` CLI command. |
| **Rate limiting** | No per-agent request throttling, no per-site concurrency cap, no global request-rate limiter on the REST API. |
| **Audit / activity log** | No record of which agent ran which task against which site at what time. Important for governance, debugging, and compliance. |

---

### 🟢 Lower Priority / Future

| Gap | Description |
|-----|-------------|
| **Human-in-the-loop approval flow** | Approval is a raw HTTP call. No email confirmation, UI dashboard, or time-gated review window. |
| **Agent versioning** | No concept of agent versions; updating capabilities requires revoke + re-register. |
| **Typed tool output schemas** | Job results are free-form `Record<string, any>`. No typed output schema per tool for downstream consumers. |
| **Enriched health endpoint** | `GET /health` returns `{status: "ok"}`. No uptime, session counts, job queue depth, or memory stats. |
| **Browser type selection per task** | `BrowserManager` supports `chromium`, `firefox`, `webkit` but the REST/MCP/CLI interfaces have no way to request a specific engine. |
| **Step retry / error recovery** | A failed step in `WebAgent.run()` throws immediately. No retry policy, partial-result recovery, or conditional branching between steps. |
| **Structured task result schema** | No formal schema for step output — difficult to build reliable downstream processing on results. |

---

## Quick-start Checklist (All Ready Today)

```
1.  POST /registry/agents       → register your agent, store agentId + apiKey
2.  PATCH /registry/agents/:id/approve  → approve your agent
3.  POST /registry/sites        → register the target site
4.  PATCH /registry/sites/:id/approve  → approve the site
5.  POST /agents/run            → execute browser-automation steps
```

Or via MCP: `hub_register_agent` → `hub_approve_agent` → `hub_register_site` → `hub_approve_site` → `hub_run_task`
