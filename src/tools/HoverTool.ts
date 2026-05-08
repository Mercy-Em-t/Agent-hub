import { z } from 'zod';
import type { PageSnapshot } from '../browser/PageController';
import { AgentTool, ToolResult } from './types';

const HoverInput = z.object({
  selector: z.string().min(1, 'Selector must not be empty'),
});

type HoverInput = z.infer<typeof HoverInput>;

export const HoverTool: AgentTool<HoverInput, PageSnapshot> = {
  name: 'hover',
  description:
    'Move the mouse pointer over an element identified by a CSS selector. ' +
    'Useful for revealing tooltips or triggering hover-activated menus. ' +
    'Returns an updated page snapshot.',

  inputSchema: HoverInput,

  async execute(input, page): Promise<ToolResult<PageSnapshot>> {
    try {
      await page.hover({ selector: input.selector });
      const snapshot = await page.snapshot();
      return { success: true, data: snapshot };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
