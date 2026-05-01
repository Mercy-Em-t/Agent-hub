import { z } from 'zod';
import { AgentTool, ToolResult } from './types';

const ScreenshotInput = z.object({});
type ScreenshotInput = z.infer<typeof ScreenshotInput>;

interface ScreenshotOutput {
  /** Base64-encoded PNG image */
  imageBase64: string;
  url: string;
}

export const ScreenshotTool: AgentTool<ScreenshotInput, ScreenshotOutput> = {
  name: 'screenshot',
  description:
    'Capture a full-page screenshot of the current page. ' +
    'Returns a base64-encoded PNG that the agent can inspect visually.',

  inputSchema: ScreenshotInput,

  async execute(_input, page): Promise<ToolResult<ScreenshotOutput>> {
    try {
      const buffer = await page.screenshot();
      return {
        success: true,
        data: {
          imageBase64: buffer.toString('base64'),
          url: page.currentUrl,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
