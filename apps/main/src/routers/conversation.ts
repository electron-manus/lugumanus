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

  getAllConversations: t.procedure.query(async ({ ctx }) => {
    const conversations = await ctx.prisma.conversation.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations;
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
