import { PageController } from '../browser/PageController';
import { AgentTool, ToolResult } from '../tools/types';

export interface AgentCapabilities {
  /** List of tool names this agent is allowed to use */
  allowedTools: string[];
}

export interface AgentContext {
  /** Unique identifier for this agent */
  agentId: string;
  /** Session this agent is operating in */
  sessionId: string;
  /** Metadata the agent can carry across steps */
  metadata: Record<string, unknown>;
}

/**
 * BaseAgent is the abstract foundation for all AI agents in the hub.
 * Concrete agent implementations extend this class and override `run`.
 */
export abstract class BaseAgent {
  readonly context: AgentContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly tools: Map<string, AgentTool<any, any>>;

  constructor(
    context: AgentContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: AgentTool<any, any>[],
  ) {
    this.context = context;
    this.tools = new Map(tools.map((t) => [t.name, t]));
  }

  /**
   * Execute a named tool with the given input against the provided page.
   */
  protected async useTool<TIn, TOut>(
    toolName: string,
    input: TIn,
    page: PageController,
  ): Promise<ToolResult<TOut>> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" is not registered for this agent.`,
      };
    }

    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid input for tool "${toolName}": ${parsed.error.message}`,
      };
    }

    return tool.execute(parsed.data, page);
  }

  /**
   * Return the names of all registered tools.
   */
  get toolNames(): string[] {
    return [...this.tools.keys()];
  }

  /**
   * Main entry point. Subclasses implement the agent's task logic here.
   */
  abstract run(page: PageController): Promise<void>;
}
