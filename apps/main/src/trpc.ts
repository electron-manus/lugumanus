import { PrismaClient } from '@prisma/client';
import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

export const prisma = new PrismaClient();

// 创建上下文
export const createContext = async () => {
  return {
    prisma,
  };
};

// 初始化 tRPC
export const t = initTRPC.context<typeof createContext>().create({
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// 导出实用工具
export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;
