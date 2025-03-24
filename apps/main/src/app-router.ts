import conversationRouter from './routers/conversation.js';
import messageRouter from './routers/message.js';
import systemRouter from './routers/system.js';
import taskRouter from './routers/task.js';
import { t } from './trpc.js';

export const appRouter = t.router({
  system: systemRouter,
  conversation: conversationRouter,
  message: messageRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
