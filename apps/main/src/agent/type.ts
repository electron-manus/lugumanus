import type { Message, MessageStatus, Task } from '@prisma/client';
import type { ReplaySubject } from 'rxjs';
import type { Studio } from './studio';

export type MessageStream = Message & {
  task: Task | null;
};

export type AgentTaskRef = {
  abortSignal: AbortSignal;
  studio: Studio;
  observer: ReplaySubject<MessageStream>;
  createMessage: (roleName: string) => Promise<MessageStream>;
  completeMessage: (message: MessageStream, status?: MessageStatus) => Promise<void>;
};
