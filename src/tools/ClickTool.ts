import { z } from 'zod';
import type { PageSnapshot } from '../browser/PageController';
import { AgentTool, ToolResult } from './types';

const ClickInput = z.object({
  selector: z.string().min(1, 'Selector must not be empty'),
  delayMs: z.number().int().nonnegative().optional(),
});

type ClickInput = z.infer<typeof ClickInput>;

export const ClickTool: AgentTool<ClickInput, PageSnapshot> = {
  name: 'click',
  description:
    'Click an element on the current page identified by a CSS selector. ' +
    'Returns an updated page snapshot after the click.',

  inputSchema: ClickInput,

  async execute(input, page): Promise<ToolResult<PageSnapshot>> {
    try {
      await page.click({ selector: input.selector, delayMs: input.delayMs });
      const snapshot = await page.snapshot();
      return { success: true, data: snapshot };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
