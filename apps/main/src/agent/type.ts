import type { Message, MessageStatus, Task } from '@prisma/client';
import type { BrowserUse } from 'electron-browser-use';
import type { ReplaySubject } from 'rxjs';

export type MessageStream = Message & {
  task: Task | null;
};

export type AgentTaskRef = {
  abortSignal: AbortSignal;
  browserUse: BrowserUse;
  observer: ReplaySubject<MessageStream>;
  createMessage: (roleName: string) => Promise<MessageStream>;
  completeMessage: (message: MessageStream, status?: MessageStatus) => Promise<void>;
};
