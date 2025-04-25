import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { app, shell } from 'electron';
import { z } from 'zod';
import { t } from '../trpc.js';

const systemRouter = t.router({
  updateModelConfig: t.procedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        baseURL: z.string(),
        longTextModel: z.string(),
        textModel: z.string(),
        codeModel: z.string(),
        imageModel: z.string(),
        voiceModel: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // 定义模型类型映射
      const modelConfigs = [
        { type: 'LONG_TEXT', name: input.longTextModel },
        { type: 'TEXT', name: input.textModel },
        { type: 'CODE', name: input.codeModel },
        { type: 'IMAGE_TO_TEXT', name: input.imageModel },
        { type: 'VOICE_TO_TEXT', name: input.voiceModel },
      ] as const;

      // 为所有模型类型批量更新配置
      await Promise.all(
        modelConfigs.map((config) =>
          ctx.prisma.modelConfig.upsert({
            where: {
              type: config.type,
            },
            create: {
              type: config.type,
              apiKey: input.apiKey,
              name: config.name,
              apiEndpoint: input.baseURL,
            },
            update: {
              apiKey: input.apiKey,
              name: config.name,
              apiEndpoint: input.baseURL,
            },
          }),
        ),
      );
    }),

  // 获取配置
  getModelConfig: t.procedure.query(async ({ ctx }) => {
    const modelConfigs = await ctx.prisma.modelConfig.findMany();
    return modelConfigs;
  }),

  openFolder: t.procedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const folderPath = path.join(app.getPath('userData'), input);

    await mkdir(folderPath, { recursive: true });
    await shell.openPath(folderPath);
  }),
});

export default systemRouter;
