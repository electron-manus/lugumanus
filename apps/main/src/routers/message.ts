import { MessageRole, MessageType } from '@prisma/client';
import { z } from 'zod';
import { t } from '../trpc.js';

const messageRouter = t.router({
  // 添加消息到会话
  addMessage: t.procedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string(),
        role: z.nativeEnum(MessageRole),
        type: z.nativeEnum(MessageType),
        taskId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          content: input.content,
          role: input.role,
          type: input.type,
          taskId: input.taskId,
        },
      });

      // 更新会话的updatedAt时间
      await ctx.prisma.conversation.update({
        where: {
          id: input.conversationId,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return message;
    }),

  // 删除消息
  deleteMessage: t.procedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.message.delete({
        where: {
          id: input.id,
        },
      });
      return { success: true };
    }),

  // 分页获取会话消息
  getMessagesByConversation: t.procedure
    .input(
      z.object({
        conversationId: z.string(),
        page: z.number().min(1).default(1), // 页码，从1开始
        pageSize: z.number().min(1).max(100).default(20), // 每页消息数量
      }),
    )
    .query(async ({ input, ctx }) => {
      const { conversationId, page, pageSize } = input;

      // 计算要跳过的消息数量
      const skip = (page - 1) * pageSize;

      // 并行执行总数查询和消息查询
      const [total, messages] = await Promise.all([
        ctx.prisma.message.count({
          where: {
            conversationId,
          },
        }),
        ctx.prisma.message.findMany({
          include: {
            task: true,
          },
          where: {
            conversationId,
          },
          skip,
          take: pageSize,
          orderBy: {
            createdAt: 'desc', // 按创建时间降序排列，最新的消息在前
          },
        }),
      ]);

      // 计算总页数
      const totalPages = Math.ceil(total / pageSize);

      return {
        data: messages,
        totalPages,
        currentPage: page,
        totalCount: total,
      };
    }),
});

export default messageRouter;
