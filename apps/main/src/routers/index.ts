import { t } from '../trpc.js';
import conversationRouter from './conversation.js';
import messageRouter from './message.js';
import systemRouter from './system.js';
import taskRouter from './task.js';

export const appRouter = t.router({
  system: systemRouter,
  conversation: conversationRouter,
  task: taskRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;
