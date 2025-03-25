import type { ModelType } from '@prisma/client';
import { OpenAI } from 'openai';
import { prisma } from '../trpc.js';
export const loadSdkAndModel = async () => {
  const modelConfigs = await prisma.modelConfig.findMany({});
  return modelConfigs.reduce(
    (acc, modelConfig) => {
      acc[modelConfig.type] = {
        sdk: new OpenAI({
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.apiEndpoint,
        }),
        model: modelConfig.name,
      };
      return acc;
    },
    {} as Record<ModelType, { sdk: OpenAI; model: string }>,
  );
};
