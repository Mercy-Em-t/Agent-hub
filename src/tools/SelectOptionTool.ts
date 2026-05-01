import { z } from 'zod';
import type { PageSnapshot } from '../browser/PageController';
import { AgentTool, ToolResult } from './types';

const SelectOptionInput = z.object({
  selector: z.string().min(1),
  values: z.array(z.string()).min(1),
});

type SelectOptionInput = z.infer<typeof SelectOptionInput>;

export const SelectOptionTool: AgentTool<SelectOptionInput, PageSnapshot> = {
  name: 'selectOption',
  description:
    'Select one or more options in a <select> dropdown element. ' +
    'Returns an updated page snapshot.',

  inputSchema: SelectOptionInput,

  async execute(input, page): Promise<ToolResult<PageSnapshot>> {
    try {
      await page.select({ selector: input.selector, values: input.values });
      const snapshot = await page.snapshot();
      return { success: true, data: snapshot };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
