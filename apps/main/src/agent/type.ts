import type { Message, MessageStatus } from '@prisma/client';
import type { BrowserUse } from 'electron-browser-use';
import type { ReplaySubject } from 'rxjs';

export type AgentTaskRef = {
  abortSignal: AbortSignal;
  browserUse: BrowserUse;
  observer: ReplaySubject<Message>;
  createMessage: () => Promise<Message>;
  completeMessage: (message: Message, status?: MessageStatus) => Promise<void>;
};
