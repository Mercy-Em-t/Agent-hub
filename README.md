# Agent-hub

> A platform for onboarding AI agents to work **alongside humans** in the tech space — enabling agents to navigate websites, interact with UI elements, fill forms, and complete web-based workflows, just as a human operator would.

---

## Overview

Agent-hub provides:

| Layer | What it does |
|---|---|
| **Registry** | Agents and websites must **declare themselves** before gaining access. No anonymous operations. |
| **Gateway** | Every task request passes through a multi-rule entry-gate before a browser session is opened. |
| **Browser** | Launches and manages Playwright browser instances with isolated contexts per agent |
| **PageController** | High-level wrapper exposing navigate, click, fill, hover, scroll, select, screenshot, read, evaluate |
| **Tools** | Composable, schema-validated actions agents can invoke (10 built-in) |
| **Agents** | `BaseAgent` abstract class + `WebAgent` concrete implementation that sequences tool calls |
| **Sessions** | `SessionManager` for concurrent, isolated browser sessions with lifecycle tracking |
| **Jobs** | `JobStore` for async task tracking (queued → running → completed/failed) |
| **WhatsApp** | Owner notification + command interface via Twilio WhatsApp API |
| **REST API** | Express server — registry, gateway-protected task execution, async jobs, WhatsApp webhook |

---

## The Entry Gateway — agents declare before they operate

No AI agent may perform any task without first passing through a two-sided declaration system:

### 1. Agent Registration (AI operators declare their agents)

Every agent must declare:

| Field | Governance question it answers |
|---|---|
| `name` / `owner` / `contactEmail` | Who is this agent and who is accountable? |
| `purpose` / `description` | Why does this agent exist and what does it do? |
| `goals` | What outcomes should this agent produce? |
| `workingProcedure` | How does it carry out its work (ordered SOP steps)? |
| `responsibilityBounds` | What is it explicitly responsible for — and NOT responsible for? |
| `website` | What is its primary home URL? |
| `allowedDomains` / `deniedDomains` | Where may it go (and where must it never go)? |
| `allowedTools` | What actions may it perform? |
| `constraints` | Explicit ethical / operational rules |
| `ownerPhone` | E.164 WhatsApp number for lifecycle notifications (optional) |

Registration status starts as **`pending`** — an operator must explicitly **approve** the agent before it can run. Agents can be **revoked** at any time, immediately blocking all future operations.

### 2. Site Registration (websites consent to agent access)

No agent is dispatched to a domain that hasn't consented. Sites declare:

- Their domain, owner, and contact information
- Which agent capabilities (`allowedCapabilities`) they permit on their pages

Sites also start as **`pending`** and must be approved before agents may visit them.

### Gateway Rules (checked on every `POST /agents/run`)

1. Agent must be registered with a valid API key
2. Agent must be in `approved` status
3. Target domain must be registered and approved as a site
4. Target domain must not be in the agent's `deniedDomains`
5. Target domain must be in the agent's `allowedDomains` (if the list is non-empty)
6. All intended tools must be in the agent's `allowedTools` (if restricted)
7. All intended tools must be in the site's `allowedCapabilities` (if restricted)

Any violation returns `HTTP 403` with a clear reason — the agent is never given a browser session.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Install

```bash
npm install
# Install Playwright browser binaries (first time only)
npx playwright install chromium
```

### Run the API server

```bash
# Development (ts-node, hot-friendly)
npm run dev

# Production (compiled)
npm run build && npm start
```

The server starts on **http://localhost:3000** by default.  
Set the `PORT` environment variable to override.

---

## REST API

### `GET /health`

```json
{ "status": "ok", "version": "0.1.0" }
```

---

### Registry — Agent endpoints

#### `POST /registry/agents` — onboard a new AI agent

