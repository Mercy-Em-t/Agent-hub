import { z } from 'zod';
import { AgentTool, ToolResult } from './types';
import { PageController } from '../browser/PageController';

const UploadFileInputSchema = z.object({
  /** CSS selector for the `<input type="file">` element */
  selector: z.string().min(1, 'selector is required'),
  /**
   * Absolute path(s) on the Agent-hub server filesystem to upload.
   * Pass a single path string or an array for multi-file inputs.
   */
  filePaths: z.union([z.string().min(1), z.array(z.string().min(1))]),
});

type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

interface UploadFileResult {
  selector: string;
  filesUploaded: number;
}

export const UploadFileTool: AgentTool<UploadFileInput, UploadFileResult> = {
  name: 'uploadFile',
  description:
    'Set one or more files on an <input type="file"> element identified by a CSS selector. ' +
    'filePaths must be absolute paths accessible on the Agent-hub server.',
  inputSchema: UploadFileInputSchema,

  async execute(
    input: UploadFileInput,
    page: PageController,
  ): Promise<ToolResult<UploadFileResult>> {
    try {
      const paths = Array.isArray(input.filePaths) ? input.filePaths : [input.filePaths];
      await page.uploadFile(input.selector, paths);
      return {
        success: true,
        data: { selector: input.selector, filesUploaded: paths.length },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};
