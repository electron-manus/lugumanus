import { MessageRole, MessageType } from '@prisma/client';
import { z } from 'zod';
import { t } from '../trpc.js';

const conversationRouter = t.router({
  // 创建新会话
  createConversation: t.procedure
    .input(
      z.object({
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const conversation = await ctx.prisma.conversation.create({
        data: {
          title: input.title || '新对话',
        },
      });
      return conversation;
    }),

  // 获取分页会话
  getConversations: t.procedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(10),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      const [conversations, totalCount] = await Promise.all([
        ctx.prisma.conversation.findMany({
          skip,
          take: pageSize,
          orderBy: {
            updatedAt: 'desc',
          },
        }),
        ctx.prisma.conversation.count(),
      ]);

      return {
        data: conversations,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
        totalCount,
      };
    }),

  // 更新会话标题
  updateConversationTitle: t.procedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const conversation = await ctx.prisma.conversation.update({
        where: {
          id: input.id,
        },
        data: {
          title: input.title,
        },
      });
      return conversation;
    }),

  // 删除会话
  deleteConversation: t.procedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.conversation.delete({
        where: {
          id: input.id,
        },
      });
      return { success: true };
    }),
});

export default conversationRouter;
