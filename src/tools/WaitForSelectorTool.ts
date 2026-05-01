import { z } from 'zod';
import { AgentTool, ToolResult } from './types';

const WaitForSelectorInput = z.object({
  selector: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
});

type WaitForSelectorInput = z.infer<typeof WaitForSelectorInput>;

export const WaitForSelectorTool: AgentTool<WaitForSelectorInput, { selector: string }> = {
  name: 'waitForSelector',
  description:
    'Wait until an element matching the given CSS selector becomes visible. ' +
    'Useful after triggering actions that load new content.',

  inputSchema: WaitForSelectorInput,

  async execute(input, page): Promise<ToolResult<{ selector: string }>> {
    try {
      await page.waitForSelector(input.selector, input.timeoutMs);
      return { success: true, data: { selector: input.selector } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
