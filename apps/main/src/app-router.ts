import systemRouter from './routers/system.js';
import { t } from './trpc.js';

export const appRouter = t.router({
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
