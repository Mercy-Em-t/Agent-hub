import { z } from 'zod';
import type { PageSnapshot } from '../browser/PageController';
import { AgentTool, ToolResult } from './types';

const FillFormInput = z.object({
  fields: z
    .array(
      z.object({
        selector: z.string().min(1),
        value: z.string(),
      }),
    )
    .min(1, 'At least one field is required'),
  submitSelector: z.string().optional(),
});

type FillFormInput = z.infer<typeof FillFormInput>;

export const FillFormTool: AgentTool<FillFormInput, PageSnapshot> = {
  name: 'fillForm',
  description:
    'Fill one or more form fields and optionally click a submit button. ' +
    'Each field is identified by a CSS selector. ' +
    'Returns an updated page snapshot.',

  inputSchema: FillFormInput,

  async execute(input, page): Promise<ToolResult<PageSnapshot>> {
    try {
      for (const field of input.fields) {
        await page.fill({ selector: field.selector, value: field.value });
      }

      if (input.submitSelector) {
        await page.click({ selector: input.submitSelector });
      }

      const snapshot = await page.snapshot();
      return { success: true, data: snapshot };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
