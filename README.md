# Agent-hub

> A platform for onboarding AI agents to work **alongside humans** in the tech space — enabling agents to navigate websites, interact with UI elements, fill forms, and complete web-based workflows, just as a human operator would.

---

## Overview

Agent-hub provides:

| Layer | What it does |
|---|---|
| **Browser** | Launches and manages Playwright browser instances with isolated contexts per agent |
| **PageController** | High-level wrapper exposing navigate, click, fill, select, screenshot, read, evaluate |
| **Tools** | Composable, schema-validated actions agents can invoke: `navigate`, `click`, `fillForm`, `readContent`, `screenshot`, `waitForSelector`, `selectOption` |
| **Agents** | `BaseAgent` abstract class + `WebAgent` concrete implementation that sequences tool calls |
| **Sessions** | `SessionManager` for concurrent, isolated browser sessions with lifecycle tracking |
| **REST API** | Express server — POST a task, get back structured results |

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

### `GET /agents/sessions`

Returns a list of all active sessions.

### `POST /agents/run`

Run a task synchronously. The agent navigates to `startUrl`, then executes each `step` in sequence.

**Request body**

```json
{
  "startUrl": "https://example.com",
  "steps": [
    {
      "tool": "click",
      "input": { "selector": "a.login" }
    },
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
    {
      "tool": "readContent",
      "input": { "selector": ".dashboard-welcome" }
    }
  ]
}
```

**Response**

```json
{
  "agentId": "uuid",
  "sessionId": "uuid",
  "status": "completed",
  "results": [
    { "step": 0, "tool": "navigate", "result": { "success": true, "data": { "url": "...", "title": "...", "bodyText": "..." } } },
    { "step": 1, "tool": "click",    "result": { "success": true, "data": { ... } } },
    ...
  ]
}
```

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

---

## Using as a Library

```typescript
import { BrowserManager, PageController } from 'agent-hub';
import { SessionManager } from 'agent-hub';
import { WebAgent } from 'agent-hub';

const browser = new BrowserManager({ headless: true });
await browser.launch();

const sessions = new SessionManager(browser);
const session  = await sessions.create('my-agent');
const page     = await sessions.newPage(session.id);

const agent = new WebAgent(
  { agentId: 'my-agent', sessionId: session.id, metadata: {} },
  {
    startUrl: 'https://example.com',
    steps: [
      { tool: 'click',       input: { selector: 'a.signup' } },
      { tool: 'readContent', input: {} },
    ],
  },
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
├── agents/         BaseAgent (abstract) + WebAgent (step-by-step runner)
├── browser/        BrowserManager + PageController (Playwright wrapper)
├── tools/          Seven built-in tools, each with Zod input validation
├── sessions/       SessionManager — concurrent isolated browser contexts
├── api/            Express REST API (server + routes)
├── config/         Default configuration
└── index.ts        Entry-point (server) + library re-exports

tests/
├── agents/         Agent unit tests
├── tools/          Tool unit tests (mock PageController)
├── sessions/       SessionManager unit tests
└── api/            API integration tests (supertest)
```
