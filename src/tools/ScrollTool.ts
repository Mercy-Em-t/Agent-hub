import { z } from 'zod';
import type { PageSnapshot } from '../browser/PageController';
import { AgentTool, ToolResult } from './types';

const ScrollInput = z.object({
  direction: z.enum(['up', 'down', 'left', 'right']),
  distance: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Pixels to scroll. Defaults to 500.'),
  selector: z
    .string()
    .min(1)
    .optional()
    .describe(
      'CSS selector of the element to scroll. If omitted the page window is scrolled.',
    ),
});

type ScrollInput = z.infer<typeof ScrollInput>;

export const ScrollTool: AgentTool<ScrollInput, PageSnapshot> = {
  name: 'scroll',
  description:
    'Scroll the page window (or a specific scrollable element) in the given direction. ' +
    'Returns an updated page snapshot after scrolling.',

  inputSchema: ScrollInput,

  async execute(input, page): Promise<ToolResult<PageSnapshot>> {
    try {
      await page.scroll({
        direction: input.direction,
        distance: input.distance,
        selector: input.selector,
      });
      const snapshot = await page.snapshot();
      return { success: true, data: snapshot };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
