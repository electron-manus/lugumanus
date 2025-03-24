import conversationRouter from './routers/conversation.js';
import messageRouter from './routers/message.js';
import systemRouter from './routers/system.js';
import taskRouter from './routers/task.js';
import { prisma, t } from './trpc.js';

export const appRouter = t.router({
  system: systemRouter,
  conversation: conversationRouter,
  message: messageRouter,
  task: taskRouter,
});

const createCaller = t.createCallerFactory(appRouter);

export const caller = createCaller({ prisma });

export type AppRouter = typeof appRouter;
