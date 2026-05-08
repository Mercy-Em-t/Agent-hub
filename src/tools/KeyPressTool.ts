import { z } from 'zod';
import { AgentTool, ToolResult } from './types';

const KeyPressInput = z.object({
  key: z
    .string()
    .min(1)
    .describe(
      'Key name as understood by Playwright (e.g. "Enter", "Tab", "Escape", "ArrowDown", "a").',
    ),
  count: z
    .number()
    .int()
    .positive()
    .max(20)
    .optional()
    .describe('Number of times to press the key. Defaults to 1.'),
});

type KeyPressInput = z.infer<typeof KeyPressInput>;

export const KeyPressTool: AgentTool<KeyPressInput, { key: string; count: number }> = {
  name: 'keyPress',
  description:
    'Press a keyboard key one or more times (e.g. Tab to move focus, Enter to submit, ' +
    'ArrowDown to navigate a list). Does not return a page snapshot to keep responses light.',

  inputSchema: KeyPressInput,

  async execute(input, page): Promise<ToolResult<{ key: string; count: number }>> {
    const count = input.count ?? 1;
    try {
      for (let i = 0; i < count; i++) {
        await page.pressKey(input.key);
      }
      return { success: true, data: { key: input.key, count } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
