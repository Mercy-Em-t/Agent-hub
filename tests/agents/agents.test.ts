import { BaseAgent, AgentContext } from '../../src/agents/BaseAgent';
import { WebAgent } from '../../src/agents/WebAgent';
import { PageController } from '../../src/browser/PageController';
import { AgentTool, ToolResult } from '../../src/tools/types';
import { z } from 'zod';

// ─────────────────────────────────────────────────────── Helpers
const mockContext: AgentContext = {
  agentId: 'agent-1',
  sessionId: 'session-1',
  metadata: {},
};

function mockPage(): PageController {
  return {
    navigate: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    fill: jest.fn().mockResolvedValue(undefined),
    select: jest.fn().mockResolvedValue(undefined),
    pressKey: jest.fn().mockResolvedValue(undefined),
    snapshot: jest.fn().mockResolvedValue({
      url: 'https://example.com',
      title: 'Example',
      bodyText: 'Hello world',
    }),
    waitForSelector: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('png')),
    readText: jest.fn().mockResolvedValue('text'),
    evaluate: jest.fn().mockResolvedValue(null),
    currentUrl: 'https://example.com',
  } as unknown as PageController;
}

// ─────────────────────────────────────────────────────── BaseAgent
describe('BaseAgent', () => {
  const EchoTool: AgentTool<{ message: string }, string> = {
    name: 'echo',
    description: 'Echoes the message',
    inputSchema: z.object({ message: z.string() }),
    async execute(input): Promise<ToolResult<string>> {
      return { success: true, data: input.message };
    },
  };

  class ConcreteAgent extends BaseAgent {
    public lastResult: ToolResult<unknown> | null = null;

    async run(page: PageController): Promise<void> {
      this.lastResult = await this.useTool('echo', { message: 'hi' }, page);
    }
  }

  it('registers tools and exposes their names', () => {
    const agent = new ConcreteAgent(mockContext, [EchoTool]);
    expect(agent.toolNames).toContain('echo');
  });

  it('executes a registered tool and returns its result', async () => {
    const agent = new ConcreteAgent(mockContext, [EchoTool]);
    await agent.run(mockPage());
    expect(agent.lastResult).toEqual({ success: true, data: 'hi' });
  });

  it('returns an error for an unregistered tool', async () => {
    class BadAgent extends BaseAgent {
      public result: ToolResult<unknown> | null = null;
      async run(page: PageController): Promise<void> {
        this.result = await this.useTool('nonexistent', {}, page);
      }
    }
    const agent = new BadAgent(mockContext, []);
    await agent.run(mockPage());
    expect(agent.result?.success).toBe(false);
    expect(agent.result?.error).toMatch(/not registered/);
  });

  it('validates tool input via zod and returns an error on invalid input', async () => {
    class BadInputAgent extends BaseAgent {
      public result: ToolResult<unknown> | null = null;
      async run(page: PageController): Promise<void> {
        // Pass a number instead of a string
        this.result = await this.useTool('echo', { message: 42 }, page);
      }
    }
    const agent = new BadInputAgent(mockContext, [EchoTool]);
    await agent.run(mockPage());
    expect(agent.result?.success).toBe(false);
    expect(agent.result?.error).toMatch(/Invalid input/);
  });
});

// ─────────────────────────────────────────────────────── WebAgent
describe('WebAgent', () => {
  it('runs a task with zero steps successfully', async () => {
    const agent = new WebAgent(mockContext, {
      startUrl: 'https://example.com',
      steps: [],
    });
    await agent.run(mockPage());
    // Should have one result: the initial navigation
    expect(agent.results).toHaveLength(1);
    expect(agent.results[0].tool).toBe('navigate');
    expect(agent.results[0].result.success).toBe(true);
  });

  it('records results for each step', async () => {
    const agent = new WebAgent(mockContext, {
      startUrl: 'https://example.com',
      steps: [{ tool: 'screenshot', input: {} }],
    });
    await agent.run(mockPage());
    expect(agent.results).toHaveLength(2); // navigate + screenshot
  });

  it('throws when a step fails', async () => {
    const page = mockPage();
    (page.screenshot as jest.Mock).mockRejectedValueOnce(new Error('Screenshot failed'));

    const agent = new WebAgent(mockContext, {
      startUrl: 'https://example.com',
      steps: [{ tool: 'screenshot', input: {} }],
    });

    await expect(agent.run(page)).rejects.toThrow('Screenshot failed');
  });
});