```json
{
  "name": "MySearchBot",
  "description": "Searches job listings and extracts results",
  "owner": "Acme AI Team",
  "contactEmail": "ai-ops@acme.com",
  "purpose": "Automate job-search research on behalf of Acme recruiters",
  "goals": [
    "Find and return the top 10 job listings matching a query",
    "Extract job title, company, location, and salary band"
  ],
  "workingProcedure": [
    "Navigate to the target job board",
    "Enter the search query in the search field",
    "Scroll through the results page",
    "Read each listing's title, company, and metadata",
    "Return structured results"
  ],
  "responsibilityBounds": {
    "responsible": ["Reading public job listing pages", "Extracting structured data"],
    "notResponsible": ["Submitting applications", "Making purchases", "Account login"]
  },
  "website": "https://mybot.acme.com",
  "allowedDomains": ["linkedin.com", "indeed.com"],
  "deniedDomains": [],
  "allowedTools": ["navigate", "readContent", "screenshot", "scroll"],
  "constraints": ["Never submit forms", "Never click purchase buttons"],
  "ownerPhone": "+1234567890"
}
```

Returns a `201` with the full registration including `agentId` and `apiKey` (store these — `apiKey` is your agent's credential). Status is `pending`.

If `ownerPhone` is provided, a WhatsApp confirmation message is sent immediately.

#### `PATCH /registry/agents/:agentId/approve` — approve a pending agent
#### `PATCH /registry/agents/:agentId/revoke` — revoke an agent immediately
#### `GET /registry/agents` — list all agent registrations
#### `GET /registry/agents/:agentId` — get a specific registration

---

### Registry — Site endpoints

#### `POST /registry/sites` — register a website for agent access

```json
{
  "domain": "example.com",
  "ownerName": "Example Corp",
  "contactEmail": "webmaster@example.com",
  "description": "Our main product site",
  "allowedCapabilities": ["navigate", "readContent", "screenshot"]
}
```

Returns a `201` with `siteId` and `apiKey`. Status is `pending`.

#### `PATCH /registry/sites/:siteId/approve` — approve a pending site
#### `PATCH /registry/sites/:siteId/revoke` — revoke a site immediately
#### `GET /registry/sites` — list all site registrations
#### `GET /registry/sites/:siteId` — get a specific registration

---

### Execution — gateway-protected

#### `POST /agents/run`

Run a task **synchronously**. Requires a registered + approved agent and a registered + approved target site.

```json
{
  "agentId": "<uuid from registration>",
  "apiKey": "<apiKey from registration>",
  "startUrl": "https://example.com",
  "steps": [
    { "tool": "click",    "input": { "selector": "a.login" } },
    {
      "tool": "fillForm",
      "input": {
        "fields": [
          { "selector": "#email",    "value": "agent@example.com" },
          { "selector": "#password", "value": "s3cr3t" }
        ],
        "submitSelector": "button[type=submit]"
      }
    },
    { "tool": "readContent", "input": { "selector": ".dashboard-welcome" } }
  ]
}
```

**Response on success**

```json
{
  "agentId": "...",
  "sessionId": "...",
  "status": "completed",
  "results": [
    { "step": 0, "tool": "navigate",    "result": { "success": true, "data": { ... } } },
    { "step": 1, "tool": "click",       "result": { "success": true, "data": { ... } } },
    { "step": 2, "tool": "fillForm",    "result": { "success": true, "data": { ... } } },
    { "step": 3, "tool": "readContent", "result": { "success": true, "data": { ... } } }
  ]
}
```

**Response on gateway denial (HTTP 403)**

```json
{
  "error": "Gateway denied the request.",
  "reason": "Domain \"example.com\" is not registered as an approved site. The site must sign up via POST /registry/sites and be approved before agents can visit."
}
```

---

#### `POST /agents/run/async`

Submit a task for **asynchronous** execution and return immediately.  
Uses the same request body as `POST /agents/run`.

**Response — HTTP 202**

```json
{ "jobId": "<uuid>", "status": "queued" }
```

Poll `GET /agents/jobs/:jobId` until `status` is `"completed"` or `"failed"`.

---

#### `GET /agents/jobs/:jobId`

Poll for the status and results of an async job.

**Response while running**

```json
{ "jobId": "...", "agentId": "...", "createdAt": "...", "status": "running" }
```

**Response when completed**

```json
{
  "jobId": "...",
  "agentId": "...",
  "createdAt": "...",
  "finishedAt": "...",
  "status": "completed",
  "results": [ ... ]
}
```

**Response when failed**

```json
{
  "jobId": "...",
  "agentId": "...",
  "createdAt": "...",
  "finishedAt": "...",
  "status": "failed",
  "error": "Step 1 (tool=\"click\") failed: Element not found"
}
```

Returns HTTP **404** if the `jobId` is unknown.

---

#### `GET /agents/jobs`

List all submitted jobs (all statuses).

---

#### `GET /agents/sessions` — list active sessions

---

## WhatsApp Integration

Agent-hub can notify agent owners and accept management commands via WhatsApp, using the **Twilio WhatsApp API**.

### Setup

1. [Sign up for Twilio](https://www.twilio.com/try-twilio) and enable the WhatsApp sandbox (or a production WhatsApp sender).
2. Set the following environment variables:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=+14155238886   # Your Twilio WhatsApp number
```

3. In your Twilio console, point the **"A message comes in"** webhook to:

```
POST https://your-server.example.com/whatsapp/webhook
```

4. When registering an agent, include `ownerPhone` in E.164 format (e.g. `"+1234567890"`).

### Lifecycle Notifications

The owner's WhatsApp number receives a message automatically when:

| Event | Message content |
|---|---|
| Agent registered | Confirmation + pending status + instructions |
| Agent approved | Approval notice |
| Agent revoked | Revocation notice |

### WhatsApp Commands

Send any of the following commands to the Twilio WhatsApp number:

| Command | What it does |
|---|---|
| `help` | Show all available commands |
| `list` | List your registered agents (matched by your phone number) |
| `status <name\|id>` | Get the current status of an agent |
| `approve <name\|id>` | Approve a pending agent (owner only) |
| `revoke <name\|id>` | Revoke an agent (owner only) |
| `info <name\|id>` | Show full onboarding details (goals, procedure, bounds, website) |

`<name|id>` accepts the agent's **display name** (case-insensitive) or the first few characters of its **UUID**.

**Example conversation:**

```
You:     list
Bot:     Your agents:
         • MySearchBot [pending]  id: a3f9b2c1

You:     info MySearchBot
Bot:     Name:    MySearchBot
         Status:  PENDING
         Owner:   Acme AI Team
         Purpose: Automate job-search research...
         Website: https://mybot.acme.com
         Goals:
           1. Find and return the top 10 job listings...
         Procedure:
           1. Navigate to the target job board
           2. Enter the search query...
         Responsible for: Reading public job listing pages
         NOT responsible for: Submitting applications

You:     approve MySearchBot
Bot:     ✅ Agent "MySearchBot" has been approved and can now operate.
```

### Webhook Endpoint

#### `POST /whatsapp/webhook`

Twilio calls this endpoint when an inbound WhatsApp message arrives. Body is `application/x-www-form-urlencoded`.  Returns TwiML XML.

---

## Available Tools

| Tool | Description |
|---|---|
| `navigate` | Navigate to a URL; returns page snapshot |
| `click` | Click an element by CSS selector |
| `fillForm` | Fill one or more inputs; optionally submit |
| `readContent` | Read page or element text |
| `screenshot` | Full-page PNG as base64 |
| `waitForSelector` | Wait for an element to become visible |
| `selectOption` | Choose option(s) in a `<select>` dropdown |
| `hover` | Move the mouse over an element (reveals tooltips / hover menus) |
| `scroll` | Scroll the page window or a specific element in any direction |
| `keyPress` | Press a keyboard key one or more times (Enter, Tab, ArrowDown, …) |

---

## Using as a Library

```typescript
import {
  AgentRegistry, SiteRegistry, AgentGateway,
  BrowserManager, SessionManager, WebAgent,
  NullWhatsAppNotifier,
} from 'agent-hub';

// --- 1. Set up registry + gateway ---
const agentRegistry = new AgentRegistry();
const siteRegistry  = new SiteRegistry();
const gateway       = new AgentGateway(agentRegistry, siteRegistry);

// --- 2. Agents must declare themselves ---
const reg = agentRegistry.register({
  name: 'MySearchBot',
  description: 'Reads job listings',
  owner: 'Alice',
  contactEmail: 'alice@example.com',
  purpose: 'Automate job research',
  goals: ['Return top 10 matching listings'],
  workingProcedure: ['Navigate to board', 'Search', 'Read results'],
  responsibilityBounds: {
    responsible: ['Reading public pages'],
    notResponsible: ['Account login', 'Form submissions'],
  },
  website: 'https://mybot.example.com',
  allowedDomains: ['example.com'],
  deniedDomains: [],
  allowedTools: ['navigate', 'readContent'],
  constraints: ['Never submit forms'],
  ownerPhone: '+1234567890',
});
agentRegistry.approve(reg.agentId);

// --- 3. Sites must consent ---
const site = siteRegistry.register({
  domain: 'example.com',
  ownerName: 'Example Corp',
  contactEmail: 'admin@example.com',
  description: 'Product site',
  allowedCapabilities: ['navigate', 'readContent'],
});
siteRegistry.approve(site.siteId);

// --- 4. Check the gateway before running ---
const check = gateway.check(reg.agentId, reg.apiKey, 'https://example.com', ['navigate']);
if (!check.allowed) throw new Error(check.reason);

// --- 5. Run the agent ---
const browser  = new BrowserManager({ headless: true });
await browser.launch();
const sessions = new SessionManager(browser);
const session  = await sessions.create(reg.agentId);
const page     = await sessions.newPage(session.id);

const agent = new WebAgent(
  { agentId: reg.agentId, sessionId: session.id, metadata: {}, registration: reg },
  { startUrl: 'https://example.com', steps: [{ tool: 'readContent', input: {} }] },
);

await agent.run(page);
console.log(agent.results);

await sessions.close(session.id);
await browser.close();
```

---

## Development

```bash
npm run typecheck   # TypeScript type-check only
npm run lint        # ESLint
npm test            # Jest unit tests
npm run build       # Compile to dist/
```

---

## Project Structure

```
src/
├── registry/       AgentRegistry + SiteRegistry — declaration stores (pending/approved/revoked)
├── gateway/        AgentGateway — entry-gate; enforces all governance rules before any run
├── agents/         BaseAgent (abstract) + WebAgent (step-by-step runner)
├── browser/        BrowserManager + PageController (Playwright wrapper)
├── tools/          Ten built-in tools, each with Zod input validation
├── sessions/       SessionManager — concurrent isolated browser contexts
├── jobs/           JobStore — async task tracking (queued/running/completed/failed)
├── notifications/  IWhatsAppNotifier interface + TwilioWhatsAppNotifier + NullWhatsAppNotifier
├── api/            Express REST API (server + routes: registry, agents, whatsapp)
├── config/         Default configuration
└── index.ts        Entry-point (server) + library re-exports

tests/
├── registry/       AgentRegistry + SiteRegistry unit tests
├── gateway/        AgentGateway unit tests (all governance rules)
├── agents/         Agent unit tests
├── tools/          Tool unit tests (mock PageController)
├── sessions/       SessionManager unit tests
├── jobs/           JobStore unit tests
├── notifications/  WhatsApp notifier unit tests (mocked https)
└── api/            API integration tests (supertest — gateway, async jobs, WhatsApp webhook)
```
