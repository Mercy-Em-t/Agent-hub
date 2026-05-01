import { z } from 'zod';
import type { PageSnapshot } from '../browser/PageController';
import { AgentTool, ToolResult } from './types';

const NavigateInput = z.object({
  url: z.string().url('Must be a valid URL'),
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle', 'commit'])
    .optional(),
});

type NavigateInput = z.infer<typeof NavigateInput>;

export const NavigationTool: AgentTool<NavigateInput, PageSnapshot> = {
  name: 'navigate',
  description:
    'Navigate the browser to a URL. Returns a page snapshot with the URL, title, and visible text.',

  inputSchema: NavigateInput,

  async execute(input, page): Promise<ToolResult<PageSnapshot>> {
    try {
      await page.navigate(input.url, { waitUntil: input.waitUntil });
      const snapshot = await page.snapshot();
      return { success: true, data: snapshot };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
