import { z } from 'zod';
import { AgentTool, ToolResult } from './types';
import { PageController } from '../browser/PageController';

const DownloadFileInputSchema = z.object({
  /**
   * CSS selector for the element to click in order to trigger the download.
   * The click is what starts the browser download event.
   */
  clickSelector: z.string().min(1, 'clickSelector is required'),
  /**
   * Absolute path on the Agent-hub server filesystem where the downloaded file
   * should be saved.  Defaults to a temp path if omitted.
   */
  savePath: z.string().optional(),
  /** Maximum time in milliseconds to wait for the download to complete. Default: 30 000 */
  timeoutMs: z.number().int().positive().optional(),
});

type DownloadFileInput = z.infer<typeof DownloadFileInputSchema>;

interface DownloadFileResult {
  savedPath: string;
  suggestedFilename: string;
}

export const DownloadFileTool: AgentTool<DownloadFileInput, DownloadFileResult> = {
  name: 'downloadFile',
  description:
    'Click an element to trigger a browser file download, then save the downloaded file to ' +
    'a path on the Agent-hub server filesystem.  Returns the saved path and the filename ' +
    'suggested by the server.',
  inputSchema: DownloadFileInputSchema,

  async execute(
    input: DownloadFileInput,
    page: PageController,
  ): Promise<ToolResult<DownloadFileResult>> {
    try {
      const result = await page.downloadFile(
        input.clickSelector,
        input.savePath,
        input.timeoutMs,
      );
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
