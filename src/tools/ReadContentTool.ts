import { z } from 'zod';
import { AgentTool, ToolResult } from './types';

const ReadContentInput = z.object({
  selector: z
    .string()
    .optional()
    .describe('CSS selector to limit reading to a specific element. Omit to read the whole page.'),
});

type ReadContentInput = z.infer<typeof ReadContentInput>;

interface ReadContentOutput {
  url: string;
  title: string;
  content: string;
}

export const ReadContentTool: AgentTool<ReadContentInput, ReadContentOutput> = {
  name: 'readContent',
  description:
    'Read the visible text content of the current page or a specific element. ' +
    'Useful for extracting information before making decisions.',

  inputSchema: ReadContentInput,

  async execute(input, page): Promise<ToolResult<ReadContentOutput>> {
    try {
      const { url, title } = await page.snapshot();
      const content = input.selector
        ? await page.readText(input.selector)
        : (await page.snapshot()).bodyText;

      return { success: true, data: { url, title, content } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
