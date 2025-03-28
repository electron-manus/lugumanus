import type { Message, MessageStatus, Task } from '@prisma/client';
import type { ReplaySubject } from 'rxjs';
import type { Studio } from './studio';

export type MessageStream = Message & {
  task: Task | null;
};

export type AgentTaskRef = {
  conversationId: string;
  abortSignal: AbortSignal;
  studio: Studio;
  observer: ReplaySubject<MessageStream>;
  createTaskMessage: (
    task: Pick<Task, 'type' | 'description' | 'payload'>,
  ) => Promise<MessageStream>;
  completeTaskMessage: (task: Task) => Promise<void>;
  createMessage: (roleName: string, taskId?: string) => Promise<MessageStream>;
  completeMessage: (message: MessageStream, status?: MessageStatus) => Promise<void>;
};
