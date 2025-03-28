import { z } from 'zod';
import { t } from '../trpc.js';

const taskRouter = t.router({
  // 创建任务
  createTask: t.procedure
    .input(
      z.object({
        description: z.string(),
        type: z.string(),
        payload: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const task = await ctx.prisma.task.create({
        data: {
          description: input.description,
          type: input.type,
          payload: input.payload,
        },
      });
      return task;
    }),

  updateTask: t.procedure
    .input(
      z.object({
        id: z.string(),
        payload: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const task = await ctx.prisma.task.update({
        where: { id: input.id },
        data: { payload: input.payload },
      });
      return task;
    }),
});

export default taskRouter;
