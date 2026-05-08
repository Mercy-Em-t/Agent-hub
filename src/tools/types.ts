import { z } from 'zod';
import { PageController } from '../browser/PageController';

/** Every tool result carries a success flag and optional data / error message. */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** A callable tool that an agent can invoke against a PageController. */
export interface AgentTool<TInput, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  execute(input: TInput, page: PageController): Promise<ToolResult<TOutput>>;
}
