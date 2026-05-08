export type { AgentTool, ToolResult } from './types';
export { NavigationTool } from './NavigationTool';
export { ClickTool } from './ClickTool';
export { FillFormTool } from './FillFormTool';
export { ReadContentTool } from './ReadContentTool';
export { ScreenshotTool } from './ScreenshotTool';
export { WaitForSelectorTool } from './WaitForSelectorTool';
export { SelectOptionTool } from './SelectOptionTool';
export { HoverTool } from './HoverTool';
export { ScrollTool } from './ScrollTool';
export { KeyPressTool } from './KeyPressTool';
export { UploadFileTool } from './UploadFileTool';
export { DownloadFileTool } from './DownloadFileTool';

import { NavigationTool } from './NavigationTool';
import { ClickTool } from './ClickTool';
import { FillFormTool } from './FillFormTool';
import { ReadContentTool } from './ReadContentTool';
import { ScreenshotTool } from './ScreenshotTool';
import { WaitForSelectorTool } from './WaitForSelectorTool';
import { SelectOptionTool } from './SelectOptionTool';
import { HoverTool } from './HoverTool';
import { ScrollTool } from './ScrollTool';
import { KeyPressTool } from './KeyPressTool';
import { UploadFileTool } from './UploadFileTool';
import { DownloadFileTool } from './DownloadFileTool';
import { AgentTool } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const builtinTools: AgentTool<any, any>[] = [
  NavigationTool,
  ClickTool,
  FillFormTool,
  ReadContentTool,
  ScreenshotTool,
  WaitForSelectorTool,
  SelectOptionTool,
  HoverTool,
  ScrollTool,
  KeyPressTool,
  UploadFileTool,
  DownloadFileTool,
];
