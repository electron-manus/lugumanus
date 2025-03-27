import type { WebContentsView } from 'electron';
import type { OpenAI } from 'openai';
import type { CompletionUsage } from 'openai/resources';
import type { ElectronInputSimulator } from '../electron-input-simulator';

export type ParsedResponseSuccess = {
  thought: string;
  action: string;
  summary?: string;
  error?: string;
  parsedAction: {
    name: string;
    args: Record<string, number | string>;
  };
};

export type ParsedResponse =
  | ParsedResponseSuccess
  | {
      error: string;
    };

export type NextAction = {
  action: ParsedResponse;
  usage: CompletionUsage;
  prompt: string;
  isScreenshot: boolean;
};

export type TaskHistoryEntry = {
  summary?: string;
  error?: string;
} & NextAction;

export type BrowserUseResult = {
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
  history: TaskHistoryEntry[];
};

export type BrowserUseOptions = {
  targetWebContents?: WebContentsView;
  browserSimulator?: ElectronInputSimulator;
  // 模型选择
  models: {
    // 默认模型
    text: {
      sdk: OpenAI;
      model: string;
    };
    // 长文本大模型
    longText: {
      sdk: OpenAI;
      model: string;
    };
    // 图像识别大模型
    screenshot: {
      sdk: OpenAI;
      model: string;
    };
  };
};

export type RunOptions = {
  instruction: string;
  webUrl: string;
  webTitle: string;
  needSummary?: boolean;
  useScreenshot?: boolean;
  actionCallback?: (action: string) => void;
  abortSignal: AbortSignal;
};
