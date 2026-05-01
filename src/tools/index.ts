export type { AgentTool, ToolResult } from './types';
export { NavigationTool } from './NavigationTool';
export { ClickTool } from './ClickTool';
export { FillFormTool } from './FillFormTool';
export { ReadContentTool } from './ReadContentTool';
export { ScreenshotTool } from './ScreenshotTool';
export { WaitForSelectorTool } from './WaitForSelectorTool';
export { SelectOptionTool } from './SelectOptionTool';

import { NavigationTool } from './NavigationTool';
import { ClickTool } from './ClickTool';
import { FillFormTool } from './FillFormTool';
import { ReadContentTool } from './ReadContentTool';
import { ScreenshotTool } from './ScreenshotTool';
import { WaitForSelectorTool } from './WaitForSelectorTool';
import { SelectOptionTool } from './SelectOptionTool';
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
];
