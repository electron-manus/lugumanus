import { TaskType } from '@prisma/client';
import { z } from 'zod';
import { t } from '../trpc.js';

const taskRouter = t.router({
  // 创建任务
  createTask: t.procedure
    .input(
      z.object({
        title: z.string(),
        type: z.nativeEnum(TaskType),
        attachment: z.string(),
        previewHtmlUrl: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const task = await ctx.prisma.task.create({
        data: {
          title: input.title,
          type: input.type,
          attachment: input.attachment,
          previewHtmlUrl: input.previewHtmlUrl,
        },
      });
      return task;
    }),
});

export default taskRouter;
