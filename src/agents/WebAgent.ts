import { PageController } from '../browser/PageController';
import { builtinTools } from '../tools';
import { AgentTool } from '../tools/types';
import { BaseAgent, AgentContext } from './BaseAgent';

export interface WebAgentTask {
  /** Starting URL for the task */
  startUrl: string;
  /**
   * Ordered list of steps the agent will execute.
   * Each step names a tool and provides its input.
   */
  steps: Array<{
    tool: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: Record<string, any>;
  }>;
}

/**
 * WebAgent is a general-purpose agent that executes a sequence of tool
 * steps against a web page.  It is the primary built-in agent type and
 * demonstrates how to compose the browser + tools layers.
 */
export class WebAgent extends BaseAgent {
  private readonly task: WebAgentTask;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly results: Array<{ step: number; tool: string; result: Record<string, any> }> = [];

  constructor(
    context: AgentContext,
    task: WebAgentTask,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraTools: AgentTool<any, any>[] = [],
  ) {
    super(context, [...builtinTools, ...extraTools]);
    this.task = task;
  }

  async run(page: PageController): Promise<void> {
    // Navigate to the starting URL first
    const navResult = await this.useTool('navigate', { url: this.task.startUrl }, page);
    this.results.push({ step: 0, tool: 'navigate', result: navResult });

    if (!navResult.success) {
      throw new Error(`Failed to navigate to ${this.task.startUrl}: ${navResult.error}`);
    }

    // Execute each step in sequence
    for (let i = 0; i < this.task.steps.length; i++) {
      const step = this.task.steps[i];
      const result = await this.useTool(step.tool, step.input, page);
      this.results.push({ step: i + 1, tool: step.tool, result });

      if (!result.success) {
        throw new Error(
          `Step ${i + 1} (tool="${step.tool}") failed: ${result.error}`,
        );
      }
    }
  }
}
